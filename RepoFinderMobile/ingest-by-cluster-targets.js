/**
 * Cluster-Targeted Ingestion Script
 * Ingests repos to meet target counts per cluster
 * 
 * Usage:
 *   node ingest-by-cluster-targets.js --cluster=all
 *   node ingest-by-cluster-targets.js --cluster=ai_ml
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

// Fix SSL certificate issues (for corporate proxies)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Only use in development/behind corporate proxy
  keepAlive: true,
  timeout: 60000 // 60 second timeout
});

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'YOUR_SERVICE_ROLE_KEY';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Warn if using anon key (may have permission issues)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️  WARNING: Using SUPABASE_ANON_KEY. For ingestion, SUPABASE_SERVICE_ROLE_KEY is recommended.');
  console.warn('   Get it from: Supabase Dashboard > Settings > API > service_role key\n');
}

// Cluster targets (weighted distribution)
const CLUSTER_TARGETS = {
  'ai_ml': { target: 3000, topics: ['machine-learning', 'artificial-intelligence', 'deep-learning', 'neural-network', 'tensorflow', 'pytorch'] },
  'web_dev': { target: 3000, topics: ['web-development', 'frontend', 'backend', 'react', 'vue', 'angular', 'nextjs'] },
  'devops': { target: 2500, topics: ['devops', 'docker', 'kubernetes', 'infrastructure', 'ci-cd', 'terraform'] },
  'data_science': { target: 2000, topics: ['data-science', 'data-analysis', 'pandas', 'jupyter', 'analytics', 'data-visualization'] },
  'mobile': { target: 2000, topics: ['mobile', 'ios', 'android', 'flutter', 'react-native', 'mobile-app'] },
  'automation': { target: 1500, topics: ['automation', 'bot', 'workflow', 'task-automation', 'scheduler'] },
  'cybersecurity': { target: 1500, topics: ['security', 'cybersecurity', 'encryption', 'authentication', 'vulnerability'] },
  'blockchain': { target: 1500, topics: ['blockchain', 'crypto', 'ethereum', 'web3', 'solidity', 'defi'] },
  'game_dev': { target: 1200, topics: ['game-development', 'gaming', 'unity', 'unreal-engine', 'game-engine'] },
  'open_source_tools': { target: 1300, topics: ['tool', 'utility', 'cli', 'developer-tools', 'productivity'] }
};

const EXCLUDED_ORGS = [
  'facebook', 'google', 'microsoft', 'apple', 'amazon', 'netflix',
  'uber', 'airbnb', 'twitter', 'meta', 'alibaba', 'tencent'
];

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
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
      // Handle timeout/connection errors
      if (error.name === 'AbortError' || error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message?.includes('timeout')) {
        if (i < retries - 1) {
          const waitTime = 5000 * (i + 1); // Exponential backoff
          console.log(`  ⏳ Connection timeout. Retrying in ${waitTime/1000}s... (attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

// Check current count for cluster
async function getClusterCount(clusterSlug) {
  const { count, error } = await supabase
    .from('repo_cluster_new')
    .select('*', { count: 'exact', head: true })
    .eq('cluster_slug', clusterSlug);
  
  if (error) {
    console.error(`Error counting cluster ${clusterSlug}:`, error);
    return 0;
  }
  
  return count || 0;
}

// Check if repo exists
async function repoExists(repoId) {
  const { data } = await supabase
    .from('repos_master')
    .select('repo_id')
    .eq('repo_id', repoId)
    .single();
  
  return data !== null;
}

// Search repos by topic
async function searchReposByTopic(topic, minStars = 50, maxStars = 5000, page = 1, perPage = 100) {
  // Broader date range to find more repos
  const dateCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const query = `topic:${topic} stars:${minStars}..${maxStars} pushed:>${dateCutoff}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&page=${page}&per_page=${perPage}`;
  
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Ingestion'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
  
  try {
    const response = await fetch(url, { 
      headers,
      agent: httpsAgent,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    
    if (!data.items) return { repos: [], total: 0 };
    
    // Filter out major orgs and existing repos
    const filtered = [];
    for (const repo of data.items) {
      const owner = repo.owner.login.toLowerCase();
      
      if (EXCLUDED_ORGS.some(org => owner.includes(org))) {
        continue;
      }
      
      const exists = await repoExists(repo.id);
      if (exists) continue;
      
      // Quality filters
      if (!repo.description || repo.description.length < 15) continue;
      
      const lastPush = new Date(repo.pushed_at);
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      if (lastPush < sixMonthsAgo) continue;
      
      filtered.push(repo);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return { repos: filtered, total: data.total_count };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message?.includes('timeout')) {
      console.log(`  ⚠️  Connection timeout searching ${topic}. Will retry on next page...`);
      return { repos: [], total: 0 }; // Return empty to continue
    }
    throw error;
  }
}

// Ingest repo using the main pipeline
async function ingestRepo(repo) {
  try {
    // Fetch latest commit (with error handling)
    let lastCommitAt = null;
    try {
      const commits = await fetchGitHubAPI(`/repos/${repo.full_name}/commits?per_page=1`);
      lastCommitAt = commits && commits[0] ? commits[0].commit.committer.date : null;
    } catch (error) {
      // If commit fetch fails, continue without it
      // console.log(`  ⚠️  Could not fetch commits for ${repo.full_name}, continuing...`);
    }
    
    // Fetch contributors count (optional - can be calculated later in enrichment)
    // For now, skip to avoid rate limits - will be populated in enrichment pipeline
    let contributorsCount = 0;
    // Note: Contributors count can be fetched later in enrichment pipeline
    // to avoid hitting rate limits during initial ingestion
    
    // Extract primary topic (first topic from array)
    const primaryTopic = (repo.topics && repo.topics.length > 0) ? repo.topics[0] : null;
    
    // Store in repos_master
    const { error: masterError } = await supabase
      .from('repos_master')
      .upsert({
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
        license: repo.license?.name,
        // New fields
        default_branch: repo.default_branch,
        visibility: repo.visibility || 'public',
        primary_topic: primaryTopic,
        contributors_count: contributorsCount,
        // Star velocity will be calculated later in enrichment pipeline
        stars_30_days: null,
        stars_90_days: null
      }, { onConflict: 'repo_id' });
    
    if (masterError) {
      throw new Error(`Failed to insert into repos_master: ${masterError.message}`);
    }
    
    // Classify cluster (simplified - would use full enrichment in production)
    const text = `${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
    
    // Determine primary cluster from topics
    let primaryCluster = null;
    for (const [clusterSlug, config] of Object.entries(CLUSTER_TARGETS)) {
      if (config.topics.some(topic => text.includes(topic) || repo.topics.includes(topic))) {
        primaryCluster = clusterSlug;
        break;
      }
    }
    
    if (primaryCluster) {
      const { error: clusterError } = await supabase
        .from('repo_cluster_new')
        .upsert({
          repo_id: repo.id,
          cluster_slug: primaryCluster,
          weight: 0.9,
          confidence_score: 0.8
        }, { onConflict: 'repo_id,cluster_slug' });
      
      if (clusterError) {
        console.error(`  ⚠️  Failed to insert cluster for ${repo.full_name}:`, clusterError.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error ingesting ${repo.full_name}:`, error.message);
    return false;
  }
}

// Ingest cluster to target
async function ingestCluster(clusterSlug, target) {
  console.log(`\n🎯 Ingesting cluster: ${clusterSlug.toUpperCase()}`);
  console.log(`   Target: ${target} repos\n`);
  
  const current = await getClusterCount(clusterSlug);
  const needed = Math.max(0, target - current);
  
  console.log(`   Current: ${current} repos`);
  console.log(`   Needed: ${needed} repos\n`);
  
  if (needed === 0) {
    console.log(`   ✅ Cluster already at target!\n`);
    return;
  }
  
  const config = CLUSTER_TARGETS[clusterSlug];
  let ingested = 0;
  let page = 1;
  
  // Try each topic for this cluster
  for (const topic of config.topics) {
    if (ingested >= needed) break;
    
    console.log(`   🔍 Searching topic: ${topic}...`);
    
    let topicPage = 1;
    let hasMore = true;
    
    while (ingested < needed && hasMore) {
      // Start with broader search (lower stars) if we're not finding enough
      const minStars = topicPage <= 3 ? 50 : (topicPage <= 10 ? 30 : 10);
      const maxStars = 10000; // Increase max stars to find more repos
      
      const { repos, total } = await searchReposByTopic(topic, minStars, maxStars, topicPage, 100);
      
      if (repos.length === 0) {
        // Try next page, but don't give up too quickly
        if (topicPage > 20) {
          hasMore = false;
          break;
        }
        topicPage++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      console.log(`      Found ${repos.length} repos (page ${topicPage}, stars: ${minStars}-${maxStars})`);
      
      let newRepos = 0;
      for (const repo of repos) {
        if (ingested >= needed) break;
        
        const success = await ingestRepo(repo);
        if (success) {
          ingested++;
          newRepos++;
          console.log(`      ✅ Ingested: ${repo.full_name} (${ingested}/${needed})`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // If we didn't find any new repos after several pages, try next topic
      if (newRepos === 0 && topicPage > 5) {
        console.log(`      ⚠️  No new repos found after ${topicPage} pages, trying next topic...`);
        break;
      }
      
      topicPage++;
      if (repos.length < 100 && newRepos === 0) {
        // If we got less than 100 results and no new repos, likely no more
        if (topicPage > 10) hasMore = false;
      }
      
      // Rate limiting between pages
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`\n   ✅ Cluster ${clusterSlug}: Ingested ${ingested} repos`);
  console.log(`   📊 New total: ${current + ingested}/${target}\n`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const clusterArg = args.find(arg => arg.startsWith('--cluster'));
  const cluster = clusterArg ? clusterArg.split('=')[1] : 'all';
  
  console.log('🚀 Cluster-Targeted Ingestion\n');
  console.log('Target Distribution:');
  for (const [slug, config] of Object.entries(CLUSTER_TARGETS)) {
    console.log(`  ${slug}: ${config.target} repos`);
  }
  console.log(`\nTotal Target: ${Object.values(CLUSTER_TARGETS).reduce((sum, c) => sum + c.target, 0)} repos\n`);
  
  if (cluster === 'all') {
    // Ingest all clusters
    for (const [clusterSlug, config] of Object.entries(CLUSTER_TARGETS)) {
      await ingestCluster(clusterSlug, config.target);
      
      // Wait between clusters
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } else if (CLUSTER_TARGETS[cluster]) {
    // Ingest specific cluster
    await ingestCluster(cluster, CLUSTER_TARGETS[cluster].target);
  } else {
    console.log(`❌ Unknown cluster: ${cluster}`);
    console.log(`Available clusters: ${Object.keys(CLUSTER_TARGETS).join(', ')}`);
    process.exit(1);
  }
  
  // Summary
  console.log('\n📊 Final Summary:\n');
  for (const [clusterSlug, config] of Object.entries(CLUSTER_TARGETS)) {
    const current = await getClusterCount(clusterSlug);
    const progress = ((current / config.target) * 100).toFixed(1);
    console.log(`  ${clusterSlug}: ${current}/${config.target} (${progress}%)`);
  }
  
  const totalCurrent = Object.values(CLUSTER_TARGETS).reduce(async (sum, config) => {
    const count = await getClusterCount(Object.keys(CLUSTER_TARGETS).find(k => CLUSTER_TARGETS[k] === config));
    return (await sum) + count;
  }, Promise.resolve(0));
  
  const totalTarget = Object.values(CLUSTER_TARGETS).reduce((sum, c) => sum + c.target, 0);
  
  console.log(`\n  Total: ${await totalCurrent}/${totalTarget} repos`);
  console.log('\n✨ Ingestion complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ingestCluster, CLUSTER_TARGETS };
