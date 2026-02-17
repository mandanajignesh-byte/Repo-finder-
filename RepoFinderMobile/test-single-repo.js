/**
 * Quick test to see if we can process a single repo
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tokenString = process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || '';
const tokens = tokenString.split(',').map(t => t.trim()).filter(Boolean);

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 60000
});

async function testSingleRepo() {
  console.log('🧪 Testing Single Repo Processing\n');
  
  if (tokens.length === 0) {
    console.log('❌ No tokens found!');
    return;
  }
  
  const token = tokens[0];
  console.log(`Using token: ${token.substring(0, 10)}...\n`);
  
  // Test 1: Can we search?
  console.log('Test 1: Search GitHub API');
  console.log('==========================\n');
  
  try {
    const url = `https://api.github.com/search/repositories?q=machine-learning+tutorial&sort=stars&per_page=5&page=1`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
        'User-Agent': 'Repoverse-Test'
      },
      agent: httpsAgent
    });
    
    if (!response.ok) {
      console.log(`❌ Search failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 200)}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Search successful! Found ${data.items?.length || 0} repos\n`);
    
    if (data.items && data.items.length > 0) {
      const repo = data.items[0];
      console.log(`Testing with repo: ${repo.full_name}`);
      console.log(`  Stars: ${repo.stargazers_count}`);
      console.log(`  Language: ${repo.language || 'N/A'}\n`);
      
      // Test 2: Can we get repo details?
      console.log('Test 2: Get Repo Details');
      console.log('=========================\n');
      
      const repoUrl = `https://api.github.com/repos/${repo.full_name}`;
      const repoResponse = await fetch(repoUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${token}`,
          'User-Agent': 'Repoverse-Test'
        },
        agent: httpsAgent
      });
      
      if (!repoResponse.ok) {
        console.log(`❌ Failed to get repo details: ${repoResponse.status}`);
        return;
      }
      
      const repoData = await repoResponse.json();
      console.log(`✅ Got repo details!`);
      console.log(`  Full name: ${repoData.full_name}`);
      console.log(`  Description: ${repoData.description || 'N/A'}`);
      console.log(`  Contributors: ${repoData.contributors_url}\n`);
      
      // Test 3: Can we check database?
      console.log('Test 3: Check Database Connection');
      console.log('=================================\n');
      
      const { data: existing, error: dbError } = await supabase
        .from('repos_master')
        .select('repo_id')
        .eq('repo_id', repo.id)
        .single();
      
      if (dbError && dbError.code !== 'PGRST116') {
        console.log(`❌ Database error: ${dbError.message}`);
        return;
      }
      
      if (existing) {
        console.log(`✅ Repo already exists in database (repo_id: ${repo.id})`);
      } else {
        console.log(`✅ Database connection works! Repo not in DB yet (repo_id: ${repo.id})`);
      }
      
      console.log('\n✅ All tests passed! The script should work.');
      console.log('   Try running: node ingest-balanced-parallel.js --cluster=ai_ml');
      
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error.stack);
  }
}

testSingleRepo();
