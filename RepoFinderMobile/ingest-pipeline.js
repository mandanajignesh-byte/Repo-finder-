/**
 * Complete Repoverse Ingestion Pipeline
 * 
 * This script performs all ingestion steps:
 * 1. Fetch repos from GitHub
 * 2. Store in repos_master
 * 3. Enrich (clusters, tech stack, complexity)
 * 4. Compute activity + freshness
 * 5. Compute health score
 * 6. Assign badges
 * 7. Detect underrated gems
 * 
 * Usage:
 *   node ingest-pipeline.js --step all
 *   node ingest-pipeline.js --step 1
 *   node ingest-pipeline.js --step 2-7
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fix SSL certificate issues (for corporate proxies/firewalls)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Bypass SSL verification (only for development/behind proxy)
});

// Excluded orgs
const EXCLUDED_ORGS = [
  'facebook', 'google', 'microsoft', 'apple', 'amazon', 'netflix',
  'uber', 'airbnb', 'twitter', 'meta', 'alibaba', 'tencent',
  'adobe', 'oracle', 'salesforce', 'vmware', 'redhat', 'ibm'
];

// Cluster definitions matching onboarding
const CLUSTERS = {
  'ai_ml': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'neural', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'openai'],
  'web_dev': ['web', 'frontend', 'backend', 'react', 'vue', 'angular', 'next.js', 'html', 'css', 'javascript', 'typescript'],
  'mobile': ['mobile', 'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin', 'dart', 'xamarin'],
  'devops': ['devops', 'docker', 'kubernetes', 'ci/cd', 'deployment', 'infrastructure', 'terraform', 'ansible'],
  'cybersecurity': ['security', 'cybersecurity', 'encryption', 'authentication', 'vulnerability', 'penetration', 'hacking'],
  'data_science': ['data science', 'data analysis', 'pandas', 'numpy', 'jupyter', 'analytics', 'data visualization'],
  'automation': ['automation', 'bot', 'script', 'workflow', 'scheduler', 'cron', 'task automation'],
  'blockchain': ['blockchain', 'crypto', 'ethereum', 'web3', 'solidity', 'smart contract', 'bitcoin', 'defi'],
  'game_dev': ['game', 'gaming', 'unity', 'unreal', 'game engine', 'game development'],
  'open_source_tools': ['tool', 'utility', 'library', 'framework', 'sdk', 'cli', 'command line'],
  'database': ['database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'storage']
};

// GitHub API helper
async function fetchGitHubAPI(endpoint, retries = 3) {
  const url = `https://api.github.com${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Ingestion'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { 
        headers,
        agent: url.startsWith('https') ? httpsAgent : undefined
      });
      
      if (response.status === 404) return null;
      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
          console.log(`  ⏳ Rate limit hit. Waiting ${Math.ceil(waitTime/1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// ============================================
// STEP 1: Fetch Repositories
// ============================================
async function step1_FetchRepos(searchQuery, limit = 50) {
  console.log('\n📦 STEP 1: Fetching Repositories from GitHub...\n');
  
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=updated&order=desc&per_page=${limit}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Ingestion'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  const response = await fetch(url, { 
    headers,
    agent: httpsAgent
  });
  const data = await response.json();
  
  if (!data.items) {
    console.log('  ❌ No results found');
    return [];
  }
  
  const repos = [];
  for (const repo of data.items) {
    const owner = repo.owner.login.toLowerCase();
    
    // Skip major orgs
    if (EXCLUDED_ORGS.some(org => owner.includes(org))) {
      continue;
    }
    
    // Fetch latest commit
    const commits = await fetchGitHubAPI(`/repos/${repo.full_name}/commits?per_page=1`);
    const lastCommitAt = commits && commits[0] ? commits[0].commit.committer.date : null;
    
    repos.push({
      repo_id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      owner_login: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
      html_url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      open_issues: repo.open_issues_count,
      topics: repo.topics || [],
      size_kb: repo.size,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      last_commit_at: lastCommitAt,
      archived: repo.archived,
      license: repo.license?.name
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`  ✅ Fetched ${repos.length} repositories`);
  return repos;
}

// ============================================
// STEP 2: Store in repos_master
// ============================================
async function step2_StoreRepos(repos) {
  console.log('\n💾 STEP 2: Storing in repos_master...\n');
  
  let success = 0;
  let skipped = 0;
  
  for (const repo of repos) {
    const { error } = await supabase
      .from('repos_master')
      .upsert(repo, { onConflict: 'repo_id' });
    
    if (error) {
      if (error.code === '23505') { // Duplicate
        skipped++;
      } else {
        console.error(`  ❌ Error storing ${repo.full_name}:`, error.message);
      }
    } else {
      success++;
      console.log(`  ✅ Stored: ${repo.full_name}`);
    }
  }
  
  console.log(`\n  📊 Results: ${success} stored, ${skipped} skipped`);
  return repos.map(r => r.repo_id);
}

// ============================================
// STEP 3: Enrich Repos (Clusters, Tech Stack, Complexity)
// ============================================
async function step3_EnrichRepos(repoIds) {
  console.log('\n🏷️  STEP 3: Enriching Repos (Clusters, Tech Stack, Complexity)...\n');
  
  for (const repoId of repoIds) {
    try {
      // Get repo data
      const { data: repo } = await supabase
        .from('repos_master')
        .select('*')
        .eq('repo_id', repoId)
        .single();
      
      if (!repo) continue;
      
      const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
      
      // 3a. Classify Clusters
      const clusters = [];
      for (const [slug, keywords] of Object.entries(CLUSTERS)) {
        const matches = keywords.filter(kw => text.includes(kw)).length;
        if (matches > 0) {
          const weight = Math.min(matches / keywords.length, 1.0);
          clusters.push({
            repo_id: repoId,
            cluster_slug: slug,
            weight: Math.max(weight, 0.5),
            confidence_score: 0.7 + (matches * 0.1)
          });
        }
      }
      
      // Take top 3 clusters
      const topClusters = clusters.sort((a, b) => b.weight - a.weight).slice(0, 3);
      for (const cluster of topClusters) {
        await supabase
          .from('repo_cluster_new')
          .upsert(cluster, { onConflict: 'repo_id,cluster_slug' });
      }
      
      // 3b. Detect Tech Stack
      const techStack = [];
      const language = repo.language?.toLowerCase();
      
      const languageMap = {
        'javascript': 'javascript', 'typescript': 'javascript',
        'python': 'python', 'java': 'java', 'go': 'go', 'rust': 'rust',
        'c++': 'cpp', 'dart': 'flutter', 'swift': 'swift_kotlin', 'kotlin': 'swift_kotlin'
      };
      
      if (language && languageMap[language]) {
        techStack.push({ repo_id: repoId, tech_slug: languageMap[language], weight: 1.0 });
      }
      
      const frameworks = {
        'react': ['react', 'next.js'], 'nodejs': ['node', 'express'],
        'flutter': ['flutter'], 'django': ['django', 'fastapi'],
        'spring': ['spring'], 'docker': ['docker'], 'kubernetes': ['kubernetes'],
        'supabase': ['supabase', 'firebase']
      };
      
      for (const [slug, keywords] of Object.entries(frameworks)) {
        if (keywords.some(kw => text.includes(kw))) {
          techStack.push({ repo_id: repoId, tech_slug: slug, weight: 0.9 });
        }
      }
      
      for (const tech of techStack) {
        await supabase
          .from('repo_tech_stack')
          .upsert(tech, { onConflict: 'repo_id,tech_slug' });
      }
      
      // 3c. Classify Complexity
      const size = repo.size_kb || 0;
      let locBucket = 'small';
      if (size > 100000) locBucket = 'xlarge';
      else if (size > 50000) locBucket = 'large';
      else if (size > 10000) locBucket = 'medium';
      
      let complexity = 'full_app';
      let confidence = 0.7;
      
      if (text.includes('tutorial') || text.includes('example') || text.includes('learn')) {
        complexity = 'tutorial';
        confidence = 0.8;
      } else if (text.includes('boilerplate') || text.includes('starter') || text.includes('template')) {
        complexity = 'boilerplate';
        confidence = 0.8;
      } else if (text.includes('framework') || text.includes('library') || repo.stars > 10000) {
        complexity = 'framework';
        confidence = 0.9;
      } else if (text.includes('infrastructure') || text.includes('devops') || text.includes('kubernetes')) {
        complexity = 'infrastructure';
        confidence = 0.85;
      } else if (repo.stars > 5000 && size > 50000) {
        complexity = 'production_saas';
        confidence = 0.75;
      }
      
      await supabase
        .from('repo_complexity')
        .upsert({
          repo_id: repoId,
          complexity_slug: complexity,
          confidence: confidence,
          loc_bucket: locBucket
        }, { onConflict: 'repo_id' });
      
      console.log(`  ✅ Enriched: ${repo.full_name} (${topClusters.length} clusters, ${techStack.length} tech, ${complexity})`);
      
    } catch (error) {
      console.error(`  ❌ Error enriching repo ${repoId}:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n  ✅ Enrichment complete for ${repoIds.length} repos`);
}

// ============================================
// STEP 4: Compute Activity & Freshness
// ============================================
async function step4_ComputeActivity(repoIds) {
  console.log('\n⚡ STEP 4: Computing Activity & Freshness...\n');
  
  for (const repoId of repoIds) {
    try {
      const { data: repo } = await supabase
        .from('repos_master')
        .select('full_name, last_commit_at')
        .eq('repo_id', repoId)
        .single();
      
      if (!repo || !repo.last_commit_at) continue;
      
      // Fetch commit counts
      const [owner, repoName] = repo.full_name.split('/');
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      
      const commits30 = await fetchGitHubAPI(`/repos/${repo.full_name}/commits?since=${since30}&per_page=100`);
      const commits90 = await fetchGitHubAPI(`/repos/${repo.full_name}/commits?since=${since90}&per_page=100`);
      
      const count30 = commits30 ? (Array.isArray(commits30) ? commits30.length : 0) : 0;
      const count90 = commits90 ? (Array.isArray(commits90) ? commits90.length : 0) : 0;
      
      // Calculate scores
      const commitVelocity = count90 / 90.0;
      const daysInactive = (Date.now() - new Date(repo.last_commit_at).getTime()) / (1000 * 60 * 60 * 24);
      
      let freshnessScore = 0.05;
      if (daysInactive <= 30) freshnessScore = 1.0;
      else if (daysInactive <= 90) freshnessScore = 0.85;
      else if (daysInactive <= 180) freshnessScore = 0.65;
      else if (daysInactive <= 365) freshnessScore = 0.45;
      else if (daysInactive <= 730) freshnessScore = 0.25;
      
      const activityScore = (freshnessScore * 0.6) + (Math.min(commitVelocity / 10, 1.0) * 0.4);
      
      await supabase
        .from('repo_activity')
        .upsert({
          repo_id: repoId,
          last_commit_at: repo.last_commit_at,
          commits_30_days: count30,
          commits_90_days: count90,
          commit_velocity: commitVelocity,
          freshness_score: freshnessScore,
          activity_score: activityScore
        }, { onConflict: 'repo_id' });
      
      console.log(`  ✅ Activity computed: ${repo.full_name} (freshness: ${freshnessScore.toFixed(2)})`);
      
    } catch (error) {
      console.error(`  ❌ Error computing activity for ${repoId}:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n  ✅ Activity computation complete`);
}

// ============================================
// STEP 5: Compute Health Score
// ============================================
async function step5_ComputeHealth(repoIds) {
  console.log('\n❤️  STEP 5: Computing Health Scores...\n');
  
  for (const repoId of repoIds) {
    try {
      const { data: repo } = await supabase
        .from('repos_master')
        .select('*')
        .eq('repo_id', repoId)
        .single();
      
      const { data: activity } = await supabase
        .from('repo_activity')
        .select('*')
        .eq('repo_id', repoId)
        .single();
      
      if (!repo || !activity) continue;
      
      // Calculate subscores
      const activityScore = activity.activity_score || 0;
      const communityScore = Math.min((repo.stars / 100000 + repo.forks / 10000 + repo.watchers / 1000) / 3, 1.0);
      const maintenanceScore = Math.min(activityScore + (1 - Math.min(repo.open_issues / 100, 1.0)) * 0.3, 1.0);
      const codeQuality = 0.7 + (activityScore * 0.3);
      const hasReadme = repo.description ? 0.8 : 0.3;
      const documentationScore = hasReadme;
      const age = (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
      const stabilityScore = Math.min(age / 5, 1.0) * 0.7 + activityScore * 0.3;
      
      const healthScore = (
        activityScore * 0.25 +
        maintenanceScore * 0.20 +
        communityScore * 0.20 +
        codeQuality * 0.15 +
        documentationScore * 0.10 +
        stabilityScore * 0.10
      );
      
      await supabase
        .from('repo_health')
        .upsert({
          repo_id: repoId,
          activity_score: activityScore,
          maintenance_score: maintenanceScore,
          community_score: communityScore,
          code_quality_score: codeQuality,
          documentation_score: documentationScore,
          stability_score: stabilityScore,
          health_score: healthScore
        }, { onConflict: 'repo_id' });
      
      console.log(`  ✅ Health computed: ${repo.full_name} (score: ${healthScore.toFixed(2)})`);
      
    } catch (error) {
      console.error(`  ❌ Error computing health for ${repoId}:`, error.message);
    }
  }
  
  console.log(`\n  ✅ Health computation complete`);
}

// ============================================
// STEP 6: Assign Badges
// ============================================
async function step6_AssignBadges(repoIds) {
  console.log('\n🏅 STEP 6: Assigning Badges...\n');
  
  for (const repoId of repoIds) {
    try {
      const { data: health } = await supabase
        .from('repo_health')
        .select('*')
        .eq('repo_id', repoId)
        .single();
      
      const { data: activity } = await supabase
        .from('repo_activity')
        .select('*')
        .eq('repo_id', repoId)
        .single();
      
      const { data: complexity } = await supabase
        .from('repo_complexity')
        .select('*')
        .eq('repo_id', repoId)
        .single();
      
      if (!health || !activity) continue;
      
      const badges = [];
      
      // Well maintained
      if (health.health_score > 0.85) {
        badges.push('well_maintained');
      }
      
      // Actively updated
      if (activity.freshness_score > 0.85) {
        badges.push('actively_updated');
      }
      
      // Beginner friendly
      if (complexity?.complexity_slug === 'tutorial' && health.documentation_score > 0.7) {
        badges.push('beginner_friendly');
      }
      
      // Production ready
      if (health.health_score > 0.8 && activity.freshness_score > 0.7) {
        badges.push('production_ready');
      }
      
      // Insert badges
      for (const badge of badges) {
        await supabase
          .from('repo_badges')
          .upsert({ repo_id: repoId, badge_slug: badge }, { onConflict: 'repo_id,badge_slug' });
      }
      
      if (badges.length > 0) {
        console.log(`  ✅ Badges assigned: ${repoId} (${badges.join(', ')})`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error assigning badges for ${repoId}:`, error.message);
    }
  }
  
  console.log(`\n  ✅ Badge assignment complete`);
}

// ============================================
// STEP 7: Detect Underrated Gems
// ============================================
async function step7_DetectGems(repoIds) {
  console.log('\n💎 STEP 7: Detecting Underrated Gems...\n');
  
  for (const repoId of repoIds) {
    try {
      const { data: repo } = await supabase
        .from('repos_master')
        .select('stars')
        .eq('repo_id', repoId)
        .single();
      
      const { data: health } = await supabase
        .from('repo_health')
        .select('*')
        .eq('repo_id', repoId)
        .single();
      
      const { data: activity } = await supabase
        .from('repo_activity')
        .select('*')
        .eq('repo_id', repoId)
        .single();
      
      if (!repo || !health || !activity) continue;
      
      // Gem conditions
      const starsThreshold = 5000;
      const healthThreshold = 0.80;
      const freshnessThreshold = 0.70;
      const docsThreshold = 0.70;
      
      if (repo.stars < starsThreshold &&
          health.health_score > healthThreshold &&
          activity.freshness_score > freshnessThreshold &&
          health.documentation_score > docsThreshold) {
        
        // Calculate gem score
        const contributorScore = 0.8; // Simplified (would fetch from API)
        const gemScore = (
          health.health_score * 0.4 +
          activity.freshness_score * 0.3 +
          health.documentation_score * 0.2 +
          contributorScore * 0.1
        );
        
        if (gemScore > 0.75) {
          const reason = {
            high_health: true,
            low_stars: true,
            active: true,
            good_docs: true
          };
          
          await supabase
            .from('repo_gems')
            .upsert({
              repo_id: repoId,
              gem_score: gemScore,
              reason: reason
            }, { onConflict: 'repo_id' });
          
          console.log(`  💎 Gem detected: ${repoId} (score: ${gemScore.toFixed(2)})`);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Error detecting gem for ${repoId}:`, error.message);
    }
  }
  
  console.log(`\n  ✅ Gem detection complete`);
}

// ============================================
// Main Execution
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const stepArg = args.find(arg => arg.startsWith('--step'));
  const step = stepArg ? stepArg.split('=')[1] : 'all';
  
  // Default search query for underrated repos
  const searchQuery = args.find(arg => arg.startsWith('--query')) 
    ? args.find(arg => arg.startsWith('--query')).split('=')[1]
    : 'stars:50..5000 pushed:>2023-06-01';
  
  const limit = args.find(arg => arg.startsWith('--limit'))
    ? parseInt(args.find(arg => arg.startsWith('--limit')).split('=')[1])
    : 20;
  
  console.log('🚀 Repoverse Ingestion Pipeline\n');
  console.log(`Step: ${step}`);
  console.log(`Query: ${searchQuery}`);
  console.log(`Limit: ${limit} repos\n`);
  
  let repoIds = [];
  
  // Step 1: Fetch repos
  if (step === 'all' || step === '1') {
    const repos = await step1_FetchRepos(searchQuery, limit);
    repoIds = repos.map(r => r.repo_id);
    
    // Step 2: Store repos
    if (step === 'all' || step === '2') {
      repoIds = await step2_StoreRepos(repos);
    }
  } else if (step.startsWith('2')) {
    // If starting from step 2, get existing repos
    const { data } = await supabase
      .from('repos_master')
      .select('repo_id')
      .order('ingested_at', { ascending: false })
      .limit(limit);
    repoIds = data?.map(r => r.repo_id) || [];
  }
  
  // Step 3: Enrich
  if (step === 'all' || step === '3' || step.startsWith('3')) {
    await step3_EnrichRepos(repoIds);
  }
  
  // Step 4: Activity
  if (step === 'all' || step === '4' || step.startsWith('4')) {
    await step4_ComputeActivity(repoIds);
  }
  
  // Step 5: Health
  if (step === 'all' || step === '5' || step.startsWith('5')) {
    await step5_ComputeHealth(repoIds);
  }
  
  // Step 6: Badges
  if (step === 'all' || step === '6' || step.startsWith('6')) {
    await step6_AssignBadges(repoIds);
  }
  
  // Step 7: Gems
  if (step === 'all' || step === '7' || step.startsWith('7')) {
    await step7_DetectGems(repoIds);
  }
  
  console.log('\n✨ Pipeline execution complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  step1_FetchRepos,
  step2_StoreRepos,
  step3_EnrichRepos,
  step4_ComputeActivity,
  step5_ComputeHealth,
  step6_AssignBadges,
  step7_DetectGems
};
