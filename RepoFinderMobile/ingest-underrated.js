/**
 * Ingest Underrated & Useful Repositories
 * Finds and ingests repos that are useful but not widely known
 * Filters out major orgs and focuses on hidden gems
 */

const { ingestRepo } = require('./ingest-repos.js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Major orgs to exclude
const EXCLUDED_ORGS = [
  'facebook', 'google', 'microsoft', 'apple', 'amazon', 'netflix',
  'uber', 'airbnb', 'twitter', 'meta', 'alibaba', 'tencent',
  'adobe', 'oracle', 'salesforce', 'vmware', 'redhat', 'ibm'
];

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

// Check if repo is already in database
async function isRepoExists(repoId) {
  const { data } = await supabase
    .from('repos_master')
    .select('repo_id')
    .eq('repo_id', repoId)
    .single();
  
  return data !== null;
}

// Discover underrated repos by topic
async function discoverUnderratedRepos(topic, minStars = 50, maxStars = 5000, perPage = 30) {
  console.log(`🔍 Searching for underrated repos in "${topic}"...`);
  
  // Search query: topic, star range, recent activity, exclude major orgs
  const query = `topic:${topic} stars:${minStars}..${maxStars} pushed:>2023-01-01`;
  
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Ingestion'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  const response = await fetch(url, { headers });
  const data = await response.json();
  
  if (!data.items) {
    console.log(`  ❌ No results found`);
    return [];
  }
  
  // Filter out major orgs and already ingested repos
  const filtered = [];
  for (const repo of data.items) {
    const owner = repo.owner.login.toLowerCase();
    
    // Skip major orgs
    if (EXCLUDED_ORGS.some(org => owner.includes(org))) {
      continue;
    }
    
    // Check if already exists
    const exists = await isRepoExists(repo.id);
    if (exists) {
      continue;
    }
    
    // Additional quality filters
    // Must have description
    if (!repo.description || repo.description.length < 20) {
      continue;
    }
    
    // Must have some activity (pushed in last 6 months)
    const lastPush = new Date(repo.pushed_at);
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    if (lastPush < sixMonthsAgo) {
      continue;
    }
    
    // Must have reasonable star/issue ratio (indicates quality)
    const issueRatio = repo.open_issues_count / Math.max(repo.stargazers_count, 1);
    if (issueRatio > 0.5) { // Too many issues relative to stars
      continue;
    }
    
    filtered.push(repo.full_name);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`  ✅ Found ${filtered.length} underrated repos`);
  return filtered;
}

// Discover by multiple topics
async function discoverByTopics(topics, minStars = 50, maxStars = 5000) {
  const allRepos = new Set();
  
  for (const topic of topics) {
    const repos = await discoverUnderratedRepos(topic, minStars, maxStars);
    repos.forEach(repo => allRepos.add(repo));
    
    // Rate limiting between topics
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return Array.from(allRepos);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Topics to search for underrated repos
  const defaultTopics = [
    'productivity',
    'developer-tools',
    'automation',
    'cli-tool',
    'utility',
    'boilerplate',
    'starter-template',
    'api-wrapper',
    'data-processing',
    'web-scraping',
    'task-automation',
    'workflow',
    'productivity-tool',
    'developer-productivity',
    'code-generator',
    'testing-tool',
    'monitoring',
    'logging',
    'caching',
    'performance'
  ];
  
  let topics = defaultTopics;
  let minStars = 50;
  let maxStars = 5000;
  let limit = 100;
  
  // Parse arguments
  if (args.length > 0) {
    if (args[0] === '--topics') {
      topics = args.slice(1).filter(arg => !arg.startsWith('--'));
    }
    if (args.includes('--min-stars')) {
      minStars = parseInt(args[args.indexOf('--min-stars') + 1]) || 50;
    }
    if (args.includes('--max-stars')) {
      maxStars = parseInt(args[args.indexOf('--max-stars') + 1]) || 5000;
    }
    if (args.includes('--limit')) {
      limit = parseInt(args[args.indexOf('--limit') + 1]) || 100;
    }
  }
  
  console.log('🎯 Discovering Underrated & Useful Repositories\n');
  console.log(`Configuration:`);
  console.log(`  Topics: ${topics.length} topics`);
  console.log(`  Star range: ${minStars} - ${maxStars}`);
  console.log(`  Limit: ${limit} repos`);
  console.log(`  Excluding major orgs: ${EXCLUDED_ORGS.join(', ')}\n`);
  
  // Discover repos
  const repos = await discoverByTopics(topics, minStars, maxStars);
  
  // Limit results
  const reposToIngest = repos.slice(0, limit);
  
  console.log(`\n📦 Found ${reposToIngest.length} repos to ingest\n`);
  console.log('Starting ingestion...\n');
  
  // Ingest each repo
  let successCount = 0;
  let failCount = 0;
  
  for (const repo of reposToIngest) {
    try {
      const [owner, repoName] = repo.split('/');
      await ingestRepo(owner, repoName);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed to ingest ${repo}: ${error.message}`);
      failCount++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✨ Ingestion complete!`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { discoverUnderratedRepos, discoverByTopics };
