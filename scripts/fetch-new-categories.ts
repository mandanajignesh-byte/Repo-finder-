/**
 * Fetch Repos for New Categories Script
 * Fetches 300 repos for "ai-automation" and "open-source-alternatives" categories
 * Stores them in Supabase repo_clusters table
 * 
 * Usage: npx tsx scripts/fetch-new-categories.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const GITHUB_TOKEN = process.env.VITE_GITHUB_API_TOKEN || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

if (!GITHUB_TOKEN) {
  console.warn('⚠️  No GitHub token found. API calls will be rate-limited to 60/hour.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  language: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  license?: {
    name: string;
  } | null;
  topics?: string[];
}

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  tags: string[];
  stars: number;
  forks: number;
  lastUpdated: string;
  language?: string;
  url: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
  license?: string;
  topics?: string[];
}

/**
 * Transform GitHub API response to our Repository type
 */
function transformRepo(apiRepo: GitHubRepo): Repository {
  const tagsSet = new Set<string>();
  const tags: string[] = [];
  
  if (apiRepo.language) {
    tagsSet.add(apiRepo.language.toLowerCase());
    tags.push(apiRepo.language);
  }
  
  const topics = apiRepo.topics || [];
  for (const topic of topics) {
    const topicLower = topic.toLowerCase();
    if (!tagsSet.has(topicLower) && tags.length < 5) {
      tagsSet.add(topicLower);
      tags.push(topic);
    }
  }
  
  return {
    id: apiRepo.id.toString(),
    name: apiRepo.name,
    fullName: apiRepo.full_name,
    description: apiRepo.description || 'No description available',
    tags,
    stars: apiRepo.stargazers_count,
    forks: apiRepo.forks_count,
    lastUpdated: apiRepo.updated_at,
    language: apiRepo.language || undefined,
    url: apiRepo.html_url,
    owner: {
      login: apiRepo.owner.login,
      avatarUrl: apiRepo.owner.avatar_url,
    },
    license: apiRepo.license?.name,
    topics: apiRepo.topics,
  };
}

/**
 * Search GitHub repositories
 */
async function searchGitHubRepos(query: string, perPage = 100, maxPages = 10): Promise<Repository[]> {
  const allRepos: Repository[] = [];
  let page = 1;
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  
  while (page <= maxPages) {
    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: perPage.toString(),
      page: page.toString(),
    });
    
    try {
      const response = await fetch(
        `https://api.github.com/search/repositories?${params}`,
        { headers }
      );
      
      if (response.status === 403) {
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        if (rateLimitReset) {
          const resetTime = parseInt(rateLimitReset) * 1000;
          const waitTime = resetTime - Date.now();
          if (waitTime > 0) {
            console.log(`⏳ Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ GitHub API error: ${response.status} ${response.statusText}`);
        console.error(errorText);
        break;
      }
      
      const data = await response.json();
      const repos = data.items.map((repo: GitHubRepo) => transformRepo(repo));
      
      allRepos.push(...repos);
      
      // Check if there's a next page
      const linkHeader = response.headers.get('link');
      const hasNext = linkHeader?.includes('rel="next"');
      
      if (!hasNext || repos.length < perPage) {
        break;
      }
      
      page++;
      
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error);
      break;
    }
  }
  
  return allRepos;
}

/**
 * Store repos in Supabase
 */
