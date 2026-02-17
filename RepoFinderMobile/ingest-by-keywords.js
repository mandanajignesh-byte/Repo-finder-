/**
 * Ingest Repos by Specific Keywords/Use Cases
 * Find useful repos by searching for specific keywords
 */

const { ingestRepo } = require('./ingest-repos.js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Exclude major orgs
const EXCLUDED_ORGS = [
  'facebook', 'google', 'microsoft', 'apple', 'amazon', 'netflix',
  'uber', 'airbnb', 'twitter', 'meta', 'alibaba', 'tencent'
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

// Check if repo exists
async function isRepoExists(repoId) {
  const { data } = await supabase
    .from('repos_master')
    .select('repo_id')
    .eq('repo_id', repoId)
    .single();
  
  return data !== null;
}

// Search repos by keyword
async function searchReposByKeyword(keyword, minStars = 50, maxStars = 5000, limit = 30) {
  console.log(`🔍 Searching for "${keyword}"...`);
  
  // Search in name, description, and topics
  const query = `${keyword} in:name,description stars:${minStars}..${maxStars} pushed:>2023-06-01`;
  
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${limit}`;
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
  
  // Filter results
  const filtered = [];
  for (const repo of data.items) {
    const owner = repo.owner.login.toLowerCase();
    
    // Skip major orgs
    if (EXCLUDED_ORGS.some(org => owner.includes(org))) {
      continue;
    }
    
    // Check if exists
    const exists = await isRepoExists(repo.id);
    if (exists) {
      continue;
    }
    
    // Quality checks
    if (!repo.description || repo.description.length < 15) {
      continue;
    }
    
    // Recent activity
    const lastPush = new Date(repo.pushed_at);
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    if (lastPush < sixMonthsAgo) {
      continue;
    }
    
    filtered.push(repo.full_name);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`  ✅ Found ${filtered.length} repos`);
  return filtered;
}

// Main function
async function main() {
  const keywords = process.argv.slice(2);
  
  if (keywords.length === 0) {
    console.log('Usage: node ingest-by-keywords.js keyword1 [keyword2 ...]');
    console.log('Example: node ingest-by-keywords.js "api client" "task manager" "data parser"');
    console.log('\nOr use predefined useful keywords:');
    console.log('node ingest-by-keywords.js --useful');
    process.exit(1);
  }
  
  let searchKeywords = keywords;
  
  // Predefined useful keywords
  if (keywords[0] === '--useful') {
    searchKeywords = [
      'api client',
      'task manager',
      'data parser',
      'file converter',
      'image processor',
      'text formatter',
      'url shortener',
      'password generator',
      'code formatter',
      'markdown editor',
      'json validator',
      'csv parser',
      'email validator',
      'date calculator',
      'color picker',
      'qr generator',
      'barcode generator',
      'hash generator',
      'uuid generator',
      'regex tester'
    ];
  }
  
  console.log('🎯 Discovering Useful Repositories by Keywords\n');
  console.log(`Searching for: ${searchKeywords.join(', ')}\n`);
  
  const allRepos = new Set();
  
  // Search each keyword
  for (const keyword of searchKeywords) {
    const repos = await searchReposByKeyword(keyword, 50, 5000, 20);
    repos.forEach(repo => allRepos.add(repo));
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const reposToIngest = Array.from(allRepos);
  
  console.log(`\n📦 Found ${reposToIngest.length} unique repos to ingest\n`);
  console.log('Starting ingestion...\n');
  
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
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✨ Ingestion complete!`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
}

if (require.main === module) {
  main().catch(console.error);
}
