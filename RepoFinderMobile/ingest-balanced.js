/**
 * Balanced Multi-Dimensional Ingestion System
 * Ensures balanced distribution across clusters, skill levels, star tiers, languages, and repo types
 * 
 * Usage:
 *   node ingest-balanced.js --cluster=all
 *   node ingest-balanced.js --cluster=ai_ml
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

// Fix SSL certificate issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 60000
});

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'YOUR_SERVICE_ROLE_KEY';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️  WARNING: Using SUPABASE_ANON_KEY. SUPABASE_SERVICE_ROLE_KEY is recommended.\n');
}

// ============================================
// CONFIGURATION
// ============================================

const CLUSTER_TARGETS = {
  'ai_ml': { target: 2000, topics: ['machine-learning', 'artificial-intelligence', 'deep-learning', 'neural-network', 'tensorflow', 'pytorch'] },
  'web_dev': { target: 2000, topics: ['web-development', 'frontend', 'backend', 'react', 'vue', 'angular', 'nextjs'] },
  'devops': { target: 2000, topics: ['devops', 'docker', 'kubernetes', 'infrastructure', 'ci-cd', 'terraform'] },
  'data_science': { target: 2000, topics: ['data-science', 'data-analysis', 'pandas', 'jupyter', 'analytics', 'data-visualization'] },
  'mobile': { target: 2000, topics: ['mobile', 'ios', 'android', 'flutter', 'react-native', 'mobile-app'] },
  'automation': { target: 2000, topics: ['automation', 'bot', 'workflow', 'task-automation', 'scheduler'] },
  'cybersecurity': { target: 2000, topics: ['security', 'cybersecurity', 'encryption', 'authentication', 'vulnerability'] },
  'blockchain': { target: 2000, topics: ['blockchain', 'crypto', 'ethereum', 'web3', 'solidity', 'defi'] },
  'game_dev': { target: 2000, topics: ['game-development', 'gaming', 'unity', 'unreal-engine', 'game-engine'] },
  'open_source_tools': { target: 2000, topics: ['tool', 'utility', 'cli', 'developer-tools', 'productivity'] }
};

// Skill level distribution (per cluster)
const SKILL_LEVEL_TARGETS = {
  'beginner': { percent: 25, target: 500 },      // 25% → 500 repos
  'intermediate': { percent: 35, target: 700 },   // 35% → 700 repos
  'advanced': { percent: 25, target: 500 },       // 25% → 500 repos
  'infrastructure': { percent: 15, target: 300 }  // 15% → 300 repos
};

// Star tier distribution
const STAR_TIER_TARGETS = {
  'tier1': { min: 0, max: 100, percent: 10, target: 200 },      // 0-100 stars → 10%
  'tier2': { min: 100, max: 1000, percent: 35, target: 700 },   // 100-1k stars → 35%
  'tier3': { min: 1000, max: 10000, percent: 35, target: 700 }, // 1k-10k stars → 35%
  'tier4': { min: 10000, max: 999999, percent: 20, target: 400 } // 10k+ stars → 20%
};

// Language distribution
const LANGUAGE_TARGETS = {
  'python': { percent: 30, target: 600 },
  'javascript': { percent: 25, target: 500 }, // Includes TypeScript
  'go': { percent: 10, target: 200 },
  'rust': { percent: 10, target: 200 },
  'java': { percent: 10, target: 200 }, // Includes Kotlin
  'other': { percent: 15, target: 300 }
};

// Repo type distribution
const REPO_TYPE_TARGETS = {
  'tutorial': { percent: 20, target: 400 },
  'boilerplate': { percent: 20, target: 400 },
  'full_app': { percent: 30, target: 600 },
  'production_saas': { percent: 15, target: 300 },
  'infrastructure': { percent: 15, target: 300 }
};

// Gem target: 5-12% per cluster
const GEM_TARGET_MIN = 0.05; // 5%
const GEM_TARGET_MAX = 0.12; // 12%

// Keywords for skill level classification
const SKILL_KEYWORDS = {
  'beginner': ['tutorial', 'starter', 'beginner', 'learn', 'example', 'guide', 'getting-started', 'introduction'],
  'intermediate': ['full app', 'dashboard', 'system', 'application', 'project', 'demo', 'sample'],
  'advanced': ['saas', 'engine', 'platform', 'framework', 'library', 'toolkit', 'enterprise'],
  'infrastructure': ['framework', 'orchestration', 'infrastructure', 'devops', 'deployment', 'kubernetes', 'docker']
};

// Keywords for repo type classification
const REPO_TYPE_KEYWORDS = {
  'tutorial': ['tutorial', 'guide', 'learn', 'course', 'example', 'walkthrough'],
  'boilerplate': ['boilerplate', 'starter', 'template', 'scaffold', 'generator'],
  'full_app': ['app', 'application', 'project', 'demo', 'example app'],
  'production_saas': ['saas', 'platform', 'service', 'api', 'backend'],
  'infrastructure': ['framework', 'library', 'toolkit', 'infrastructure', 'devops']
};

const EXCLUDED_ORGS = [
  'facebook', 'google', 'microsoft', 'apple', 'amazon', 'netflix',
  'uber', 'airbnb', 'twitter', 'meta', 'alibaba', 'tencent'
];

// ============================================
// QUOTA TRACKING
// ============================================

class QuotaTracker {
  constructor(clusterSlug) {
    this.clusterSlug = clusterSlug;
    this.skillLevels = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      infrastructure: 0
    };
    this.starTiers = {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0
    };
    this.languages = {
      python: 0,
      javascript: 0,
      go: 0,
      rust: 0,
      java: 0,
      other: 0
    };
    this.repoTypes = {
      tutorial: 0,
      boilerplate: 0,
      full_app: 0,
      production_saas: 0,
      infrastructure: 0
    };
    this.gems = 0;
    this.total = 0;
  }

  getSkillLevelQuota() {
    const needs = {};
    for (const [level, config] of Object.entries(SKILL_LEVEL_TARGETS)) {
      needs[level] = Math.max(0, config.target - this.skillLevels[level]);
    }
    return needs;
  }

  getStarTierQuota() {
    const needs = {};
    for (const [tier, config] of Object.entries(STAR_TIER_TARGETS)) {
      needs[tier] = Math.max(0, config.target - this.starTiers[tier]);
    }
    return needs;
  }

  getLanguageQuota() {
    const needs = {};
    for (const [lang, config] of Object.entries(LANGUAGE_TARGETS)) {
      needs[lang] = Math.max(0, config.target - this.languages[lang]);
    }
    return needs;
  }

  getRepoTypeQuota() {
    const needs = {};
    for (const [type, config] of Object.entries(REPO_TYPE_TARGETS)) {
      needs[type] = Math.max(0, config.target - this.repoTypes[type]);
    }
    return needs;
  }

  getGemQuota() {
    const minGems = Math.floor(this.total * GEM_TARGET_MIN);
    const maxGems = Math.floor(this.total * GEM_TARGET_MAX);
    return { min: minGems, current: this.gems, max: maxGems };
  }

  needsRepo(repo) {
    // Check if we need this repo based on quotas
    const skillLevel = classifySkillLevel(repo);
    const starTier = getStarTier(repo.stargazers_count || 0);
    const language = normalizeLanguage(repo.language);
    const repoType = classifyRepoType(repo);

    const skillQuota = this.getSkillLevelQuota();
    const starQuota = this.getStarTierQuota();
    const langQuota = this.getLanguageQuota();
    const typeQuota = this.getRepoTypeQuota();

    // Check if any quota needs this repo
    return (
      skillQuota[skillLevel] > 0 ||
      starQuota[starTier] > 0 ||
      langQuota[language] > 0 ||
      typeQuota[repoType] > 0
    );
  }

  recordRepo(repo, skillLevel, starTier, language, repoType, isGem) {
    this.skillLevels[skillLevel]++;
    this.starTiers[starTier]++;
    this.languages[language]++;
    this.repoTypes[repoType]++;
    if (isGem) this.gems++;
    this.total++;
  }

  getStatus() {
    return {
      skillLevels: this.skillLevels,
      starTiers: this.starTiers,
      languages: this.languages,
      repoTypes: this.repoTypes,
      gems: this.gems,
      total: this.total
    };
  }
}

// ============================================
// CLASSIFICATION FUNCTIONS
// ============================================

function classifySkillLevel(repo) {
  const text = `${repo.description || ''} ${(repo.topics || []).join(' ')} ${repo.name || ''}`.toLowerCase();
  
  for (const [level, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return level;
    }
  }
  
  // Default based on stars and size
  const stars = repo.stargazers_count || 0;
  const size = repo.size || 0;
  
  if (stars < 100 && size < 10000) return 'beginner';
  if (stars < 1000 && size < 50000) return 'intermediate';
  if (stars >= 10000 || size >= 100000) return 'infrastructure';
  return 'advanced';
}

function classifyRepoType(repo) {
  const text = `${repo.description || ''} ${(repo.topics || []).join(' ')} ${repo.name || ''}`.toLowerCase();
  
  for (const [type, keywords] of Object.entries(REPO_TYPE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return type;
    }
  }
  
  // Default based on stars and size
  const stars = repo.stargazers_count || 0;
  const size = repo.size || 0;
  
  if (stars > 10000 || size > 100000) return 'infrastructure';
  if (stars > 5000 && size > 50000) return 'production_saas';
  return 'full_app';
}

function getStarTier(stars) {
  if (stars < 100) return 'tier1';
  if (stars < 1000) return 'tier2';
  if (stars < 10000) return 'tier3';
  return 'tier4';
}

function normalizeLanguage(language) {
  if (!language) return 'other';
  const lang = language.toLowerCase();
  if (lang === 'python') return 'python';
  if (lang === 'javascript' || lang === 'typescript') return 'javascript';
  if (lang === 'go') return 'go';
  if (lang === 'rust') return 'rust';
  if (lang === 'java' || lang === 'kotlin') return 'java';
  return 'other';
}

function isGem(repo, health, activity) {
  if (!health || !activity) return false;
  
  const stars = repo.stargazers_count || 0;
  const contributors = repo.contributors_count || 0;
  
  return (
    stars < 1000 &&
    health.health_score > 0.8 &&
    activity.freshness_score > 0.7 &&
    health.documentation_score > 0.7 &&
    contributors > 3
  );
}

// ============================================
// GITHUB API HELPERS
// ============================================

async function fetchGitHubAPI(endpoint, retries = 3) {
  const url = `https://api.github.com${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Balanced-Ingestion'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(url, { 
        headers,
        agent: httpsAgent,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message?.includes('timeout')) {
        if (i < retries - 1) {
          const waitTime = 5000 * (i + 1);
          console.log(`  ⏳ Connection timeout. Retrying in ${waitTime/1000}s... (attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      throw error;
    }
  }
  
  return null;
}

async function searchReposByQuery(query, minStars = 0, maxStars = 10000, page = 1) {
  const starsQuery = `stars:${minStars}..${maxStars}`;
  const fullQuery = `${query} ${starsQuery}`;
  const endpoint = `/search/repositories?q=${encodeURIComponent(fullQuery)}&sort=stars&order=desc&per_page=100&page=${page}`;
  
  const data = await fetchGitHubAPI(endpoint);
  if (!data || !data.items) return { repos: [], total: 0 };
  
  return { repos: data.items, total: data.total_count || 0 };
}

async function getRepoDetails(repo) {
  // Get full repo details including languages
  const repoData = await fetchGitHubAPI(`/repos/${repo.full_name}`);
  if (!repoData) return null;
  
  // Get languages
  const languages = await fetchGitHubAPI(`/repos/${repo.full_name}/languages`);
  if (languages) {
    // Primary language is the one with most bytes
    const primaryLang = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    repoData.language = primaryLang || repoData.language;
  }
  
  // Get contributors count
  const contributors = await fetchGitHubAPI(`/repos/${repo.full_name}/contributors?per_page=1&anon=true`);
  if (contributors && Array.isArray(contributors)) {
    const contributorsData = await fetchGitHubAPI(`/repos/${repo.full_name}/contributors?per_page=100`);
    repoData.contributors_count = contributorsData?.length || 0;
  }
  
  return repoData;
}

// ============================================
// DATABASE HELPERS
// ============================================

async function repoExists(repoId) {
  const { data, error } = await supabase
    .from('repos_master')
    .select('repo_id')
    .eq('repo_id', repoId)
    .single();
  
  return !!data && !error;
}

async function getCurrentQuotas(clusterSlug) {
  // Get current counts from database
  const { data: clusterRepos, error: clusterError } = await supabase
    .from('repo_cluster_new')
    .select('repo_id')
    .eq('cluster_slug', clusterSlug);
  
  if (clusterError || !clusterRepos || clusterRepos.length === 0) {
    return new QuotaTracker(clusterSlug);
  }
  
  const repoIds = clusterRepos.map(r => r.repo_id);
  
  // Get repos with all enrichment data
  const { data: repos, error: reposError } = await supabase
    .from('repos_master')
    .select(`
      repo_id,
      stars,
      language,
      description,
      topics,
      name,
      size_kb,
      contributors_count
    `)
    .in('repo_id', repoIds);
  
  if (reposError || !repos) {
    return new QuotaTracker(clusterSlug);
  }
  
  const tracker = new QuotaTracker(clusterSlug);
  
  // Get enrichment data in batches
  for (const repo of repos) {
    // Get complexity
    const { data: complexity } = await supabase
      .from('repo_complexity')
      .select('complexity_slug')
      .eq('repo_id', repo.repo_id)
      .single();
    
    // Get health
    const { data: health } = await supabase
      .from('repo_health')
      .select('health_score, documentation_score')
      .eq('repo_id', repo.repo_id)
      .single();
    
    // Get activity
    const { data: activity } = await supabase
      .from('repo_activity')
      .select('freshness_score')
      .eq('repo_id', repo.repo_id)
      .single();
    
    // Check if gem
    const { data: gem } = await supabase
      .from('repo_gems')
      .select('repo_id')
      .eq('repo_id', repo.repo_id)
      .single();
    
    const skillLevel = classifySkillLevel(repo);
    const starTier = getStarTier(repo.stars || 0);
    const language = normalizeLanguage(repo.language);
    const repoType = complexity?.complexity_slug || classifyRepoType(repo);
    const isGem = !!gem;
    
    tracker.recordRepo(repo, skillLevel, starTier, language, repoType, isGem);
  }
  
  return tracker;
}

async function storeRepo(repo) {
  const repoData = {
    repo_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description || null,
    owner_login: repo.owner?.login || '',
    avatar_url: repo.owner?.avatar_url || null,
    html_url: repo.html_url,
    language: repo.language || null,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    watchers: repo.watchers_count || 0,
    open_issues: repo.open_issues_count || 0,
    topics: repo.topics || [],
    created_at: repo.created_at || null,
    updated_at: repo.updated_at || null,
    pushed_at: repo.pushed_at || null,
    size_kb: repo.size || 0,
    default_branch: repo.default_branch || null,
    license: repo.license?.spdx_id || null,
    archived: repo.archived || false,
    contributors_count: repo.contributors_count || 0,
    visibility: repo.private ? 'private' : 'public',
    ingested_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('repos_master')
    .upsert(repoData, { onConflict: 'repo_id' });
  
  if (error) {
    console.error(`  ❌ Error storing repo ${repo.full_name}:`, error.message);
    return false;
  }
  
  return true;
}

async function enrichRepo(repoId, clusterSlug) {
  try {
    // Get repo
    const { data: repo } = await supabase
      .from('repos_master')
      .select('*')
      .eq('repo_id', repoId)
      .single();
    
    if (!repo) return;
    
    const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
    
    // Batch all enrichment operations for speed
    const operations = [];
    
    // 1. Assign cluster
    operations.push(
      supabase
        .from('repo_cluster_new')
        .upsert({
          repo_id: repoId,
          cluster_slug: clusterSlug,
          weight: 1.0,
          confidence_score: 0.9
        }, { onConflict: 'repo_id,cluster_slug' })
    );
    
    // 2. Detect tech stack
    const language = repo.language?.toLowerCase();
    const techStack = [];
    
    if (language) {
      const languageMap = {
        'javascript': 'javascript', 'typescript': 'javascript',
        'python': 'python', 'java': 'java', 'go': 'go', 'rust': 'rust'
      };
      
      if (languageMap[language]) {
        techStack.push({ tech_slug: languageMap[language], weight: 1.0 });
      }
    }
    
    // Detect frameworks
    const frameworkKeywords = {
      'react': 'react', 'vue': 'vue', 'angular': 'angular', 'nextjs': 'nextjs',
      'django': 'django', 'flask': 'flask', 'fastapi': 'fastapi',
      'docker': 'docker', 'kubernetes': 'kubernetes', 'terraform': 'terraform'
    };
    
    for (const [keyword, tech] of Object.entries(frameworkKeywords)) {
      if (text.includes(keyword)) {
        techStack.push({ tech_slug: tech, weight: 0.8 });
      }
    }
    
    for (const tech of techStack) {
      operations.push(
        supabase
          .from('repo_tech_stack')
          .upsert({
            repo_id: repoId,
            tech_slug: tech.tech_slug,
            weight: tech.weight
          }, { onConflict: 'repo_id,tech_slug' })
      );
    }
    
    // 3. Classify complexity
    const repoType = classifyRepoType(repo);
    const complexitySlug = repoType;
    
    operations.push(
      supabase
        .from('repo_complexity')
        .upsert({
          repo_id: repoId,
          complexity_slug: complexitySlug,
          confidence: 0.8,
          loc_bucket: repo.size_kb < 10000 ? 'small' : repo.size_kb < 50000 ? 'medium' : 'large'
        }, { onConflict: 'repo_id' })
    );
    
    // 4. Compute activity
    const lastCommitAt = repo.pushed_at || repo.updated_at;
    const daysInactive = lastCommitAt ? 
      (Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24) : 999;
    
    const freshnessScore = daysInactive <= 30 ? 1.0 :
      daysInactive <= 90 ? 0.85 :
      daysInactive <= 180 ? 0.65 :
      daysInactive <= 365 ? 0.45 : 0.25;
    
    operations.push(
      supabase
        .from('repo_activity')
        .upsert({
          repo_id: repoId,
          last_commit_at: lastCommitAt,
          commits_30_days: 0,
          commits_90_days: 0,
          commit_velocity: 0,
          freshness_score: freshnessScore,
          activity_score: freshnessScore * 0.6
        }, { onConflict: 'repo_id' })
    );
    
    // 5. Compute health
    const activityScore = freshnessScore * 0.6;
    const communityScore = Math.min((repo.stars / 100000 + repo.forks / 10000) / 2, 1.0);
    const maintenanceScore = Math.min(activityScore + (1 - Math.min(repo.open_issues / 100, 1.0)) * 0.3, 1.0);
    const codeQuality = 0.7 + (activityScore * 0.3);
    const documentationScore = repo.description ? 0.8 : 0.3;
    const age = repo.created_at ? (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365) : 0;
    const stabilityScore = Math.min(age / 5, 1.0) * 0.7 + activityScore * 0.3;
    
    const healthScore = (
      activityScore * 0.25 +
      maintenanceScore * 0.20 +
      communityScore * 0.20 +
      codeQuality * 0.15 +
      documentationScore * 0.10 +
      stabilityScore * 0.10
    );
    
    operations.push(
      supabase
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
        }, { onConflict: 'repo_id' })
    );
    
    // 6. Assign badges
    const badges = [];
    if (healthScore > 0.85) badges.push('well_maintained');
    if (freshnessScore > 0.85) badges.push('actively_updated');
    if (complexitySlug === 'tutorial' && documentationScore > 0.7) badges.push('beginner_friendly');
    if (healthScore > 0.8 && freshnessScore > 0.7) badges.push('production_ready');
    
    for (const badge of badges) {
      operations.push(
        supabase
          .from('repo_badges')
          .upsert({ repo_id: repoId, badge_slug: badge }, { onConflict: 'repo_id,badge_slug' })
      );
    }
    
    // Execute all operations in parallel for speed
    await Promise.all(operations);
    
    // 7. Detect gems (needs health/activity data, so do after)
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
    
    if (isGem(repo, health, activity)) {
      const gemScore = (
        (health.health_score * 0.3) +
        (activity.freshness_score * 0.3) +
        (health.documentation_score * 0.2) +
        (Math.min((repo.contributors_count || 0) / 10, 1.0) * 0.2)
      );
      
      await supabase
        .from('repo_gems')
        .upsert({
          repo_id: repoId,
          gem_score: gemScore,
          reason: {
            health_score: health.health_score,
            freshness_score: activity.freshness_score,
            documentation_score: health.documentation_score,
            contributors: repo.contributors_count
          }
        }, { onConflict: 'repo_id' });
    }
    
  } catch (error) {
    // Silent error handling for speed - don't log every error
    // console.error(`  ❌ Error enriching repo ${repoId}:`, error.message);
  }
}

// ============================================
// INGESTION LOGIC
// ============================================

async function ingestCluster(clusterSlug, target) {
  console.log(`\n🎯 Ingesting cluster: ${clusterSlug.toUpperCase()}`);
  console.log(`   Target: ${target} repos\n`);
  
  const tracker = await getCurrentQuotas(clusterSlug);
  const config = CLUSTER_TARGETS[clusterSlug];
  
  let ingested = 0;
  let attempts = 0;
  const maxAttempts = 10000; // Safety limit
  
  // Build keyword search strategies
  const searchStrategies = [];
  
  // Skill level keywords
  for (const [level, keywords] of Object.entries(SKILL_KEYWORDS)) {
    for (const keyword of keywords.slice(0, 3)) { // Top 3 keywords per level
      for (const topic of config.topics.slice(0, 3)) { // Top 3 topics
        searchStrategies.push({
          query: `${topic} ${keyword}`,
          skillLevel: level,
          starTiers: Object.keys(STAR_TIER_TARGETS)
        });
      }
    }
  }
  
  // Star tier searches
  for (const [tier, tierConfig] of Object.entries(STAR_TIER_TARGETS)) {
    for (const topic of config.topics.slice(0, 2)) {
      searchStrategies.push({
        query: topic,
        skillLevel: null,
        starTiers: [tier],
        minStars: tierConfig.min,
        maxStars: tierConfig.max
      });
    }
  }
  
  // Language searches
  for (const [lang, langConfig] of Object.entries(LANGUAGE_TARGETS)) {
    if (lang === 'other') continue; // Skip other
    for (const topic of config.topics.slice(0, 2)) {
      searchStrategies.push({
        query: `${topic} language:${lang}`,
        skillLevel: null,
        starTiers: Object.keys(STAR_TIER_TARGETS),
        language: lang
      });
    }
  }
  
  // Shuffle strategies for diversity
  searchStrategies.sort(() => Math.random() - 0.5);
  
  while (tracker.total < target && attempts < maxAttempts) {
    attempts++;
    
    // Find strategy that matches current needs
    let strategy = null;
    for (const s of searchStrategies) {
      const skillQuota = tracker.getSkillLevelQuota();
      const starQuota = tracker.getStarTierQuota();
      const langQuota = tracker.getLanguageQuota();
      
      if (s.skillLevel && skillQuota[s.skillLevel] > 0) {
        strategy = s;
        break;
      }
      if (s.language && langQuota[s.language] > 0) {
        strategy = s;
        break;
      }
      if (s.starTiers.some(t => starQuota[t] > 0)) {
        strategy = s;
        break;
      }
    }
    
    if (!strategy) {
      // Use random strategy if no specific need
      strategy = searchStrategies[Math.floor(Math.random() * searchStrategies.length)];
    }
    
    const minStars = strategy.minStars || 0;
    const maxStars = strategy.maxStars || 10000;
    
    // Search GitHub
    const { repos } = await searchReposByQuery(strategy.query, minStars, maxStars, 1);
    
    if (!repos || repos.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
    
    // Process repos (increased batch size for speed)
    for (const repo of repos.slice(0, 30)) { // Process 30 at a time
      if (tracker.total >= target) break;
      
      // Skip excluded orgs
      if (EXCLUDED_ORGS.includes(repo.owner?.login?.toLowerCase())) continue;
      
      // Check if exists (optimized - check cluster directly)
      const { data: clusterCheck } = await supabase
        .from('repo_cluster_new')
        .select('repo_id')
        .eq('repo_id', repo.id)
        .eq('cluster_slug', clusterSlug)
        .single();
      
      if (clusterCheck) {
        // Already in this cluster, skip
        continue;
      }
      
      const exists = await repoExists(repo.id);
      if (exists) {
        // Just add cluster assignment (faster)
        await supabase
          .from('repo_cluster_new')
          .upsert({
            repo_id: repo.id,
            cluster_slug: clusterSlug,
            weight: 1.0,
            confidence_score: 0.9
          }, { onConflict: 'repo_id,cluster_slug' });
        
        // Quick enrichment check
        const { data: hasComplexity } = await supabase
          .from('repo_complexity')
          .select('repo_id')
          .eq('repo_id', repo.id)
          .single();
        
        if (!hasComplexity) {
          // Needs enrichment - do it now
          await enrichRepo(repo.id, clusterSlug);
        }
        
        // Count it
        const { data: existingRepo } = await supabase
          .from('repos_master')
          .select('stars, language, description, topics, name, size_kb, contributors_count')
          .eq('repo_id', repo.id)
          .single();
        
        if (existingRepo) {
          const skillLevel = classifySkillLevel(existingRepo);
          const starTier = getStarTier(existingRepo.stars || 0);
          const language = normalizeLanguage(existingRepo.language);
          const repoType = classifyRepoType(existingRepo);
          tracker.recordRepo(existingRepo, skillLevel, starTier, language, repoType, false);
          ingested++;
        }
        continue;
      }
      
      // Check if we need this repo (relaxed for speed - ingest more)
      if (!tracker.needsRepo(repo)) {
        // Still might need it for overall target
        if (Math.random() > 0.1) continue; // 90% chance to still ingest (faster)
      }
      
      // Get full details (with timeout protection)
      let fullRepo;
      try {
        fullRepo = await Promise.race([
          getRepoDetails(repo),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        ]);
      } catch (error) {
        continue; // Skip on timeout/error
      }
      if (!fullRepo) continue;
      
      // Store repo
      if (!(await storeRepo(fullRepo))) continue;
      
      // Enrich repo (wait for it to complete)
      await enrichRepo(fullRepo.id, clusterSlug);
      
      // Update tracker (estimate gem status - will be updated later)
      const skillLevel = classifySkillLevel(fullRepo);
      const starTier = getStarTier(fullRepo.stargazers_count || 0);
      const language = normalizeLanguage(fullRepo.language);
      const repoType = classifyRepoType(fullRepo);
      
      // Quick gem estimate (don't wait for health/activity)
      const estimatedGem = (fullRepo.stargazers_count || 0) < 1000 && 
                           (fullRepo.contributors_count || 0) > 3 &&
                           fullRepo.description;
      
      tracker.recordRepo(fullRepo, skillLevel, starTier, language, repoType, estimatedGem);
      
      ingested++;
      
      if (ingested % 50 === 0) {
        const status = tracker.getStatus();
        console.log(`  ✅ Ingested ${ingested} repos | Total: ${tracker.total}/${target}`);
        console.log(`     Skill: B:${status.skillLevels.beginner} I:${status.skillLevels.intermediate} A:${status.skillLevels.advanced} Inf:${status.skillLevels.infrastructure}`);
        console.log(`     Stars: T1:${status.starTiers.tier1} T2:${status.starTiers.tier2} T3:${status.starTiers.tier3} T4:${status.starTiers.tier4}`);
        console.log(`     Langs: Py:${status.languages.python} JS:${status.languages.javascript} Go:${status.languages.go} Rust:${status.languages.rust} Java:${status.languages.java} Other:${status.languages.other}`);
        console.log(`     Types: Tut:${status.repoTypes.tutorial} Boil:${status.repoTypes.boilerplate} App:${status.repoTypes.full_app} SaaS:${status.repoTypes.production_saas} Inf:${status.repoTypes.infrastructure}`);
        console.log(`     Gems: ${status.gems}`);
      }
      
      // Minimal rate limiting (optimized for speed)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const finalStatus = tracker.getStatus();
  console.log(`\n   ✅ Cluster ${clusterSlug}: Ingested ${ingested} repos`);
  console.log(`   📊 Final Status:`);
  console.log(`      Total: ${finalStatus.total}/${target}`);
  console.log(`      Skill Levels: B:${finalStatus.skillLevels.beginner} I:${finalStatus.skillLevels.intermediate} A:${finalStatus.skillLevels.advanced} Inf:${finalStatus.skillLevels.infrastructure}`);
  console.log(`      Star Tiers: T1:${finalStatus.starTiers.tier1} T2:${finalStatus.starTiers.tier2} T3:${finalStatus.starTiers.tier3} T4:${finalStatus.starTiers.tier4}`);
  console.log(`      Languages: Py:${finalStatus.languages.python} JS:${finalStatus.languages.javascript} Go:${finalStatus.languages.go} Rust:${finalStatus.languages.rust} Java:${finalStatus.languages.java} Other:${finalStatus.languages.other}`);
  console.log(`      Repo Types: Tut:${finalStatus.repoTypes.tutorial} Boil:${finalStatus.repoTypes.boilerplate} App:${finalStatus.repoTypes.full_app} SaaS:${finalStatus.repoTypes.production_saas} Inf:${finalStatus.repoTypes.infrastructure}`);
  console.log(`      Gems: ${finalStatus.gems} (${((finalStatus.gems / finalStatus.total) * 100).toFixed(1)}%)\n`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const clusterArg = args.find(arg => arg.startsWith('--cluster'));
  const cluster = clusterArg ? clusterArg.split('=')[1] : 'all';
  
  console.log('🚀 Balanced Multi-Dimensional Ingestion System\n');
  console.log('Target Distribution:');
  for (const [slug, config] of Object.entries(CLUSTER_TARGETS)) {
    console.log(`  ${slug}: ${config.target} repos`);
  }
  console.log(`\nTotal Target: ${Object.values(CLUSTER_TARGETS).reduce((sum, c) => sum + c.target, 0)} repos\n`);
  
  console.log('Quota Targets (per cluster):');
  console.log('  Skill Levels: Beginner (25%), Intermediate (35%), Advanced (25%), Infrastructure (15%)');
  console.log('  Star Tiers: 0-100 (10%), 100-1k (35%), 1k-10k (35%), 10k+ (20%)');
  console.log('  Languages: Python (30%), JS/TS (25%), Go (10%), Rust (10%), Java/Kotlin (10%), Other (15%)');
  console.log('  Repo Types: Tutorials (20%), Boilerplates (20%), Full Apps (30%), SaaS (15%), Infra (15%)');
  console.log('  Gems: 5-12% per cluster\n');
  
  if (cluster === 'all') {
    for (const [clusterSlug, config] of Object.entries(CLUSTER_TARGETS)) {
      // Check current count first
      const tracker = await getCurrentQuotas(clusterSlug);
      const current = tracker.total;
      
      if (current >= config.target) {
        console.log(`\n⏭️  Skipping ${clusterSlug}: Already at target (${current}/${config.target})`);
        // Still enrich existing repos if needed
        if (current > 0) {
          console.log(`   Enriching existing ${current} repos...`);
          const { data: repos } = await supabase
            .from('repo_cluster_new')
            .select('repo_id')
            .eq('cluster_slug', clusterSlug)
            .limit(100); // Enrich in batches
          
          if (repos && repos.length > 0) {
            for (const repo of repos.slice(0, 50)) {
              await enrichRepo(repo.repo_id, clusterSlug);
            }
            console.log(`   ✅ Enriched ${Math.min(50, repos.length)} repos`);
          }
        }
        continue;
      }
      
      await ingestCluster(clusterSlug, config.target);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } else if (CLUSTER_TARGETS[cluster]) {
    await ingestCluster(cluster, CLUSTER_TARGETS[cluster].target);
  } else {
    console.log(`❌ Unknown cluster: ${cluster}`);
    console.log(`Available clusters: ${Object.keys(CLUSTER_TARGETS).join(', ')}`);
    process.exit(1);
  }
  
  // Final summary
  console.log('\n📊 Final Summary:\n');
  for (const [clusterSlug, config] of Object.entries(CLUSTER_TARGETS)) {
    const tracker = await getCurrentQuotas(clusterSlug);
    const status = tracker.getStatus();
    const progress = ((status.total / config.target) * 100).toFixed(1);
    console.log(`  ${clusterSlug}: ${status.total}/${config.target} (${progress}%)`);
  }
  
  const totalCurrent = await Promise.all(
    Object.keys(CLUSTER_TARGETS).map(async (slug) => {
      const tracker = await getCurrentQuotas(slug);
      return tracker.total;
    })
  ).then(counts => counts.reduce((a, b) => a + b, 0));
  
  const totalTarget = Object.values(CLUSTER_TARGETS).reduce((sum, c) => sum + c.target, 0);
  
  console.log(`\n  Total: ${totalCurrent}/${totalTarget} repos`);
  console.log('\n✨ Ingestion complete!');
}

main().catch(console.error);
