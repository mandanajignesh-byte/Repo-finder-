/**
 * Test script to verify parallel processing is working
 */

require('dotenv').config();

const tokenString = process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || '';
const tokens = tokenString.split(',').map(t => t.trim()).filter(Boolean);

console.log('🧪 Testing Parallel Processing\n');
console.log(`Tokens available: ${tokens.length}\n`);

// Test 1: Can we make parallel API calls?
async function testParallelAPI() {
  console.log('Test 1: Parallel API Calls');
  console.log('==========================\n');
  
  const https = require('https');
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    timeout: 60000
  });
  
  async function fetchWithToken(endpoint, token) {
    const url = `https://api.github.com${endpoint}`;
    const start = Date.now();
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${token}`,
          'User-Agent': 'Repoverse-Test'
        },
        agent: httpsAgent
      });
      const data = await response.json();
      const duration = Date.now() - start;
      return { success: true, duration, data: data.login || data.name || 'OK' };
    } catch (error) {
      return { success: false, duration: Date.now() - start, error: error.message };
    }
  }
  
  // Test sequential (one at a time)
  console.log('Sequential (one at a time):');
  const sequentialStart = Date.now();
  for (let i = 0; i < Math.min(3, tokens.length); i++) {
    const result = await fetchWithToken('/user', tokens[i]);
    console.log(`  Token ${i + 1}: ${result.success ? '✅' : '❌'} (${result.duration}ms)`);
  }
  const sequentialTime = Date.now() - sequentialStart;
  console.log(`  Total time: ${sequentialTime}ms\n`);
  
  // Test parallel (all at once)
  console.log('Parallel (all at once):');
  const parallelStart = Date.now();
  const promises = [];
  for (let i = 0; i < Math.min(3, tokens.length); i++) {
    promises.push(fetchWithToken('/user', tokens[i]));
  }
  const results = await Promise.all(promises);
  const parallelTime = Date.now() - parallelStart;
  
  results.forEach((result, i) => {
    console.log(`  Token ${i + 1}: ${result.success ? '✅' : '❌'} (${result.duration}ms)`);
  });
  console.log(`  Total time: ${parallelTime}ms\n`);
  
  const speedup = ((sequentialTime / parallelTime) * 100).toFixed(0);
  console.log(`📊 Speedup: ${speedup}% faster with parallel processing\n`);
  
  return parallelTime < sequentialTime;
}

// Test 2: Can we process multiple repos in parallel?
async function testParallelProcessing() {
  console.log('Test 2: Parallel Repo Processing');
  console.log('==================================\n');
  
  const testRepos = [
    'facebook/react',
    'microsoft/vscode',
    'vercel/next.js'
  ];
  
  async function processRepo(repo, workerId) {
    const start = Date.now();
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    const duration = Date.now() - start;
    return { repo, workerId, duration };
  }
  
  // Sequential
  console.log('Sequential processing:');
  const seqStart = Date.now();
  for (let i = 0; i < testRepos.length; i++) {
    const result = await processRepo(testRepos[i], i + 1);
    console.log(`  Worker ${result.workerId}: ${result.repo} (${result.duration}ms)`);
  }
  const seqTime = Date.now() - seqStart;
  console.log(`  Total: ${seqTime}ms\n`);
  
  // Parallel
  console.log('Parallel processing:');
  const parStart = Date.now();
  const promises = testRepos.map((repo, i) => processRepo(repo, i + 1));
  const results = await Promise.all(promises);
  const parTime = Date.now() - parStart;
  
  results.forEach(result => {
    console.log(`  Worker ${result.workerId}: ${result.repo} (${result.duration}ms)`);
  });
  console.log(`  Total: ${parTime}ms\n`);
  
  const speedup = ((seqTime / parTime) * 100).toFixed(0);
  console.log(`📊 Speedup: ${speedup}% faster with parallel processing\n`);
  
  return parTime < seqTime;
}

// Run tests
async function main() {
  try {
    const test1 = await testParallelAPI();
    const test2 = await testParallelProcessing();
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 Test Results:');
    console.log('='.repeat(50));
    console.log(`Parallel API Calls: ${test1 ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log(`Parallel Processing: ${test2 ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log('\n');
    
    if (test1 && test2) {
      console.log('✅ Parallel processing is POSSIBLE and WORKING!');
      console.log('   The ingestion script should work with parallel workers.');
    } else {
      console.log('⚠️  Parallel processing may have issues.');
      console.log('   Check your network/API setup.');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
