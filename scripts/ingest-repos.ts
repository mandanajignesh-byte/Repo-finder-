/**
 * Repository Ingestion Pipeline
 * Fetches, normalizes, scores, and stores repos in unified repos table
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role key for ingestion (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const githubToken = process.env.VITE_GITHUB_API_TOKEN || process.env.GITHUB_TOKEN || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  owner: { login: string; avatar_url: string };
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  license: { name: string } | null;
  html_url: string;
  homepage: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

interface RepoData {
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  owner_login: string;
  owner_avatar: string;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  language: string | null;
  topics: string[];
  license: string | null;
  repo_url: string;
  homepage_url: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  cluster: string;
  popularity_score: number;
  activity_score: number;
  freshness_score: number;
  quality_score: number;
  trending_score: number;
  recommendation_score: number;
}

// Assign cluster based on topics and language
function assignCluster(repo: GitHubRepo): string {
  const topics = repo.topics.map(t => t.toLowerCase());
  const language = repo.language?.toLowerCase() || '';
  const description = (repo.description || '').toLowerCase();
  const allText = `${topics.join(' ')} ${language} ${description}`;

  // Cluster detection logic
  if (topics.some(t => ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt'].includes(t)) ||
      allText.includes('frontend') || allText.includes('ui')) {
    return 'frontend';
  }
  if (topics.some(t => ['express', 'fastapi', 'django', 'flask', 'spring', 'laravel'].includes(t)) ||
      allText.includes('backend') || allText.includes('api')) {
    return 'backend';
  }
  if (topics.some(t => ['flutter', 'react-native', 'mobile', 'ios', 'android'].includes(t))) {
    return 'mobile';
  }
  if (topics.some(t => ['machine-learning', 'ai', 'tensorflow', 'pytorch'].includes(t))) {
    return 'ai-ml';
  }
  if (topics.some(t => ['devops', 'docker', 'kubernetes', 'terraform'].includes(t))) {
    return 'devops';
  }
  
  return 'general';
}

// Calculate precomputed scores
function calculateScores(repo: GitHubRepo): {
  popularity_score: number;
  activity_score: number;
  freshness_score: number;
  quality_score: number;
  trending_score: number;
  recommendation_score: number;
} {
  const stars = repo.stargazers_count;
  const forks = repo.forks_count;
  const watchers = repo.watchers_count;
  
  // Popularity score (0-100)
  const popularity_score = Math.min(100, 
    Math.log10(stars + 1) * 15 +
    Math.log10(forks + 1) * 10 +
    Math.log10(watchers + 1) * 5
  );

  // Activity score (simplified - would need commits/issues data)
  const activity_score = Math.min(100, (stars / 1000) * 50);

  // Freshness score (0-100)
  const daysSincePush = (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24);
  const freshness_score = Math.max(0, 100 - (daysSincePush / 30) * 100);

  // Quality score (0-100)
  let quality_score = 0;
  if (repo.description && repo.description.length > 20) quality_score += 30;
  if (repo.topics.length > 0) quality_score += 20;
  if (repo.license) quality_score += 20;
  if (repo.language) quality_score += 15;
  if (repo.homepage) quality_score += 15;

  // Trending score (simplified)
  const trending_score = Math.min(100, (stars / 100) * 0.6 + freshness_score * 0.4);

  // Overall recommendation score
  const recommendation_score = 
    popularity_score * 0.3 +
    activity_score * 0.25 +
    freshness_score * 0.2 +
    quality_score * 0.15 +
    trending_score * 0.1;

  return {
    popularity_score: Math.round(popularity_score * 100) / 100,
    activity_score: Math.round(activity_score * 100) / 100,
    freshness_score: Math.round(freshness_score * 100) / 100,
    quality_score: Math.round(quality_score * 100) / 100,
    trending_score: Math.round(trending_score * 100) / 100,
    recommendation_score: Math.round(recommendation_score * 100) / 100,
  };
}

// Normalize GitHub API response
function normalizeRepo(repo: GitHubRepo): RepoData {
  const cluster = assignCluster(repo);
  const scores = calculateScores(repo);

  return {
    github_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    owner_login: repo.owner.login,
    owner_avatar: repo.owner.avatar_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.watchers_count,
    open_issues: repo.open_issues_count,
    language: repo.language,
    topics: repo.topics,
    license: repo.license?.name || null,
    repo_url: repo.html_url,
    homepage_url: repo.homepage,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    cluster,
    ...scores,
  };
}

// Fetch trending repos
async function fetchTrendingRepos(language?: string): Promise<GitHubRepo[]> {
  const query = language 
    ? `language:${language} stars:>100`
    : 'stars:>100';
  
  const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=100`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.items as GitHubRepo[];
}

// Batch upsert to Supabase
async function upsertRepos(repos: RepoData[]) {
  const { error } = await supabase
    .from('repos')
    .upsert(repos, {
      onConflict: 'github_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error upserting repos:', error);
    throw error;
  }
}

// Main ingestion function
async function ingestRepos() {
  console.log('Starting repo ingestion...');

  const languages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust'];
  const allRepos: GitHubRepo[] = [];

  // Fetch trending repos for each language
  for (const lang of languages) {
    console.log(`Fetching trending ${lang} repos...`);
    const repos = await fetchTrendingRepos(lang);
    allRepos.push(...repos);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }

  // Fetch general trending
  console.log('Fetching general trending repos...');
  const generalRepos = await fetchTrendingRepos();
  allRepos.push(...generalRepos);

  // Normalize and score
  console.log('Normalizing and scoring repos...');
  const normalizedRepos = allRepos.map(normalizeRepo);

  // Remove duplicates by github_id
  const uniqueRepos = Array.from(
    new Map(normalizedRepos.map(r => [r.github_id, r])).values()
  );

  // Batch upsert in chunks of 100
  console.log(`Upserting ${uniqueRepos.length} repos...`);
  for (let i = 0; i < uniqueRepos.length; i += 100) {
    const chunk = uniqueRepos.slice(i, i + 100);
    await upsertRepos(chunk);
    console.log(`Upserted ${i + chunk.length}/${uniqueRepos.length} repos`);
  }

  console.log('Ingestion complete!');
}

// Run if called directly
ingestRepos().catch(console.error);

export { ingestRepos, normalizeRepo, calculateScores, assignCluster };