async function storeReposInSupabase(clusterName: string, repos: Repository[]): Promise<void> {
  console.log(`\n📦 Storing ${repos.length} repos for "${clusterName}"...`);
  
  // First, update or create cluster metadata
  const { error: metadataError } = await supabase
    .from('cluster_metadata')
    .upsert({
      cluster_name: clusterName,
      display_name: clusterName === 'ai-automation' ? 'AI Automation' : 'Open Source Alternatives',
      description: clusterName === 'ai-automation' 
        ? 'No-code automation platforms like n8n, Zapier alternatives, workflow automation, and integration tools'
        : 'Open-source alternatives to popular proprietary tools - image generation, productivity apps, and more',
      repo_count: repos.length,
      last_curated_at: new Date().toISOString(),
      is_active: true,
    }, {
      onConflict: 'cluster_name',
    });
  
  if (metadataError) {
    console.error(`❌ Error updating cluster metadata:`, metadataError);
  }
  
  // Store each repo
  let successCount = 0;
  let errorCount = 0;
  
  for (const repo of repos) {
    // Extract tags from repo
    const tags = [
      ...(repo.tags || []),
      ...(repo.topics || []),
      repo.language || '',
    ].filter(Boolean).map(t => t.toLowerCase());
    
    // Calculate quality score (based on stars, forks, recency)
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(repo.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(0, 100 - daysSinceUpdate); // Decay over time
    const popularityScore = Math.min(100, Math.floor(repo.stars / 100)); // Cap at 100
    const qualityScore = Math.floor((popularityScore * 0.7) + (recencyScore * 0.3));
    
    const { error } = await supabase
      .from('repo_clusters')
      .upsert({
        cluster_name: clusterName,
        repo_id: repo.id,
        repo_data: repo,
        tags: tags,
        quality_score: qualityScore,
        rotation_priority: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cluster_name,repo_id',
      });
    
    if (error) {
      console.error(`❌ Error storing repo ${repo.fullName}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
    
    // Progress indicator
    if ((successCount + errorCount) % 50 === 0) {
      process.stdout.write(`\r  Progress: ${successCount + errorCount}/${repos.length}`);
    }
  }
  
  console.log(`\n✅ Stored ${successCount} repos, ${errorCount} errors`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting to fetch repos for new categories...\n');
  
  // AI Automation queries
  const aiAutomationQueries = [
    'n8n',
    'zapier alternative',
    'workflow automation',
    'no-code automation',
    'low-code platform',
    'visual workflow',
    'automation platform',
    'integration platform',
    'api automation',
    'webhook automation',
    'ifttt alternative',
    'workflow builder',
    'process automation',
    'task automation',
    'business automation',
    'rpa',
    'robotic process automation',
    'orchestration tool',
    'event automation',
    'rule engine',
  ];
  
  // Open Source Alternatives queries
  const openSourceAlternativesQueries = [
    'open source alternative',
    'free alternative',
    'self-hosted alternative',
    'privacy-focused alternative',
    'foss alternative',
    'open source replacement',
    'free software alternative',
    'libre alternative',
    'self-hosted',
    'privacy-focused',
    'open source image generation',
    'open source chatgpt alternative',
    'open source photoshop alternative',
    'open source figma alternative',
    'open source notion alternative',
    'open source slack alternative',
    'open source trello alternative',
    'open source jira alternative',
    'open source github alternative',
    'open source dropbox alternative',
  ];
  
  // Fetch AI Automation repos
  console.log('📡 Fetching AI Automation repos...');
  const aiAutomationRepos: Repository[] = [];
  const seenIds = new Set<string>();
  
  for (const query of aiAutomationQueries) {
    console.log(`  Searching: "${query}"`);
    const repos = await searchGitHubRepos(query, 100, 3); // 3 pages max per query
    
    for (const repo of repos) {
      if (!seenIds.has(repo.id)) {
        seenIds.add(repo.id);
        aiAutomationRepos.push(repo);
      }
    }
    
    // Limit to 300 total
    if (aiAutomationRepos.length >= 300) {
      break;
    }
    
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Sort by stars and take top 300
  const topAIAutomation = aiAutomationRepos
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 300);
  
  console.log(`✅ Found ${topAIAutomation.length} unique AI Automation repos`);
  
  // Store in Supabase
  await storeReposInSupabase('ai-automation', topAIAutomation);
  
  // Fetch Open Source Alternatives repos
  console.log('\n📡 Fetching Open Source Alternatives repos...');
  const openSourceAlternativesRepos: Repository[] = [];
  seenIds.clear();
  
  for (const query of openSourceAlternativesQueries) {
    console.log(`  Searching: "${query}"`);
    const repos = await searchGitHubRepos(query, 100, 3); // 3 pages max per query
    
    for (const repo of repos) {
      if (!seenIds.has(repo.id)) {
        seenIds.add(repo.id);
        openSourceAlternativesRepos.push(repo);
      }
    }
    
    // Limit to 300 total
    if (openSourceAlternativesRepos.length >= 300) {
      break;
    }
    
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Sort by stars and take top 300
  const topOpenSourceAlternatives = openSourceAlternativesRepos
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 300);
  
  console.log(`✅ Found ${topOpenSourceAlternatives.length} unique Open Source Alternatives repos`);
  
  // Store in Supabase
  await storeReposInSupabase('open-source-alternatives', topOpenSourceAlternatives);
  
  console.log('\n🎉 Done! All repos have been stored in Supabase.');
}

// Run the script
main().catch(console.error);
