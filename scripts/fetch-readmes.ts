/**
 * Fetch and update README content for existing repos
 * Run this after initial ingestion to populate READMEs
 * 
 * Usage: npx tsx scripts/fetch-readmes.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const githubToken = process.env.VITE_GITHUB_API_TOKEN || process.env.GITHUB_TOKEN || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const GITHUB_API_BASE = 'https://api.github.com';

// Fetch README content from GitHub API
async function fetchReadmeContent(owner: string, repo: string): Promise<string | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // README not found
      }
      if (response.status === 403) {
        console.warn(`⚠️ Rate limited when fetching README for ${owner}/${repo}`);
        return null;
      }
      return null;
    }
    
    const data = await response.json();
    if (data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return content;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching README for ${owner}/${repo}:`, error);
    return null;
  }
}

// Main function to fetch READMEs for all repos
async function fetchReadmesForAllRepos() {
  console.log('📖 Starting README fetch for all repos...\n');
  
  // Get all repos without README content
  const { data: repos, error } = await supabase
    .from('repos')
    .select('github_id, full_name, owner_login, name')
    .or('readme_content.is.null,readme_content.eq.');
  
  if (error) {
    console.error('Error fetching repos:', error);
    return;
  }
  
  if (!repos || repos.length === 0) {
    console.log('✅ All repos already have README content!');
    return;
  }
  
  console.log(`Found ${repos.length} repos without README content\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  // Process in batches to respect rate limits
  const batchSize = 10;
  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(repos.length / batchSize)}...`);
    
    for (const repo of batch) {
      const [owner, repoName] = repo.full_name.split('/');
      
      try {
        const readmeContent = await fetchReadmeContent(owner, repoName);
        
        if (readmeContent) {
          const { error: updateError } = await supabase
            .from('repos')
            .update({ readme_content: readmeContent })
            .eq('github_id', repo.github_id);
          
          if (updateError) {
            console.error(`Error updating ${repo.full_name}:`, updateError);
            failCount++;
          } else {
            successCount++;
            console.log(`  ✅ ${repo.full_name}`);
          }
        } else {
          // Update with null to mark as checked
          await supabase
            .from('repos')
            .update({ readme_content: null })
            .eq('github_id', repo.github_id);
          failCount++;
          console.log(`  ⚠️ No README for ${repo.full_name}`);
        }
        
        // Rate limit: 100ms delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing ${repo.full_name}:`, error);
        failCount++;
      }
    }
    
    // Longer delay between batches
    if (i + batchSize < repos.length) {
      console.log('  ⏳ Waiting 2 seconds before next batch...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n✨ README fetch complete!');
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed/No README: ${failCount}`);
  console.log(`   Total processed: ${repos.length}`);
}

// Run
fetchReadmesForAllRepos().catch(console.error);
