/**
 * Update Existing Repos
 * Updates scores and metadata for repos already in database
 * Use this when you want to refresh scores without fetching new repos
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { normalizeRepo, calculateScores, assignCluster } from './ingest-repos';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const githubToken = process.env.VITE_GITHUB_API_TOKEN || process.env.GITHUB_TOKEN || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const GITHUB_API_BASE = 'https://api.github.com';

// Fetch repo data from GitHub API
async function fetchRepoFromGitHub(fullName: string) {
  const url = `${GITHUB_API_BASE}/repos/${fullName}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }
  
  const response = await fetch(url, { headers });
  if (!response.ok) return null;
  
  return await response.json();
}

// Update scores for existing repos
async function updateExistingRepos(limit: number = 1000) {
  console.log(`Fetching ${limit} repos from database...`);
  
  // Get repos that need updating (older than 7 days or low scores)
  const { data: repos, error } = await supabase
    .from('repos')
    .select('github_id, full_name, updated_at_db')
    .order('updated_at_db', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching repos:', error);
    return;
  }
  
  console.log(`Updating ${repos.length} repos...`);
  
  let updated = 0;
  let failed = 0;
  
  for (const repo of repos) {
    try {
      // Fetch latest data from GitHub
      const githubRepo = await fetchRepoFromGitHub(repo.full_name);
      if (!githubRepo) {
        failed++;
        continue;
      }
      
      // Recalculate scores
      const cluster = assignCluster(githubRepo);
      const scores = calculateScores(githubRepo);
      
      // Update in database
      const { error: updateError } = await supabase
        .from('repos')
        .update({
          stars: githubRepo.stargazers_count,
          forks: githubRepo.forks_count,
          watchers: githubRepo.watchers_count,
          open_issues: githubRepo.open_issues_count,
          language: githubRepo.language,
          topics: githubRepo.topics,
          pushed_at: githubRepo.pushed_at,
          updated_at: githubRepo.updated_at,
          cluster,
          ...scores,
          updated_at_db: new Date().toISOString(),
        })
        .eq('github_id', repo.github_id);
      
      if (updateError) {
        console.error(`Error updating ${repo.full_name}:`, updateError);
        failed++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          console.log(`Updated ${updated}/${repos.length} repos...`);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error processing ${repo.full_name}:`, error);
      failed++;
    }
  }
  
  console.log(`\n✅ Update complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
}

// Update specific repos by cluster
async function updateClusterRepos(clusterName: string, limit: number = 500) {
  console.log(`Updating repos in cluster: ${clusterName}`);
  
  const { data: repos } = await supabase
    .from('repos')
    .select('github_id, full_name')
    .eq('cluster', clusterName)
    .limit(limit);
  
  if (!repos) return;
  
  // Similar update logic as above
  // ... (same as updateExistingRepos but filtered by cluster)
}

// Run if called directly
const limit = parseInt(process.argv[2]) || 1000;
updateExistingRepos(limit).catch(console.error);

export { updateExistingRepos, updateClusterRepos };
