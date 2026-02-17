/**
 * Repoverse Repository Ingestion Script
 * Fetches data from GitHub API and populates all database tables
 * 
 * Usage: node ingest-repos.js [repo1] [repo2] ...
 * Example: node ingest-repos.js facebook/react tensorflow/tensorflow
 * 
 * Or set GITHUB_TOKEN environment variable for higher rate limits
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GitHub API helper
async function fetchGitHubAPI(endpoint) {
  const url = `https://api.github.com${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Ingestion'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch repository data
async function fetchRepoData(owner, repo) {
  console.log(`📦 Fetching ${owner}/${repo}...`);
  
  const repoData = await fetchGitHubAPI(`/repos/${owner}/${repo}`);
  if (!repoData) {
    console.log(`❌ Repo ${owner}/${repo} not found`);
    return null;
  }
  
  // Fetch latest commit
  const commits = await fetchGitHubAPI(`/repos/${owner}/${repo}/commits?per_page=1`);
  const lastCommitAt = commits && commits[0] ? commits[0].commit.committer.date : null;
  
  // Fetch commits for activity calculation
  const commits30 = await fetchGitHubAPI(`/repos/${owner}/${repo}/commits?since=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`);
  const commits90 = await fetchGitHubAPI(`/repos/${owner}/${repo}/commits?since=${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}`);
  
  return {
    repo: repoData,
    lastCommitAt,
    commits30: commits30 ? commits30.length : 0,
    commits90: commits90 ? commits90.length : 0
  };
}

// Calculate freshness score
function calculateFreshnessScore(lastCommitAt) {
  if (!lastCommitAt) return 0.05;
  
  const daysInactive = (Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysInactive <= 30) return 1.0;
  if (daysInactive <= 90) return 0.85;
  if (daysInactive <= 180) return 0.65;
  if (daysInactive <= 365) return 0.45;
  if (daysInactive <= 730) return 0.25;
  return 0.05;
}

// Classify clusters from topics and description
function classifyClusters(repo) {
  const clusters = [];
  const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  
  const clusterKeywords = {
    'ai_ml': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'neural', 'deep learning', 'tensorflow', 'pytorch', 'keras'],
    'web_dev': ['web', 'frontend', 'backend', 'react', 'vue', 'angular', 'next.js', 'html', 'css', 'javascript'],
    'mobile': ['mobile', 'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin', 'dart'],
    'devops': ['devops', 'docker', 'kubernetes', 'ci/cd', 'deployment', 'infrastructure', 'terraform'],
    'data_science': ['data science', 'data analysis', 'pandas', 'numpy', 'jupyter', 'analytics'],
    'automation': ['automation', 'bot', 'script', 'workflow', 'scheduler'],
    'blockchain': ['blockchain', 'crypto', 'ethereum', 'web3', 'solidity', 'smart contract'],
    'game_dev': ['game', 'gaming', 'unity', 'unreal', 'game engine'],
    'open_source_tools': ['tool', 'utility', 'library', 'framework', 'sdk']
  };
  
  for (const [slug, keywords] of Object.entries(clusterKeywords)) {
    const matches = keywords.filter(kw => text.includes(kw)).length;
    if (matches > 0) {
      const weight = Math.min(matches / keywords.length, 1.0);
      clusters.push({
        cluster_slug: slug,
        weight: Math.max(weight, 0.5),
        confidence_score: 0.7 + (matches * 0.1)
      });
    }
  }
  
  // Sort by weight and take top 3
  return clusters.sort((a, b) => b.weight - a.weight).slice(0, 3);
}

// Detect tech stack
function detectTechStack(repo) {
  const techStack = [];
  const language = repo.language?.toLowerCase();
  const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  
  // Language mapping
  const languageMap = {
    'javascript': 'javascript',
    'typescript': 'javascript',
    'python': 'python',
    'java': 'java',
    'go': 'go',
    'rust': 'rust',
    'c++': 'cpp',
    'dart': 'flutter',
    'swift': 'swift_kotlin',
    'kotlin': 'swift_kotlin'
  };
  
  if (language && languageMap[language]) {
    techStack.push({ tech_slug: languageMap[language], weight: 1.0 });
  }
  
  // Framework detection
  const frameworks = {
    'react': ['react', 'next.js', 'nextjs'],
    'nodejs': ['node', 'nodejs', 'express'],
    'flutter': ['flutter'],
    'django': ['django', 'fastapi'],
    'spring': ['spring', 'spring boot'],
    'docker': ['docker'],
    'kubernetes': ['kubernetes', 'k8s'],
    'supabase': ['supabase', 'firebase']
  };
  
  for (const [slug, keywords] of Object.entries(frameworks)) {
    if (keywords.some(kw => text.includes(kw))) {
      techStack.push({ tech_slug: slug, weight: 0.9 });
    }
  }
  
  return techStack;
}

// Classify complexity
function classifyComplexity(repo) {
  const size = repo.size || 0;
  const stars = repo.stargazers_count || 0;
  const text = `${repo.description || ''}`.toLowerCase();
  
  // Size buckets
  let locBucket = 'small';
  if (size > 100000) locBucket = 'xlarge';
  else if (size > 50000) locBucket = 'large';
  else if (size > 10000) locBucket = 'medium';
  
  // Complexity classification
  let complexity = 'full_app';
  let confidence = 0.7;
  
  if (text.includes('tutorial') || text.includes('example') || text.includes('learn')) {
    complexity = 'tutorial';
    confidence = 0.8;
  } else if (text.includes('boilerplate') || text.includes('starter') || text.includes('template')) {
    complexity = 'boilerplate';
    confidence = 0.8;
  } else if (text.includes('framework') || text.includes('library') || stars > 10000) {
    complexity = 'framework';
    confidence = 0.9;
  } else if (text.includes('infrastructure') || text.includes('devops') || text.includes('kubernetes')) {
    complexity = 'infrastructure';
    confidence = 0.85;
  } else if (stars > 5000 && size > 50000) {
    complexity = 'production_saas';
    confidence = 0.75;
  }
  
  return { complexity_slug: complexity, confidence, loc_bucket: locBucket };
}

// Calculate health score
function calculateHealthScore(repo, activityScore) {
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const watchers = repo.watchers_count || 0;
  const openIssues = repo.open_issues_count || 0;
  
  // Community score (normalized)
  const communityScore = Math.min((stars / 100000 + forks / 10000 + watchers / 1000) / 3, 1.0);
  
  // Maintenance score (based on issues and activity)
  const maintenanceScore = Math.min(activityScore + (1 - Math.min(openIssues / 100, 1.0)) * 0.3, 1.0);
  
  // Code quality (simplified - would use actual metrics in production)
  const codeQuality = 0.7 + (activityScore * 0.3);
  
  // Documentation (simplified)
  const hasReadme = repo.has_wiki || repo.description ? 0.8 : 0.3;
  const documentationScore = hasReadme;
  
  // Stability (based on age and activity)
  const age = (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
  const stabilityScore = Math.min(age / 5, 1.0) * 0.7 + activityScore * 0.3;
  
  // Overall health (weighted average)
  const healthScore = (
    activityScore * 0.25 +
    maintenanceScore * 0.20 +
    communityScore * 0.20 +
    codeQuality * 0.15 +
    documentationScore * 0.10 +
    stabilityScore * 0.10
  );
  
  return {
    activity_score: activityScore,
    maintenance_score: maintenanceScore,
    community_score: communityScore,
    code_quality_score: codeQuality,
    documentation_score: documentationScore,
    stability_score: stabilityScore,
    health_score: healthScore
  };
}

// Assign badges
async function assignBadges(repoId, healthScore, freshnessScore, lastCommitAt) {
  const badges = [];
  
  // Well maintained
  if (healthScore > 0.85) {
    badges.push('well_maintained');
  }
  
  // Actively updated
  if (lastCommitAt) {
    const daysInactive = (Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysInactive <= 30) {
      badges.push('actively_updated');
    }
  }
  
  // Production ready
  if (healthScore > 0.8 && freshnessScore > 0.7) {
    badges.push('production_ready');
  }
  
  // Insert badges
  for (const badge of badges) {
    await supabase
      .from('repo_badges')
      .upsert({
        repo_id: repoId,
        badge_slug: badge
      }, { onConflict: 'repo_id,badge_slug' });
  }
}

// Main ingestion function
async function ingestRepo(owner, repo) {
  try {
    const data = await fetchRepoData(owner, repo);
    if (!data) return;
    
    const { repo: repoData, lastCommitAt, commits30, commits90 } = data;
    
    // 1. Insert into repos_master
    console.log(`  📝 Inserting into repos_master...`);
    const { error: repoError } = await supabase
      .from('repos_master')
      .upsert({
        repo_id: repoData.id,
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        owner_login: repoData.owner.login,
        avatar_url: repoData.owner.avatar_url,
        html_url: repoData.html_url,
        language: repoData.language,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        open_issues: repoData.open_issues_count,
        topics: repoData.topics || [],
        size_kb: repoData.size,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        pushed_at: repoData.pushed_at,
        last_commit_at: lastCommitAt,
        archived: repoData.archived,
        license: repoData.license?.name
      }, { onConflict: 'repo_id' });
    
    if (repoError) throw repoError;
    
    // 2. Insert clusters
    console.log(`  🏷️  Classifying clusters...`);
    const clusters = classifyClusters(repoData);
    for (const cluster of clusters) {
      await supabase
        .from('repo_cluster_new')
        .upsert({
          repo_id: repoData.id,
          ...cluster
        }, { onConflict: 'repo_id,cluster_slug' });
    }
    
    // 3. Insert tech stack
    console.log(`  🛠️  Detecting tech stack...`);
    const techStack = detectTechStack(repoData);
    for (const tech of techStack) {
      await supabase
        .from('repo_tech_stack')
        .upsert({
          repo_id: repoData.id,
          ...tech
        }, { onConflict: 'repo_id,tech_slug' });
    }
    
    // 4. Insert complexity
    console.log(`  📊 Classifying complexity...`);
    const complexity = classifyComplexity(repoData);
    await supabase
      .from('repo_complexity')
      .upsert({
        repo_id: repoData.id,
        ...complexity
      }, { onConflict: 'repo_id' });
    
    // 5. Calculate and insert activity
    console.log(`  ⚡ Calculating activity...`);
    const commitVelocity = commits90 / 90.0;
    const freshnessScore = calculateFreshnessScore(lastCommitAt);
    const activityScore = (freshnessScore * 0.6) + (Math.min(commitVelocity / 10, 1.0) * 0.4);
    
    await supabase
      .from('repo_activity')
      .upsert({
        repo_id: repoData.id,
        last_commit_at: lastCommitAt,
        commits_30_days: commits30,
        commits_90_days: commits90,
        commit_velocity: commitVelocity,
        freshness_score: freshnessScore,
        activity_score: activityScore
      }, { onConflict: 'repo_id' });
    
    // 6. Calculate and insert health
    console.log(`  ❤️  Calculating health score...`);
    const health = calculateHealthScore(repoData, activityScore);
    await supabase
      .from('repo_health')
      .upsert({
        repo_id: repoData.id,
        ...health
      }, { onConflict: 'repo_id' });
    
    // 7. Assign badges
    console.log(`  🏅 Assigning badges...`);
    await assignBadges(repoData.id, health.health_score, freshnessScore, lastCommitAt);
    
    console.log(`  ✅ Successfully ingested ${owner}/${repo}\n`);
    
  } catch (error) {
    console.error(`  ❌ Error ingesting ${owner}/${repo}:`, error.message);
  }
}

// Main execution
async function main() {
  const repos = process.argv.slice(2);
  
  if (repos.length === 0) {
    console.log('Usage: node ingest-repos.js owner/repo [owner/repo ...]');
    console.log('Example: node ingest-repos.js facebook/react tensorflow/tensorflow');
    process.exit(1);
  }
  
  console.log(`🚀 Starting ingestion of ${repos.length} repositories...\n`);
  
  for (const repo of repos) {
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      console.log(`❌ Invalid repo format: ${repo}. Use owner/repo format.\n`);
      continue;
    }
    
    await ingestRepo(owner, repoName);
    
    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('✨ Ingestion complete!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ingestRepo, fetchRepoData };
