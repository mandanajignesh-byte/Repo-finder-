/**
 * Fetch and Store Trending Repositories
 * 
 * This script fetches trending repos from GitHub API and stores them in Supabase.
 * Run this script daily/weekly via cron job or scheduled task.
 * 
 * Usage:
 *   npm run ts-node scripts/fetch-and-store-trending.ts [daily|weekly]
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

interface TrendingRepoData {
  repo_id: string;
  repo_full_name: string;
  repo_name: string;
  repo_description: string | null;
  repo_stars: number;
  repo_forks: number;
  repo_language: string | null;
  repo_url: string;
  repo_owner_login: string;
  repo_owner_avatar_url: string;
  repo_topics: string[];
  repo_tags: string[];
  repo_readme: string | null;
  repo_created_at: string;
  repo_updated_at: string;
  repo_pushed_at: string;
  trending_score: string;
  rank: number;
  time_range: 'daily' | 'weekly' | 'monthly';
  date_key: string;
  language: string | null;
  exclude_well_known: boolean;
  repo_data: any;
}

/**
 * Get date key for caching
 */
function getDateKey(timeRange: 'daily' | 'weekly' | 'monthly'): string {
  const today = new Date();
  
  if (timeRange === 'daily') {
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (timeRange === 'weekly') {
    const weekNumber = getWeekNumber(today);
    return `${today.getFullYear()}-W${weekNumber}`;
  } else {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Get week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Calculate trending score display
 */
function calculateTrendingScore(stars: number, timeRange: string): string {
  if (stars >= 1000) {
    return `🔥 ${(stars / 1000).toFixed(1)}k stars`;
  }
  return `🔥 ${stars} stars`;
}

/**
 * Fetch trending repos from GitHub API
 */
async function fetchTrendingRepos(
  timeRange: 'daily' | 'weekly' | 'monthly',
  language?: string,
  excludeWellKnown: boolean = false
): Promise<GitHubRepo[]> {
  const date = new Date();
  
  // Calculate date range based on timeRange
  if (timeRange === 'daily') {
    date.setDate(date.getDate() - 1);
  } else if (timeRange === 'weekly') {
    date.setDate(date.getDate() - 7);
  } else {
    date.setMonth(date.getMonth() - 1);
  }

  const dateStr = date.toISOString().split('T')[0];
  const minStars = timeRange === 'daily' ? 20 : timeRange === 'weekly' ? 50 : 100;
  
  let query = `pushed:>${dateStr} stars:>${minStars}`;
  if (language) {
    query += ` language:${language.toLowerCase()}`;
  }

  const repos: GitHubRepo[] = [];
  const repoMap = new Map<number, GitHubRepo>();
  let page = 1;
  const maxPages = 10;
  const perPage = 100;

  console.log(`📡 Fetching trending repos (${timeRange})...`);

  while (page <= maxPages && repos.length < 200) {
    const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 403) {
          const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
          console.warn(`⚠️ Rate limit hit. Remaining: ${rateLimitRemaining}`);
          break;
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items: GitHubRepo[] = data.items || [];

      if (items.length === 0) break;

      // Deduplicate by repo ID
      items.forEach(repo => {
        if (!repoMap.has(repo.id)) {
          repoMap.set(repo.id, repo);
        }
      });

      page++;
      
      // Rate limiting: wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error);
      break;
    }
  }

  const allRepos = Array.from(repoMap.values());
  
  // Filter out well-known repos if requested
  let filteredRepos = allRepos;
  if (excludeWellKnown) {
    // Filter out repos with >30k stars or very popular ones
    filteredRepos = allRepos.filter(repo => repo.stargazers_count <= 30000);
  }

  // Sort by stars and limit
  filteredRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  
  return filteredRepos.slice(0, 200); // Limit to 200 repos
}

/**
 * Store trending repos in database
 */
async function storeTrendingRepos(
  repos: GitHubRepo[],
  timeRange: 'daily' | 'weekly' | 'monthly',
  dateKey: string,
  language?: string,
  excludeWellKnown: boolean = false
): Promise<void> {
  console.log(`💾 Storing ${repos.length} trending repos in database...`);

  // First, delete existing repos for this time range/date/language combo
  const deleteQuery = supabase
    .from('trending_repos')
    .delete()
    .eq('time_range', timeRange)
    .eq('date_key', dateKey)
    .eq('exclude_well_known', excludeWellKnown);
  
  if (language) {
    deleteQuery.eq('language', language);
  } else {
    deleteQuery.is('language', null);
  }

  const { error: deleteError } = await deleteQuery;
  
  if (deleteError) {
    console.error('❌ Error deleting old trending repos:', deleteError);
    throw deleteError;
  }

  console.log(`✅ Deleted old trending repos for ${timeRange}/${dateKey}`);

  // Prepare repos for insertion
  const reposToInsert: TrendingRepoData[] = repos.map((repo, index) => ({
    repo_id: repo.id.toString(),
    repo_full_name: repo.full_name,
    repo_name: repo.name,
    repo_description: repo.description,
    repo_stars: repo.stargazers_count,
    repo_forks: repo.forks_count,
    repo_language: repo.language,
    repo_url: repo.html_url,
    repo_owner_login: repo.owner.login,
    repo_owner_avatar_url: repo.owner.avatar_url,
    repo_topics: repo.topics || [],
    repo_tags: [], // Can be populated later if needed
    repo_readme: null, // Can be fetched separately if needed
    repo_created_at: repo.created_at,
    repo_updated_at: repo.updated_at,
    repo_pushed_at: repo.pushed_at,
    trending_score: calculateTrendingScore(repo.stargazers_count, timeRange),
    rank: index + 1,
    time_range: timeRange,
    date_key: dateKey,
    language: language || null,
    exclude_well_known: excludeWellKnown,
    repo_data: repo, // Store full repo data as JSON
  }));

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < reposToInsert.length; i += batchSize) {
    const batch = reposToInsert.slice(i, i + batchSize);
    
    const { error: insertError } = await supabase
      .from('trending_repos')
      .insert(batch);

    if (insertError) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError);
      throw insertError;
    }

    console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} repos)`);
  }

  console.log(`✅ Successfully stored ${repos.length} trending repos!`);
}

/**
 * Main function
 */
async function main() {
  const timeRange = (process.argv[2] as 'daily' | 'weekly' | 'monthly') || 'daily';
  
  if (!['daily', 'weekly', 'monthly'].includes(timeRange)) {
    console.error('❌ Invalid time range. Use: daily, weekly, or monthly');
    process.exit(1);
  }

  console.log(`🚀 Fetching and storing ${timeRange} trending repos...`);
  
  const dateKey = getDateKey(timeRange);
  console.log(`📅 Date key: ${dateKey}`);

  try {
    // Fetch trending repos (all languages, both filtered and unfiltered)
    console.log('\n📡 Fetching trending repos (all languages, filtered)...');
    const filteredRepos = await fetchTrendingRepos(timeRange, undefined, true);
    await storeTrendingRepos(filteredRepos, timeRange, dateKey, undefined, true);

    console.log('\n📡 Fetching trending repos (all languages, unfiltered)...');
    const unfilteredRepos = await fetchTrendingRepos(timeRange, undefined, false);
    await storeTrendingRepos(unfilteredRepos, timeRange, dateKey, undefined, false);

    console.log('\n✅ Done! Trending repos stored successfully.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
