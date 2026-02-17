/**
 * Fetch Daily/Weekly Trending Repos from GitHub
 * 
 * This script:
 * 1. Fetches trending repos from GitHub (by stars gained in period)
 * 2. Checks if they're already in repos_master
 * 3. If not, ingests them
 * 4. Checks if they qualify as underrated gems
 * 5. Calculates and stores trending scores
 * 
 * Usage:
 *   node fetch-daily-trending.js --period=daily
 *   node fetch-daily-trending.js --period=weekly
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GitHub API token pool
const tokenString = process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || '';
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

// HTTPS agent for GitHub API
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
    'User-Agent': 'Repoverse-Trending-Fetcher',
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (i === retries - 1) {
        console.error(`  ❌ Error fetching ${endpoint}:`, error.message);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  return null;
}

async function searchTrendingRepos(periodType, language = null) {
  const daysBack = periodType === 'daily' ? 1 : 7;
  const dateStr = new Date();
  dateStr.setDate(dateStr.getDate() - daysBack);
  const sinceDate = dateStr.toISOString().split('T')[0];
  
  // Multiple search strategies to find trending repos
  const searchStrategies = [
    // Strategy 1: Recently pushed repos with good star count (most likely trending)
    {
      query: `pushed:>${sinceDate} stars:>20 sort:stars`,
      description: 'Recently active repos with stars'
    },
    // Strategy 2: New repos created in period that gained traction
    {
      query: `created:>${sinceDate} stars:>10 sort:stars`,
      description: 'New repos gaining stars'
    },
    // Strategy 3: Repos with recent activity and forks (indicates interest)  
    {
      query: `pushed:>${sinceDate} forks:>5 stars:>15 sort:updated`,
      description: 'Active repos with forks'
    }
  ];
  
  const allRepos = new Map(); // Use Map to deduplicate by repo ID
  
  for (const strategy of searchStrategies) {
    console.log(`  🔍 Strategy: ${strategy.description}`);
    console.log(`     Query: ${strategy.query}`);
    
    if (language) {
      strategy.query += ` language:${language}`;
    }
    
    let page = 1;
    const maxPages = 5; // Get top 500 repos per strategy
    
    while (page <= maxPages && allRepos.size < 1000) {
      const endpoint = `/search/repositories?q=${encodeURIComponent(strategy.query)}&per_page=100&page=${page}`;
      const data = await fetchGitHubAPI(endpoint);
      
      if (!data || !data.items) {
        break;
      }
      
      // Add to map (deduplicates by ID)
      data.items.forEach(repo => {
        if (!allRepos.has(repo.id)) {
          allRepos.set(repo.id, repo);
        }
      });
      
      console.log(`     📦 Page ${page}: Found ${data.items.length} repos (unique total: ${allRepos.size})`);
      
      if (data.items.length < 100) {
        break; // Last page
      }
      
      page++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit friendly
    }
    
    console.log('');
  }
  
  // Convert map to array and sort by stars (most trending first)
  const repos = Array.from(allRepos.values())
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 500); // Top 500 trending repos
  
  return repos;
}

async function checkIfRepoExists(repoId) {
  const { data } = await supabase
    .from('repos_master')
    .select('repo_id')
    .eq('repo_id', repoId)
    .single();
  
  return !!data;
}

async function storeRepo(repo) {
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
    contributors_count: 0 // Will be fetched later if needed
  };
  
  const { error } = await supabase
    .from('repos_master')
    .upsert(repoData, { onConflict: 'repo_id' });
  
  if (error) {
    console.error(`  ❌ Error storing ${repo.full_name}:`, error.message);
    return false;
  }
  
  return true;
}

async function enrichRepo(repoId) {
  // Get repo data
  const { data: repo } = await supabase
    .from('repos_master')
    .select('*')
    .eq('repo_id', repoId)
    .single();
  
  if (!repo) return;
  
  // Use the enrichment logic from enrich-all-repos.js
  // For now, just ensure it has basic enrichment
  const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  
  // Calculate activity
  const lastCommitAt = repo.pushed_at || repo.updated_at;
  const daysInactive = lastCommitAt ? 
    (Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24) : 999;
  
  const freshnessScore = daysInactive <= 30 ? 1.0 :
    daysInactive <= 90 ? 0.85 :
    daysInactive <= 180 ? 0.65 :
    daysInactive <= 365 ? 0.45 : 0.25;
  
  // Store activity
  await supabase
    .from('repo_activity')
    .upsert({
      repo_id: repoId,
      last_commit_at: lastCommitAt,
      commits_30_days: 0,
      commits_90_days: 0,
      commit_velocity: 0,
      freshness_score: freshnessScore,
      activity_score: freshnessScore * 0.6
    }, { onConflict: 'repo_id' });
  
  // Calculate health
  const activityScore = freshnessScore * 0.6;
  const communityScore = Math.min((repo.stars / 100000 + repo.forks / 10000) / 2, 1.0);
  const maintenanceScore = Math.min(activityScore + (1 - Math.min((repo.open_issues || 0) / 100, 1.0)) * 0.3, 1.0);
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
  
  // Check if it's a gem
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
  
  if (health && activity) {
    const stars = repo.stars || 0;
    const contributors = repo.contributors_count || 0;
    
    const isGem = (
      stars < 1000 &&
      health.health_score > 0.8 &&
      activity.freshness_score > 0.7 &&
      health.documentation_score > 0.7 &&
      contributors > 3
    );
    
    if (isGem) {
      const gemScore = (
        (health.health_score * 0.3) +
        (activity.freshness_score * 0.3) +
        (health.documentation_score * 0.2) +
        (Math.min(contributors / 10, 1.0) * 0.2)
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
            contributors: contributors
          }
        }, { onConflict: 'repo_id' });
    }
  }
}

async function calculateTrendingScore(repoId, periodType, periodDate) {
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
  
  // Estimate star velocity
  const estimatedStarVelocity = (activityScore * 0.6 + freshnessScore * 0.4) * 100;
  const commitVelocity = periodType === 'daily' 
    ? (activity?.commits_30_days || 0) / 30 
    : (activity?.commits_90_days || 0) / 90;
  
  const trendingScore = (
    Math.min(estimatedStarVelocity / 100, 1.0) * 0.5 +
    Math.min(commitVelocity / 10, 1.0) * 0.2 +
    (health?.health_score || 0.5) * 0.2 +
    (freshnessScore || 0.5) * 0.1
  );
  
  return {
    repo_id: repoId,
    period_type: periodType,
    period_date: periodDate,
    star_velocity: estimatedStarVelocity,
    commit_velocity: commitVelocity,
    trending_score: trendingScore
  };
}

async function main() {
  const periodArg = process.argv.find(arg => arg.startsWith('--period='));
  const period = periodArg ? periodArg.split('=')[1] : 'daily';
  
  if (!['daily', 'weekly'].includes(period)) {
    console.error('❌ Period must be "daily" or "weekly"');
    process.exit(1);
  }
  
  console.log(`\n🔥 Fetching ${period} Trending Repos from GitHub\n`);
  console.log('='.repeat(60));
  
  const periodDate = getDateKey(period);
  console.log(`📅 Period: ${period}`);
  console.log(`📅 Date: ${periodDate}\n`);
  
  // Fetch trending repos
  console.log('🔍 Searching GitHub for trending repos...\n');
  const trendingRepos = await searchTrendingRepos(period);
  
  if (!trendingRepos || trendingRepos.length === 0) {
    console.log('⚠️  No trending repos found');
    return;
  }
  
  console.log(`\n✅ Found ${trendingRepos.length} trending repos from GitHub\n`);
  
  // Process repos
  let newRepos = 0;
  let existingRepos = 0;
  let gemsFound = 0;
  const trendingScores = [];
  
  console.log('📦 Processing repos...\n');
  
  for (let i = 0; i < trendingRepos.length; i++) {
    const repo = trendingRepos[i];
    
    process.stdout.write(`  [${i + 1}/${trendingRepos.length}] ${repo.full_name.substring(0, 50)}...\r`);
    
    // Check if exists
    const exists = await checkIfRepoExists(repo.id);
    
    if (!exists) {
      // Store new repo
      const stored = await storeRepo(repo);
      if (stored) {
        newRepos++;
        // Enrich it
        await enrichRepo(repo.id);
      }
    } else {
      existingRepos++;
    }
    
    // Calculate trending score
    const score = await calculateTrendingScore(repo.id, period, periodDate);
    if (score && score.trending_score > 0) {
      trendingScores.push(score);
    }
    
    // Check if it's a gem
    const { data: gem } = await supabase
      .from('repo_gems')
      .select('repo_id')
      .eq('repo_id', repo.id)
      .single();
    
    if (gem) {
      gemsFound++;
    }
    
    // Rate limit friendly
    if ((i + 1) % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n\n✅ Processing complete!\n`);
  
  // Store trending scores
  if (trendingScores.length > 0) {
    // Sort and rank
    trendingScores.sort((a, b) => b.trending_score - a.trending_score);
    trendingScores.forEach((score, index) => {
      score.rank = index + 1;
    });
    
    console.log(`💾 Storing ${trendingScores.length} trending scores...`);
    const { error } = await supabase
      .from('repo_trending_scores')
      .upsert(trendingScores, { 
        onConflict: 'repo_id,period_type,period_date'
      });
    
    if (error) {
      console.error('  ❌ Error storing trending scores:', error);
    } else {
      console.log(`  ✅ Stored trending scores\n`);
    }
  }
  
  console.log('='.repeat(60));
  console.log('📊 Summary:\n');
  console.log(`  📥 New repos ingested: ${newRepos}`);
  console.log(`  ✅ Existing repos: ${existingRepos}`);
  console.log(`  💎 Underrated gems found: ${gemsFound}`);
  console.log(`  🔥 Trending scores calculated: ${trendingScores.length}`);
  console.log(`\n💡 Run daily/weekly to keep trending data fresh!`);
}

main().catch(console.error);
