/**
 * Parallel Balanced Multi-Dimensional Ingestion System
 * Uses multiple GitHub API tokens for parallel processing
 * 
 * Usage:
 *   node ingest-balanced-parallel.js --cluster=all
 *   node ingest-balanced-parallel.js --cluster=ai_ml
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

// Initialize token pool from environment
const tokenString = process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || '';
const GITHUB_TOKENS = tokenString.split(',').map(t => t.trim()).filter(Boolean);

if (GITHUB_TOKENS.length === 0) {
  console.error('❌ No GitHub tokens found. Set GITHUB_TOKENS or GITHUB_TOKEN in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️  WARNING: Using SUPABASE_ANON_KEY. SUPABASE_SERVICE_ROLE_KEY is recommended.\n');
}

// ============================================
// TOKEN POOL MANAGER
// ============================================

class TokenPool {
  constructor(tokens) {
    this.tokens = tokens;
    this.currentIndex = 0;
    this.rateLimits = new Map(); // token -> { resetTime, remaining }
  }

  getToken() {
    if (this.tokens.length === 0) return null;
    
    // Round-robin selection
    const token = this.tokens[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
    return token;
  }

  markRateLimited(token, resetTime) {
    if (!this.rateLimits.has(token)) {
      this.rateLimits.set(token, { resetTime: 0, remaining: 5000 });
    }
    const limit = this.rateLimits.get(token);
    limit.resetTime = resetTime;
    limit.remaining = 0;
  }

  getAvailableToken() {
    const now = Date.now() / 1000;
    
    // Find token that's not rate limited
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[this.currentIndex];
      const limit = this.rateLimits.get(token);
      
      if (!limit || limit.resetTime < now || limit.remaining > 100) {
        this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
        return token;
      }
      
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
    }
    
    // All rate limited, return first one anyway
    return this.tokens[0];
  }
}

const tokenPool = new TokenPool(GITHUB_TOKENS);
const NUM_WORKERS = Math.min(GITHUB_TOKENS.length, 10); // Use up to 10 parallel workers

// ============================================
// CONFIGURATION (same as original)
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

const SKILL_LEVEL_TARGETS = {
  'beginner': { percent: 25, target: 500 },
  'intermediate': { percent: 35, target: 700 },
  'advanced': { percent: 25, target: 500 },
  'infrastructure': { percent: 15, target: 300 }
};

const STAR_TIER_TARGETS = {
  'tier1': { min: 0, max: 100, percent: 10, target: 200 },
  'tier2': { min: 100, max: 1000, percent: 35, target: 700 },
  'tier3': { min: 1000, max: 10000, percent: 35, target: 700 },
  'tier4': { min: 10000, max: 999999, percent: 20, target: 400 }
};

const LANGUAGE_TARGETS = {
  'python': { percent: 30, target: 600 },
  'javascript': { percent: 25, target: 500 },
  'go': { percent: 10, target: 200 },
  'rust': { percent: 10, target: 200 },
  'java': { percent: 10, target: 200 },
  'other': { percent: 15, target: 300 }
};

const REPO_TYPE_TARGETS = {
  'tutorial': { percent: 20, target: 400 },
  'boilerplate': { percent: 20, target: 400 },
  'full_app': { percent: 30, target: 600 },
  'production_saas': { percent: 15, target: 300 },
  'infrastructure': { percent: 15, target: 300 }
};

const GEM_TARGET_MIN = 0.05;
const GEM_TARGET_MAX = 0.12;

const SKILL_KEYWORDS = {
  'beginner': ['tutorial', 'starter', 'beginner', 'learn', 'example', 'guide', 'getting-started', 'introduction'],
  'intermediate': ['full app', 'dashboard', 'system', 'application', 'project', 'demo', 'sample'],
  'advanced': ['saas', 'engine', 'platform', 'framework', 'library', 'toolkit', 'enterprise'],
  'infrastructure': ['framework', 'orchestration', 'infrastructure', 'devops', 'deployment', 'kubernetes', 'docker']
};

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
// QUOTA TRACKING (same as original)
// ============================================

class QuotaTracker {
  constructor(clusterSlug) {
    this.clusterSlug = clusterSlug;
    this.skillLevels = { beginner: 0, intermediate: 0, advanced: 0, infrastructure: 0 };
    this.starTiers = { tier1: 0, tier2: 0, tier3: 0, tier4: 0 };
    this.languages = { python: 0, javascript: 0, go: 0, rust: 0, java: 0, other: 0 };
    this.repoTypes = { tutorial: 0, boilerplate: 0, full_app: 0, production_saas: 0, infrastructure: 0 };
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

  needsRepo(repo) {
    const skillLevel = classifySkillLevel(repo);
    const starTier = getStarTier(repo.stargazers_count || 0);
    const language = normalizeLanguage(repo.language);
    const repoType = classifyRepoType(repo);

    const skillQuota = this.getSkillLevelQuota();
    const starQuota = this.getStarTierQuota();
    const langQuota = this.getLanguageQuota();
    const typeQuota = this.getRepoTypeQuota();

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
// CLASSIFICATION FUNCTIONS (same as original)
// ============================================

function classifySkillLevel(repo) {
  const text = `${repo.description || ''} ${(repo.topics || []).join(' ')} ${repo.name || ''}`.toLowerCase();
  
  for (const [level, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return level;
    }
  }
  
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
// GITHUB API HELPERS (with token support)
// ============================================

async function fetchGitHubAPIWithToken(endpoint, token, retries = 5) {
  const url = `https://api.github.com${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Parallel-Ingestion'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // Increased timeout
      
      const response = await fetch(url, { 
        headers,
        agent: httpsAgent,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 404) return null;
      
      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0');
        
        if (resetTime) {
          tokenPool.markRateLimited(token, parseInt(resetTime));
          const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
          
          if (waitTime > 0 && waitTime < 3600000) {
            await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 10000)));
            continue;
          }
        }
      }
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      // Handle ALL errors gracefully - never crash
      const isNetworkError = 
        error.name === 'AbortError' || 
        error.code === 'UND_ERR_CONNECT_TIMEOUT' || 
        error.message?.includes('timeout') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED') ||
        error.cause?.code === 'ECONNRESET' ||
        error.cause?.code === 'ECONNREFUSED' ||
        error.toString().includes('fetch failed');
      
      if (isNetworkError) {
        if (i < retries - 1) {
          const waitTime = 2000 * (i + 1); // Exponential backoff: 2s, 4s, 6s, 8s, 10s
          console.log(`  ⚠️  Network error (attempt ${i + 1}/${retries}), retrying in ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          console.log(`  ⚠️  Network error after ${retries} attempts, skipping this request`);
          return null; // Return null instead of throwing to continue processing
        }
      }
      
      // For other errors, also return null instead of throwing
      if (i === retries - 1) {
        console.log(`  ⚠️  API error after ${retries} attempts: ${error.message || error.toString()}`);
        return null; // Return null on final retry to continue
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  return null;
}

async function searchReposByQueryWithToken(query, minStars, maxStars, page, token) {
  // Ensure minimum stars for quality
  const effectiveMinStars = Math.max(minStars, QUALITY_FILTERS.MIN_STARS);
  const starsQuery = `stars:${effectiveMinStars}..${maxStars}`;
  const fullQuery = `${query} ${starsQuery}`;
  const endpoint = `/search/repositories?q=${encodeURIComponent(fullQuery)}&sort=stars&order=desc&per_page=100&page=${page}`;
  
  const data = await fetchGitHubAPIWithToken(endpoint, token);
  if (!data || !data.items || data.items.length === 0) {
    return { repos: [], total: 0, hasMore: false };
  }
  
  // If total_count is 0 or less than page * 100, no more pages
  const totalCount = data.total_count || 0;
  const hasMore = totalCount > (page * 100);
  
  // Filter out low-quality repos immediately
  const qualityRepos = data.items.filter(repo => {
    const check = passesQualityFilter(repo);
    return check.pass;
  });
  
  return { repos: qualityRepos, total: totalCount, hasMore };
}

async function getRepoDetailsWithToken(repo, token) {
  const repoData = await fetchGitHubAPIWithToken(`/repos/${repo.full_name}`, token);
  if (!repoData) return null;
  
  // Get languages and contributors in parallel
  const [languages, contributors] = await Promise.all([
    fetchGitHubAPIWithToken(`/repos/${repo.full_name}/languages`, token),
    fetchGitHubAPIWithToken(`/repos/${repo.full_name}/contributors?per_page=100`, token)
  ]);
  
  if (languages) {
    const primaryLang = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    repoData.language = primaryLang || repoData.language;
  }
  
  repoData.contributors_count = contributors?.length || 0;
  
  return repoData;
}

// ============================================
// DATABASE HELPERS (same as original)
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
  // FAST VERSION: Just count repos, don't load all details
  const { count, error } = await supabase
    .from('repo_cluster_new')
    .select('*', { count: 'exact', head: true })
    .eq('cluster_slug', clusterSlug);
  
  const tracker = new QuotaTracker(clusterSlug);
  tracker.total = count || 0;
  
  // If we have repos, do a quick estimate (don't load all details - too slow!)
  if (tracker.total > 0 && tracker.total < 500) {
    // Only do detailed check for small clusters (< 500 repos)
    const { data: clusterRepos } = await supabase
      .from('repo_cluster_new')
      .select('repo_id')
      .eq('cluster_slug', clusterSlug)
      .limit(500);
    
    if (clusterRepos && clusterRepos.length > 0) {
      const repoIds = clusterRepos.map(r => r.repo_id);
      const { data: repos } = await supabase
        .from('repos_master')
        .select(`repo_id, stars, language, description, topics, name, size_kb, contributors_count`)
        .in('repo_id', repoIds);
      
      if (repos) {
        // Batch get all enrichment data at once
        const { data: complexities } = await supabase
          .from('repo_complexity')
          .select('repo_id, complexity_slug')
          .in('repo_id', repoIds);
        
        const { data: gems } = await supabase
          .from('repo_gems')
          .select('repo_id')
          .in('repo_id', repoIds);
        
        const complexityMap = new Map(complexities?.map(c => [c.repo_id, c.complexity_slug]) || []);
        const gemSet = new Set(gems?.map(g => g.repo_id) || []);
        
        for (const repo of repos) {
          const skillLevel = classifySkillLevel(repo);
          const starTier = getStarTier(repo.stars || 0);
          const language = normalizeLanguage(repo.language);
          const repoType = complexityMap.get(repo.repo_id) || classifyRepoType(repo);
          const isGem = gemSet.has(repo.repo_id);
          
          tracker.recordRepo(repo, skillLevel, starTier, language, repoType, isGem);
        }
      }
    }
  } else {
    // For large clusters, just estimate based on total count
    // This is much faster - we'll track accurately as we add new repos
    console.log(`  ⚡ Fast mode: Using count only for ${tracker.total} repos (detailed tracking disabled for speed)`);
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
    return false;
  }
  
  return true;
}

async function enrichRepo(repoId, clusterSlug) {
  try {
    const { data: repo } = await supabase
      .from('repos_master')
      .select('*')
      .eq('repo_id', repoId)
      .single();
    
    if (!repo) return;
    
    const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
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
    
    await Promise.all(operations);
    
    // 7. Detect gems
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
    // Silent error handling
  }
}

// ============================================
// PARALLEL PROCESSING
// ============================================

// Quality filters (relaxed for better discovery)
const QUALITY_FILTERS = {
  MIN_STARS: 5,               // Minimum stars (reject repos with < 5 stars) - lowered for more repos
  MIN_FORKS: 0,               // Minimum forks (0 = no filter) - relaxed
  MAX_DAYS_INACTIVE: 730,     // Reject repos inactive for > 2 years (relaxed from 365)
  MIN_DESCRIPTION_LENGTH: 10, // Minimum description length (lowered)
  REJECT_ARCHIVED: true,      // Reject archived repos
  REJECT_FORKS: false,        // Allow forks (set to true to reject)
  MIN_SIZE_KB: 0              // Minimum repo size (0 = no filter)
};

function passesQualityFilter(repo) {
  // Check stars
  if ((repo.stargazers_count || 0) < QUALITY_FILTERS.MIN_STARS) {
    return { pass: false, reason: `Too few stars (${repo.stargazers_count || 0} < ${QUALITY_FILTERS.MIN_STARS})` };
  }
  
  // Check forks
  if ((repo.forks_count || 0) < QUALITY_FILTERS.MIN_FORKS) {
    return { pass: false, reason: `Too few forks (${repo.forks_count || 0} < ${QUALITY_FILTERS.MIN_FORKS})` };
  }
  
  // Check archived
  if (QUALITY_FILTERS.REJECT_ARCHIVED && repo.archived) {
    return { pass: false, reason: 'Archived repo' };
  }
  
  // Check forks
  if (QUALITY_FILTERS.REJECT_FORKS && repo.fork) {
    return { pass: false, reason: 'Fork repo' };
  }
  
  // Check description
  if (QUALITY_FILTERS.MIN_DESCRIPTION_LENGTH > 0) {
    const descLength = (repo.description || '').length;
    if (descLength < QUALITY_FILTERS.MIN_DESCRIPTION_LENGTH) {
      return { pass: false, reason: `Description too short (${descLength} < ${QUALITY_FILTERS.MIN_DESCRIPTION_LENGTH})` };
    }
  }
  
  // Check activity (pushed_at)
  if (QUALITY_FILTERS.MAX_DAYS_INACTIVE > 0 && repo.pushed_at) {
    const daysInactive = (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysInactive > QUALITY_FILTERS.MAX_DAYS_INACTIVE) {
      return { pass: false, reason: `Inactive for ${Math.floor(daysInactive)} days` };
    }
  }
  
  // Check size
  if (QUALITY_FILTERS.MIN_SIZE_KB > 0 && (repo.size || 0) < QUALITY_FILTERS.MIN_SIZE_KB) {
    return { pass: false, reason: `Too small (${repo.size || 0}KB < ${QUALITY_FILTERS.MIN_SIZE_KB}KB)` };
  }
  
  return { pass: true };
}

async function processSingleRepo(repo, clusterSlug, workerId) {
  try {
    const token = tokenPool.getAvailableToken();
    if (!token) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ingested: 0, enriched: 0, errors: 1 };
    }
    
    // Skip excluded orgs
    if (EXCLUDED_ORGS.includes(repo.owner?.login?.toLowerCase())) {
      console.log(`  ⏭️  [Worker ${workerId}] Skipped excluded org: ${repo.full_name}`);
      return { ingested: 0, enriched: 0, errors: 0 };
    }
    
    // Quality filter check (before fetching full details to save API calls)
    const qualityCheck = passesQualityFilter(repo);
    if (!qualityCheck.pass) {
      console.log(`  ⚠️  [Worker ${workerId}] Quality filter: ${repo.full_name} - ${qualityCheck.reason}`);
      return { ingested: 0, enriched: 0, errors: 0 };
    }
    
    // Check if exists in this cluster (skip verbose logging for duplicates)
    const { data: clusterCheck } = await supabase
      .from('repo_cluster_new')
      .select('repo_id')
      .eq('repo_id', repo.id)
      .eq('cluster_slug', clusterSlug)
      .single();
    
    if (clusterCheck) {
      // Don't log every duplicate - too verbose
      return { ingested: 0, enriched: 0, errors: 0 };
    }
    
    const exists = await repoExists(repo.id);
    if (exists) {
      console.log(`  🔄 [Worker ${workerId}] Adding to cluster: ${repo.full_name}`);
      await supabase
        .from('repo_cluster_new')
        .upsert({
          repo_id: repo.id,
          cluster_slug: clusterSlug,
          weight: 1.0,
          confidence_score: 0.9
        }, { onConflict: 'repo_id,cluster_slug' });
      
      const { data: hasComplexity } = await supabase
        .from('repo_complexity')
        .select('repo_id')
        .eq('repo_id', repo.id)
        .single();
      
      if (!hasComplexity) {
        console.log(`  ✨ [Worker ${workerId}] Enriching: ${repo.full_name}`);
        await enrichRepo(repo.id, clusterSlug);
        return { ingested: 0, enriched: 1, errors: 0 };
      }
      return { ingested: 0, enriched: 0, errors: 0 };
    }
    
    // Get full details
    process.stdout.write(`  🔍 [Worker ${workerId}] Fetching: ${repo.full_name.substring(0, 50)}...\r\n`);
    const fullRepo = await getRepoDetailsWithToken(repo, token);
    if (!fullRepo) {
      process.stdout.write(`  ❌ [Worker ${workerId}] Failed: ${repo.full_name}\r\n`);
      return { ingested: 0, enriched: 0, errors: 1 };
    }
    
    // Quality filter check again with full repo data
    const fullQualityCheck = passesQualityFilter(fullRepo);
    if (!fullQualityCheck.pass) {
      process.stdout.write(`  ⚠️  [Worker ${workerId}] Quality filter: ${fullRepo.full_name} - ${fullQualityCheck.reason}\r\n`);
      return { ingested: 0, enriched: 0, errors: 0 };
    }
    
    // Store repo
    process.stdout.write(`  💾 [Worker ${workerId}] Storing: ${fullRepo.full_name} (⭐${fullRepo.stargazers_count || 0})\r\n`);
    if (!(await storeRepo(fullRepo))) {
      process.stdout.write(`  ❌ [Worker ${workerId}] Store failed: ${fullRepo.full_name}\r\n`);
      return { ingested: 0, enriched: 0, errors: 1 };
    }
    
    // Enrich repo
    process.stdout.write(`  ✨ [Worker ${workerId}] Enriching: ${fullRepo.full_name}\r\n`);
    await enrichRepo(fullRepo.id, clusterSlug);
    
    process.stdout.write(`  ✅ [Worker ${workerId}] ✓ ${fullRepo.full_name} | ⭐${fullRepo.stargazers_count || 0} | 📝${fullRepo.language || 'N/A'}\r\n`);
    
    return { ingested: 1, enriched: 1, errors: 0 };
    
  } catch (error) {
    console.log(`  ❌ [Worker ${workerId}] Error processing ${repo.full_name}: ${error.message}`);
    return { ingested: 0, enriched: 0, errors: 1 };
  }
}

async function processRepoBatch(repos, clusterSlug, workerId) {
  // Process repos in parallel within the batch (true parallelism!)
  const promises = repos.map(repo => processSingleRepo(repo, clusterSlug, workerId));
  const results = await Promise.allSettled(promises);
  
  const summary = { ingested: 0, enriched: 0, errors: 0 };
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      summary.ingested += result.value.ingested;
      summary.enriched += result.value.enriched;
      summary.errors += result.value.errors;
    } else {
      summary.errors++;
    }
  }
  
  return summary;
}

// ============================================
// PARALLEL INGESTION
// ============================================

async function ingestCluster(clusterSlug, target) {
  console.log(`\n🎯 Ingesting cluster: ${clusterSlug.toUpperCase()} (${NUM_WORKERS} parallel workers)`);
  console.log(`   Target: ${target} repos`);
  console.log(`   Starting at: ${new Date().toLocaleTimeString()}`);
  console.log(`\n   🔍 Quality Filters:`);
  console.log(`      Min Stars: ${QUALITY_FILTERS.MIN_STARS}`);
  console.log(`      Min Forks: ${QUALITY_FILTERS.MIN_FORKS}`);
  console.log(`      Max Inactive: ${QUALITY_FILTERS.MAX_DAYS_INACTIVE} days`);
  console.log(`      Min Description: ${QUALITY_FILTERS.MIN_DESCRIPTION_LENGTH} chars`);
  console.log(`      Reject Archived: ${QUALITY_FILTERS.REJECT_ARCHIVED}`);
  console.log(`      Reject Forks: ${QUALITY_FILTERS.REJECT_FORKS}\n`);
  
  const tracker = await getCurrentQuotas(clusterSlug);
  const config = CLUSTER_TARGETS[clusterSlug];
  
  console.log(`   Current status: ${tracker.total}/${target} repos`);
  console.log(`   Need: ${target - tracker.total} more repos\n`);
  
  let ingested = 0;
  let attempts = 0;
  let consecutiveFailures = 0;
  let strategyIndex = 0;
  const maxAttempts = 10000;
  const maxConsecutiveFailures = 3; // Switch strategy after 3 consecutive failures (faster switching)
  const seenRepoIds = new Set(); // Track repos we've already checked in this session
  let pageOffset = 1; // Start from different pages to get fresh results
  
  if (tracker.total >= target) {
    console.log(`   ✅ Already at target! Skipping...\n`);
    return;
  }
  
  // Build search strategies - use simpler, more effective queries
  const searchStrategies = [];
  
  // Strategy 1: Simple topic searches (most reliable)
  for (const topic of config.topics) {
    searchStrategies.push({
      query: `topic:${topic}`,
      skillLevel: null,
      starTiers: Object.keys(STAR_TIER_TARGETS),
      minStars: QUALITY_FILTERS.MIN_STARS,
      maxStars: 10000
    });
  }
  
  // Strategy 2: Topic + language (reliable)
  for (const [lang, langConfig] of Object.entries(LANGUAGE_TARGETS)) {
    if (lang === 'other') continue;
    for (const topic of config.topics.slice(0, 3)) {
      searchStrategies.push({
        query: `topic:${topic} language:${lang}`,
        skillLevel: null,
        starTiers: Object.keys(STAR_TIER_TARGETS),
        language: lang,
        minStars: QUALITY_FILTERS.MIN_STARS,
        maxStars: 10000
      });
    }
  }
  
  // Strategy 3: Star tier searches
  for (const [tier, tierConfig] of Object.entries(STAR_TIER_TARGETS)) {
    for (const topic of config.topics.slice(0, 2)) {
      const minStars = Math.max(tierConfig.min, QUALITY_FILTERS.MIN_STARS);
      searchStrategies.push({
        query: `topic:${topic}`,
        skillLevel: null,
        starTiers: [tier],
        minStars: minStars,
        maxStars: tierConfig.max
      });
    }
  }
  
  // Strategy 4: Simple keyword searches (fallback)
  for (const topic of config.topics.slice(0, 3)) {
    searchStrategies.push({
      query: topic,
      skillLevel: null,
      starTiers: Object.keys(STAR_TIER_TARGETS),
      minStars: QUALITY_FILTERS.MIN_STARS,
      maxStars: 10000
    });
  }
  
  // Strategy 5: More diverse searches with different star ranges
  for (const topic of config.topics.slice(0, 2)) {
    // Low stars (0-50)
    searchStrategies.push({
      query: `topic:${topic}`,
      skillLevel: null,
      starTiers: ['tier1'],
      minStars: 0,
      maxStars: 50
    });
    // Medium stars (50-500)
    searchStrategies.push({
      query: `topic:${topic}`,
      skillLevel: null,
      starTiers: ['tier2'],
      minStars: 50,
      maxStars: 500
    });
    // High stars (500-5000)
    searchStrategies.push({
      query: `topic:${topic}`,
      skillLevel: null,
      starTiers: ['tier3'],
      minStars: 500,
      maxStars: 5000
    });
  }
  
  // Strategy 6: Sort by recently updated to find fresh repos
  for (const topic of config.topics.slice(0, 2)) {
    searchStrategies.push({
      query: `topic:${topic} pushed:>2024-01-01`,
      skillLevel: null,
      starTiers: Object.keys(STAR_TIER_TARGETS),
      minStars: QUALITY_FILTERS.MIN_STARS,
      maxStars: 10000
    });
  }
  
  // Shuffle for diversity
  searchStrategies.sort(() => Math.random() - 0.5);
  
  while (tracker.total < target && attempts < maxAttempts) {
    attempts++;
    
    // Find strategy - try to match quotas, but fallback quickly
    let strategy = null;
    
    // Try to find strategy matching quotas (but don't spend too long)
    if (consecutiveFailures < 2) {
      const skillQuota = tracker.getSkillLevelQuota();
      const starQuota = tracker.getStarTierQuota();
      const langQuota = tracker.getLanguageQuota();
      
      for (let i = 0; i < Math.min(5, searchStrategies.length); i++) {
        const idx = (strategyIndex + i) % searchStrategies.length;
        const s = searchStrategies[idx];
        
        if (s.language && langQuota[s.language] > 0) {
          strategy = s;
          strategyIndex = (idx + 1) % searchStrategies.length;
          break;
        }
        if (s.starTiers && s.starTiers.some(t => starQuota[t] > 0)) {
          strategy = s;
          strategyIndex = (idx + 1) % searchStrategies.length;
          break;
        }
      }
    }
    
    // Fallback to next strategy in rotation
    if (!strategy) {
      strategy = searchStrategies[strategyIndex];
      strategyIndex = (strategyIndex + 1) % searchStrategies.length;
    }
    
    const minStars = strategy.minStars || QUALITY_FILTERS.MIN_STARS;
    const maxStars = strategy.maxStars || 10000;
    
    // Use progressive pagination to find new repos - start deeper in results
    const currentPage = pageOffset + Math.floor(attempts / 3); // Progressively go deeper
    console.log(`  🔎 Searching: "${strategy.query}" (stars: ${minStars}-${maxStars}, page: ${currentPage})`);
    
    const token = tokenPool.getAvailableToken();
    if (!token) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    
    const searchResult = await searchReposByQueryWithToken(strategy.query, minStars, maxStars, currentPage, token);
    
    // If no results and this is page 1, the query itself doesn't work - skip immediately
    if (searchResult.repos.length === 0 && currentPage === 1) {
      consecutiveFailures++;
      console.log(`  ⚠️  Query "${strategy.query}" returned 0 results - skipping immediately (failures: ${consecutiveFailures}/${maxConsecutiveFailures})`);
      
      // Switch strategy immediately
      if (consecutiveFailures >= maxConsecutiveFailures) {
        console.log(`  🔄 Switching to next strategy after ${consecutiveFailures} failures...`);
        consecutiveFailures = 0;
        // Try simpler query without language filter as fallback
        if (strategy.query.includes('language:')) {
          const simpleQuery = strategy.query.replace(/\s+language:\w+/g, '');
          console.log(`  🔄 Trying simpler query: "${simpleQuery}"`);
          strategy.query = simpleQuery;
          strategy.language = null; // Remove language constraint
        } else {
          // Move to next strategy
          strategyIndex = (strategyIndex + 1) % searchStrategies.length;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      continue;
    }
    
    // If we got results, process them
    const allRepos = searchResult.repos || [];
    
    if (allRepos.length === 0) {
      // No results on this page, but query might work - try next page or next strategy
      if (!searchResult.hasMore || currentPage >= 10) {
        consecutiveFailures++;
        console.log(`  ⚠️  No more results for "${strategy.query}" (failures: ${consecutiveFailures}/${maxConsecutiveFailures})`);
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(`  🔄 Switching to next strategy...`);
          consecutiveFailures = 0;
          strategyIndex = (strategyIndex + 1) % searchStrategies.length;
          pageOffset = Math.floor(Math.random() * 5) + 1; // Random starting page for new strategy
          attempts = 0; // Reset page counter for new strategy
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      continue;
    }
    
    // Reset failure counter on success
    consecutiveFailures = 0;
    
    // Remove duplicates and repos we've already seen in this session
    const newRepos = allRepos.filter(r => !seenRepoIds.has(r.id));
    const uniqueRepos = Array.from(new Map(newRepos.map(r => [r.id, r])).values());
    
    // Mark all repos as seen (even duplicates) to avoid checking them again
    allRepos.forEach(r => seenRepoIds.add(r.id));
    
    if (uniqueRepos.length === 0) {
      console.log(`  ⏭️  All ${allRepos.length} repos already seen, trying next page...`);
      pageOffset++;
      await new Promise(resolve => setTimeout(resolve, 200));
      continue;
    }
    
    console.log(`  📦 Found ${uniqueRepos.length} new repos (${allRepos.length - uniqueRepos.length} duplicates skipped), processing in ${NUM_WORKERS} parallel batches...`);
    
    // Process in parallel batches
    const batchSize = Math.ceil(uniqueRepos.length / NUM_WORKERS);
    const batches = [];
    
    for (let i = 0; i < uniqueRepos.length; i += batchSize) {
      batches.push(uniqueRepos.slice(i, i + batchSize));
    }
    
    // Process batches in parallel
    const processPromises = batches.map((batch, idx) => 
      processRepoBatch(batch, clusterSlug, idx + 1)
    );
    
    const batchResults = await Promise.allSettled(processPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        ingested += result.value.ingested;
        tracker.total += result.value.ingested;
        if (result.value.ingested > 0) {
          console.log(`  📊 Batch complete: +${result.value.ingested} new repos | Total: ${tracker.total}/${target}`);
        }
      }
    }
    
    // Show summary every 10 repos
    if (ingested % 10 === 0 && ingested > 0) {
      const status = tracker.getStatus();
      console.log(`\n  📈 Progress Summary:`);
      console.log(`     Ingested: ${ingested} | Total: ${tracker.total}/${target} (${((tracker.total/target)*100).toFixed(1)}%)`);
      console.log(`     Skill: B:${status.skillLevels.beginner} I:${status.skillLevels.intermediate} A:${status.skillLevels.advanced} Inf:${status.skillLevels.infrastructure}`);
      console.log(`     Stars: T1:${status.starTiers.tier1} T2:${status.starTiers.tier2} T3:${status.starTiers.tier3} T4:${status.starTiers.tier4}`);
      console.log(`     Gems: ${status.gems}\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const finalStatus = tracker.getStatus();
  console.log(`\n   ✅ Cluster ${clusterSlug}: Ingested ${ingested} repos`);
  console.log(`   📊 Final: ${tracker.total}/${target}\n`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const clusterArg = args.find(arg => arg.startsWith('--cluster'));
  const cluster = clusterArg ? clusterArg.split('=')[1] : 'all';
  
  console.log('🚀 Parallel Balanced Multi-Dimensional Ingestion System');
  console.log(`   Workers: ${NUM_WORKERS}`);
  console.log(`   API Keys: ${GITHUB_TOKENS.length}`);
  console.log(`   Cluster: ${cluster}\n`);
  
  // Force output to show immediately
  process.stdout.write('');
  
  try {
    if (cluster === 'all') {
      console.log('📋 Processing all clusters...\n');
      for (const [clusterSlug, config] of Object.entries(CLUSTER_TARGETS)) {
        console.log(`\n🔍 Checking cluster: ${clusterSlug}...`);
        const tracker = await getCurrentQuotas(clusterSlug);
        console.log(`   Current: ${tracker.total}/${config.target}`);
        
        if (tracker.total >= config.target) {
          console.log(`   ⏭️  Skipping ${clusterSlug}: Already at target (${tracker.total}/${config.target})`);
          continue;
        }
        
        console.log(`   ✅ Starting ingestion for ${clusterSlug}...\n`);
        await ingestCluster(clusterSlug, config.target);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else if (CLUSTER_TARGETS[cluster]) {
      console.log(`📋 Processing cluster: ${cluster}\n`);
      await ingestCluster(cluster, CLUSTER_TARGETS[cluster].target);
    } else {
      console.log(`❌ Unknown cluster: ${cluster}`);
      console.log(`Available clusters: ${Object.keys(CLUSTER_TARGETS).join(', ')}`);
      process.exit(1);
    }
    
    console.log('\n✨ Parallel ingestion complete!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Enhanced error handling - never crash, always retry
main().catch((error) => {
  console.error('\n❌ Fatal error caught:', error.message);
  console.error('Stack:', error.stack);
  console.log('\n🔄 Restarting ingestion in 10 seconds...\n');
  
  // Auto-restart after 10 seconds
  setTimeout(() => {
    console.log('🔄 Restarting...\n');
    main().catch((err) => {
      console.error('❌ Restart failed:', err.message);
      // Try one more time after 30 seconds
      setTimeout(() => {
        console.log('🔄 Final restart attempt...\n');
        main().catch(console.error);
      }, 30000);
    });
  }, 10000);
});
