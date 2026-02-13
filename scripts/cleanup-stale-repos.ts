/**
 * Cleanup Script: Remove repos with last commit older than 10 months
 * 
 * This script fetches fresh data from GitHub API to check last commit dates
 * and removes stale repos from repo_clusters.
 * 
 * Usage: npx tsx scripts/cleanup-stale-repos.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

interface RepoCluster {
  id: string;
  repo_id: string;
  cluster_name: string;
  repo_data: any;
}

interface GitHubApiRepo {
  pushed_at: string;
  updated_at: string;
  full_name: string;
}

async function fetchRepoFromGitHub(repoFullName: string, token?: string): Promise<GitHubApiRepo | null> {
  try {
    const url = `https://api.github.com/repos/${repoFullName}`;
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Repo doesn't exist
      }
      if (response.status === 403) {
        console.warn(`  ⚠️  Rate limited, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`  ❌ Error fetching ${repoFullName}:`, error);
    return null;
  }
}

async function cleanupStaleRepos() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const githubToken = process.env.VITE_GITHUB_API_TOKEN || process.env.GITHUB_API_TOKEN || process.env.GITHUB_TOKEN || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking for stale repos (last commit >10 months ago)...\n');
  console.log('📝 This will fetch fresh data from GitHub API to check commit dates.\n');

  // Calculate cutoff date (10 months ago)
  const tenMonthsAgo = new Date();
  tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);

  console.log(`📅 Cutoff date: ${tenMonthsAgo.toISOString()}\n`);

  // Fetch all repos in batches
  let totalChecked = 0;
  let totalDeleted = 0;
  const batchSize = 100; // Smaller batches since we're making API calls
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: repos, error: fetchError } = await supabaseClient
      .from('repo_clusters')
      .select('id, repo_id, cluster_name, repo_data')
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      console.error('❌ Error fetching repos:', fetchError);
      break;
    }

    if (!repos || repos.length === 0) {
      hasMore = false;
      break;
    }

    const staleRepoIds: string[] = [];

    for (const repo of repos) {
      totalChecked++;
      
      // Get repo full name from repo_data
      const repoData = repo.repo_data;
      const repoFullName = repoData?.fullName || repoData?.full_name;
      
      if (!repoFullName) {
        console.warn(`  ⚠️  Skipping repo ${repo.repo_id} - no full name`);
        continue;
      }

      // First, try to use stored date fields (faster)
      let lastCommitDateStr = repoData?.pushed_at || repoData?.updated_at;
      let needsGitHubFetch = false;

      // If no stored date fields, fetch from GitHub API
      if (!lastCommitDateStr) {
        needsGitHubFetch = true;
        const githubRepo = await fetchRepoFromGitHub(repoFullName, githubToken);
        
        if (!githubRepo) {
          // Repo doesn't exist or was deleted - mark for deletion
          staleRepoIds.push(repo.id);
          console.log(`  ❌ Deleted/Not found: ${repoFullName}`);
          continue;
        }

        lastCommitDateStr = githubRepo.pushed_at || githubRepo.updated_at;
        
        // Rate limiting: GitHub API allows 60 requests/hour without token, 5000/hour with token
        // Add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!lastCommitDateStr) {
        continue;
      }

      try {
        const lastCommitDate = new Date(lastCommitDateStr);
        
        if (isNaN(lastCommitDate.getTime())) {
          continue;
        }

        // Check if older than 10 months
        if (lastCommitDate < tenMonthsAgo) {
          staleRepoIds.push(repo.id);
          const dateStr = lastCommitDate.toISOString().split('T')[0];
          console.log(`  ❌ Stale: ${repoFullName} (last commit: ${dateStr})`);
        }
      } catch (error) {
        // Skip repos with unparseable dates
        continue;
      }
    }

    // Delete stale repos
    if (staleRepoIds.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('repo_clusters')
        .delete()
        .in('id', staleRepoIds);

      if (deleteError) {
        console.error('❌ Error deleting stale repos:', deleteError);
      } else {
        totalDeleted += staleRepoIds.length;
        console.log(`  ✅ Deleted ${staleRepoIds.length} stale repos from this batch\n`);
      }
    }

    offset += batchSize;
    
    // Check if we've processed all repos
    if (repos.length < batchSize) {
      hasMore = false;
    }

    // Progress update
    if (totalChecked % 100 === 0) {
      console.log(`\n📊 Progress: Checked ${totalChecked} repos, deleted ${totalDeleted} stale repos\n`);
    }
  }

  console.log('\n📊 Final Summary:');
  console.log(`  Total repos checked: ${totalChecked}`);
  console.log(`  Stale repos deleted: ${totalDeleted}`);
  console.log(`  Active repos remaining: ${totalChecked - totalDeleted}`);
}

// Run cleanup
cleanupStaleRepos().catch(console.error);
