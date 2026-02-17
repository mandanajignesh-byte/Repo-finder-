/**
 * Ingest Trending Repositories
 * Fetches trending repos from GitHub and ingests them
 */

const { ingestRepo } = require('./ingest-repos.js');

async function fetchTrendingRepos() {
  // Fetch trending repos (high stars, recent activity)
  const url = 'https://api.github.com/search/repositories?q=stars:>1000+pushed:>2024-01-01&sort=stars&order=desc&per_page=50';
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repoverse-Ingestion'
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  
  const response = await fetch(url, { headers });
  const data = await response.json();
  
  return data.items.map(repo => repo.full_name);
}

async function main() {
  console.log('📈 Fetching trending repositories...\n');
  
  const trendingRepos = await fetchTrendingRepos();
  
  console.log(`Found ${trendingRepos.length} trending repos\n`);
  console.log('Starting ingestion...\n');
  
  for (const repo of trendingRepos) {
    const [owner, repoName] = repo.split('/');
    await ingestRepo(owner, repoName);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✨ Trending repos ingestion complete!');
}

main().catch(console.error);
