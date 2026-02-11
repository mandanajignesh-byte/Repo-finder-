/**
 * Vercel Cron Job: Fetch and Store Trending Repositories
 * 
 * This endpoint runs daily/weekly to fetch trending repos from GitHub
 * and store them in Supabase.
 * 
 * Schedule: Configured in vercel.json
 * 
 * To test manually: GET /api/cron/fetch-trending?timeRange=daily
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const githubToken = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_API_TOKEN || '';
const cronSecret = process.env.CRON_SECRET || '';

const supabase = createClient(supabaseUrl, supabaseKey);
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

  const repos: GitHubRepo[] = [];
  const repoMap = new Map<number, GitHubRepo>();
  let page = 1;
  const maxPages = 10;
  const perPage = 100;

  while (page <= maxPages && repos.length < 200) {
    const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
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
    // Filter out repos with >30k stars
    filteredRepos = allRepos.filter(repo => repo.stargazers_count <= 30000);
  }

  // Sort by stars and limit
  filteredRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  
  return filteredRepos.slice(0, 200);
}

/**
 * Store trending repos in database
 */
async function storeTrendingRepos(
  repos: GitHubRepo[],
  timeRange: 'daily' | 'weekly' | 'monthly',
  dateKey: string,
  excludeWellKnown: boolean = false
): Promise<void> {
  // Delete existing repos for this time range/date combo
  const deleteQuery = supabase
    .from('trending_repos')
    .delete()
    .eq('time_range', timeRange)
    .eq('date_key', dateKey)
    .eq('exclude_well_known', excludeWellKnown)
    .is('language', null);

  const { error: deleteError } = await deleteQuery;
  
  if (deleteError) {
    console.error('❌ Error deleting old trending repos:', deleteError);
    throw deleteError;
  }

  // Prepare repos for insertion
  const reposToInsert = repos.map((repo, index) => ({
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
    repo_tags: [],
    repo_readme: null,
    repo_created_at: repo.created_at,
    repo_updated_at: repo.updated_at,
    repo_pushed_at: repo.pushed_at,
    trending_score: calculateTrendingScore(repo.stargazers_count, timeRange),
    rank: index + 1,
    time_range: timeRange,
    date_key: dateKey,
    language: null,
    exclude_well_known: excludeWellKnown,
    repo_data: repo,
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
  }
}

export default async function handler(req: any, res: any) {
  // Verify cron secret if set (for security)
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    // Allow manual testing with query param
    const isManualTest = req.query?.manual === 'true';
    if (!isManualTest) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const timeRange = (req.query?.timeRange as 'daily' | 'weekly' | 'monthly') || 'daily';
    
    if (!['daily', 'weekly', 'monthly'].includes(timeRange)) {
      return res.status(400).json({ error: 'Invalid timeRange. Use: daily, weekly, or monthly' });
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const dateKey = getDateKey(timeRange);
    console.log(`🚀 Fetching and storing ${timeRange} trending repos (${dateKey})...`);

    // Fetch and store filtered repos
    console.log('📡 Fetching filtered trending repos...');
    const filteredRepos = await fetchTrendingRepos(timeRange, true);
    await storeTrendingRepos(filteredRepos, timeRange, dateKey, true);
    console.log(`✅ Stored ${filteredRepos.length} filtered repos`);

    // Fetch and store unfiltered repos
    console.log('📡 Fetching unfiltered trending repos...');
    const unfilteredRepos = await fetchTrendingRepos(timeRange, false);
    await storeTrendingRepos(unfilteredRepos, timeRange, dateKey, false);
    console.log(`✅ Stored ${unfilteredRepos.length} unfiltered repos`);

    return res.status(200).json({
      success: true,
      timeRange,
      dateKey,
      filteredCount: filteredRepos.length,
      unfilteredCount: unfilteredRepos.length,
      message: `Successfully stored trending repos for ${timeRange} (${dateKey})`,
    });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch and store trending repos',
      message: error.message,
    });
  }
}
