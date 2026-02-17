/**
 * Update Trending Repos Table (Daily/Weekly)
 * 
 * This script:
 * 1. Fetches trending repos from GitHub
 * 2. Checks if they're underrated gems
 * 3. Deletes OLD entries for the period
 * 4. Inserts NEW trending repos
 * 5. Auto-cleans old data
 * 
 * Usage:
 *   node update-trending-repos.js --period=daily
 *   node update-trending-repos.js --period=weekly
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GitHub API token pool
// Note: Can't use GITHUB_TOKENS in GitHub Actions (reserved prefix)
const tokenString = process.env.GH_API_TOKENS || process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || '';
const GITHUB_TOKENS = tokenString.split(',').map(t => t.trim()).filter(Boolean);

if (GITHUB_TOKENS.length === 0) {
  console.error('❌ No GitHub tokens found. Set GITHUB_TOKENS in .env');
  process.exit(1);
}

let currentTokenIndex = 0;
function getToken() {
  const token = GITHUB_TOKENS[currentTokenIndex];
  currentTokenIndex = (currentTokenIndex + 1) % GITHUB_TOKENS.length;
  return token;
}

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 60000
});

function getDateKey(periodType) {
  const now = new Date();
  if (periodType === 'daily') {
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (periodType === 'weekly') {
    // Get start of week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }
  return null;
}

async function fetchGitHubAPI(endpoint, retries = 3) {
  const token = getToken();
  const url = `https://api.github.com${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Trending-Updater',
    'Authorization': `token ${token}`
  };
  
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        headers,
        agent: httpsAgent,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
          if (waitTime > 0) {
            console.log(`  ⏳ Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (i === retries - 1) {
        console.error(`  ❌ Error:`, error.message);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  return null;
}

async function searchTrendingRepos(periodType) {
  const daysBack = periodType === 'daily' ? 1 : 7;
  const dateStr = new Date();
  dateStr.setDate(dateStr.getDate() - daysBack);
  const sinceDate = dateStr.toISOString().split('T')[0];
  
  const searchStrategies = [
    { query: `pushed:>${sinceDate} stars:>20 sort:stars`, desc: 'Recently active' },
    { query: `created:>${sinceDate} stars:>10 sort:stars`, desc: 'New repos' },
    { query: `pushed:>${sinceDate} forks:>5 stars:>15 sort:updated`, desc: 'Active with forks' }
  ];
  
  const allRepos = new Map();
  
  for (const strategy of searchStrategies) {
    console.log(`  🔍 ${strategy.desc}...`);
    
    let page = 1;
    const maxPages = 5;
    
    while (page <= maxPages && allRepos.size < 1000) {
      const endpoint = `/search/repositories?q=${encodeURIComponent(strategy.query)}&per_page=100&page=${page}`;
      const data = await fetchGitHubAPI(endpoint);
      
      if (!data || !data.items) break;
      
      data.items.forEach(repo => {
        if (!allRepos.has(repo.id)) {
          allRepos.set(repo.id, repo);
        }
      });
      
      if (data.items.length < 100) break;
      page++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return Array.from(allRepos.values())
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 500);
}

async function checkIfGem(repoId) {
  const { data } = await supabase
    .from('repo_gems')
    .select('repo_id')
    .eq('repo_id', repoId)
    .single();
  
  return !!data;
}

async function getRepoCluster(repoId) {
  const { data } = await supabase
    .from('repo_cluster_new')
    .select('cluster_slug, weight')
    .eq('repo_id', repoId)
    .order('weight', { ascending: false })
    .limit(1)
    .single();
  
  return data?.cluster_slug || null;
}

async function calculateTrendingScore(repoId) {
  const { data: repo } = await supabase
    .from('repos_master')
    .select(`
      repo_id,
      stars,
      repo_activity (
        activity_score,
        freshness_score,
        commits_30_days,
        commits_90_days
      ),
      repo_health (
        health_score
      )
    `)
    .eq('repo_id', repoId)
    .single();
  
  if (!repo) return null;
  
  const activity = repo.repo_activity?.[0];
  const health = repo.repo_health?.[0];
  
  const activityScore = activity?.activity_score || 0;
  const freshnessScore = activity?.freshness_score || 0;
  
  const estimatedStarVelocity = (activityScore * 0.6 + freshnessScore * 0.4) * 100;
  const commitVelocity = (activity?.commits_30_days || 0) / 30;
  
  const trendingScore = (
    Math.min(estimatedStarVelocity / 100, 1.0) * 0.5 +
    Math.min(commitVelocity / 10, 1.0) * 0.2 +
    (health?.health_score || 0.5) * 0.2 +
    (freshnessScore || 0.5) * 0.1
  );
  
  return {
    star_velocity: estimatedStarVelocity,
    trending_score: trendingScore
  };
}

async function ensureRepoExists(repo) {
  // Check if exists
  const { data: existing } = await supabase
    .from('repos_master')
    .select('repo_id')
    .eq('repo_id', repo.id)
    .single();
  
  if (existing) {
    return true; // Already exists
  }
  
  // Store new repo
  const repoData = {
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
    last_commit_at: repo.pushed_at,
    archived: repo.archived || false,
    license: repo.license?.name,
    default_branch: repo.default_branch,
    visibility: repo.visibility || 'public',
    contributors_count: 0
  };
  
  const { error } = await supabase
    .from('repos_master')
    .upsert(repoData, { onConflict: 'repo_id' });
  
  if (error) {
    console.error(`  ❌ Error storing ${repo.full_name}:`, error.message);
    return false;
  }
  
  // Quick enrich (basic activity/health)
  const lastCommitAt = repo.pushed_at || repo.updated_at;
  const daysInactive = lastCommitAt ? 
    (Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24) : 999;
  
  const freshnessScore = daysInactive <= 30 ? 1.0 :
    daysInactive <= 90 ? 0.85 :
    daysInactive <= 180 ? 0.65 :
    daysInactive <= 365 ? 0.45 : 0.25;
  
  const activityScore = freshnessScore * 0.6;
  const communityScore = Math.min((repo.stargazers_count / 100000 + repo.forks_count / 10000) / 2, 1.0);
  const healthScore = (
    activityScore * 0.25 +
    communityScore * 0.20 +
    0.7 * 0.15 +
    (repo.description ? 0.8 : 0.3) * 0.10 +
    0.5 * 0.10
  );
  
  await supabase
    .from('repo_activity')
    .upsert({
      repo_id: repo.id,
      last_commit_at: lastCommitAt,
      freshness_score: freshnessScore,
      activity_score: activityScore
    }, { onConflict: 'repo_id' });
  
  await supabase
    .from('repo_health')
    .upsert({
      repo_id: repo.id,
      activity_score: activityScore,
      community_score: communityScore,
      health_score: healthScore
    }, { onConflict: 'repo_id' });
  
  return true;
}

async function main() {
  const periodArg = process.argv.find(arg => arg.startsWith('--period='));
  const period = periodArg ? periodArg.split('=')[1] : 'daily';
  
  if (!['daily', 'weekly'].includes(period)) {
    console.error('❌ Period must be "daily" or "weekly"');
    process.exit(1);
  }
  
  console.log(`\n🔥 Updating ${period.toUpperCase()} Trending Repos\n`);
  console.log('='.repeat(60));
  
  const periodDate = getDateKey(period);
  console.log(`📅 Period: ${period}`);
  console.log(`📅 Date: ${periodDate}\n`);
  
  // STEP 1: Delete OLD entries for this period
  console.log('🗑️  Deleting old entries for this period...');
  const { error: deleteError } = await supabase
    .from('trending_repos')
    .delete()
    .eq('period_type', period)
    .eq('period_date', periodDate);
  
  if (deleteError) {
    console.error('  ❌ Error deleting old entries:', deleteError);
  } else {
    console.log('  ✅ Old entries deleted\n');
  }
  
  // STEP 2: Fetch trending repos from GitHub
  console.log('🔍 Fetching trending repos from GitHub...\n');
  const trendingRepos = await searchTrendingRepos(period);
  
  if (!trendingRepos || trendingRepos.length === 0) {
    console.log('⚠️  No trending repos found');
    return;
  }
  
  console.log(`\n✅ Found ${trendingRepos.length} trending repos\n`);
  
  // STEP 3: Filter for underrated gems and process
  console.log('💎 Filtering for underrated gems...\n');
  
  const gemsToInsert = [];
  let processed = 0;
  let gemsFound = 0;
  let newRepos = 0;
  
  for (const repo of trendingRepos) {
    process.stdout.write(`  [${processed + 1}/${trendingRepos.length}] Checking ${repo.full_name.substring(0, 50)}...\r`);
    
    // Ensure repo exists in database
    const exists = await ensureRepoExists(repo);
    if (!exists) {
      newRepos++;
    }
    
    // Check if it's a gem (or check criteria)
    const isGem = await checkIfGem(repo.id);
    
    // Also check if it meets gem criteria (in case not in repo_gems yet)
    const meetsCriteria = (
      repo.stargazers_count < 1000 &&
      repo.stargazers_count >= 10 &&
      repo.description &&
      repo.description.length > 10
    );
    
    if (isGem || meetsCriteria) {
      // Get cluster
      let clusterSlug = await getRepoCluster(repo.id);
      
      // If no cluster, try to detect from topics/description
      if (!clusterSlug) {
        const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
        const clusters = {
          'ai_ml': ['machine-learning', 'ai', 'tensorflow', 'pytorch'],
          'web_dev': ['web', 'frontend', 'backend', 'react', 'vue'],
          'devops': ['devops', 'docker', 'kubernetes'],
          'data_science': ['data-science', 'pandas', 'jupyter'],
          'mobile': ['mobile', 'ios', 'android', 'flutter'],
          'automation': ['automation', 'bot', 'workflow'],
          'cybersecurity': ['security', 'cybersecurity'],
          'blockchain': ['blockchain', 'crypto', 'web3'],
          'game_dev': ['game', 'unity', 'unreal'],
          'open_source_tools': ['tool', 'utility', 'cli']
        };
        
        for (const [slug, keywords] of Object.entries(clusters)) {
          if (keywords.some(kw => text.includes(kw))) {
            clusterSlug = slug;
            break;
          }
        }
        
        // Default cluster if none found
        if (!clusterSlug) {
          clusterSlug = 'open_source_tools';
        }
      }
      
      // Calculate trending score
      const scoreData = await calculateTrendingScore(repo.id);
      
      if (scoreData && scoreData.trending_score > 0) {
        gemsToInsert.push({
          repo_id: repo.id,
          period_type: period,
          period_date: periodDate,
          trending_score: scoreData.trending_score,
          star_velocity: scoreData.star_velocity,
          cluster_slug: clusterSlug
        });
        
        gemsFound++;
      }
    }
    
    processed++;
    
    if (processed % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n\n✅ Processing complete!\n`);
  console.log(`  💎 Underrated gems found: ${gemsFound}`);
  console.log(`  📥 New repos ingested: ${newRepos}\n`);
  
  // STEP 4: Sort by trending score and assign ranks
  gemsToInsert.sort((a, b) => b.trending_score - a.trending_score);
  gemsToInsert.forEach((item, index) => {
    item.rank = index + 1;
  });
  
  // STEP 5: Insert new trending repos
  if (gemsToInsert.length > 0) {
    console.log(`💾 Inserting ${gemsToInsert.length} trending gems...`);
    
    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < gemsToInsert.length; i += batchSize) {
      const batch = gemsToInsert.slice(i, i + batchSize);
      const { error } = await supabase
        .from('trending_repos')
        .insert(batch);
      
      if (error) {
        console.error(`  ❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
      }
    }
    
    console.log(`  ✅ Inserted ${gemsToInsert.length} trending gems\n`);
  }
  
  // STEP 6: Clean up OLD entries (keep only last 7 days for daily, last 4 weeks for weekly)
  console.log('🧹 Cleaning up old entries...');
  const cutoffDate = new Date();
  if (period === 'daily') {
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep last 7 days
  } else {
    cutoffDate.setDate(cutoffDate.getDate() - 28); // Keep last 4 weeks
  }
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  const { error: cleanupError } = await supabase
    .from('trending_repos')
    .delete()
    .eq('period_type', period)
    .lt('period_date', cutoffDateStr);
  
  if (cleanupError) {
    console.error('  ❌ Error cleaning up:', cleanupError);
  } else {
    console.log(`  ✅ Cleaned up entries older than ${cutoffDateStr}\n`);
  }
  
  console.log('='.repeat(60));
  console.log('🎉 Trending Repos Update Complete!\n');
  console.log(`📊 Summary:`);
  console.log(`  📥 New repos: ${newRepos}`);
  console.log(`  💎 Gems found: ${gemsFound}`);
  console.log(`  🔥 Trending gems stored: ${gemsToInsert.length}`);
  console.log(`\n💡 Query with: get_trending_gems('${period}', 'cluster_name')`);
}

main().catch(console.error);
