/**
 * Comprehensive Repository Ingestion Pipeline
 * Fetches repos for ALL onboarding combinations to ensure sufficient coverage
 * 
 * Covers:
 * - All 8 primary clusters
 * - All 16 languages
 * - All frameworks
 * - All goals (tutorials, boilerplates, libraries, etc.)
 * - All project types
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

// Onboarding data (from OnboardingQuestionnaire.tsx)
const PRIMARY_CLUSTERS = ['frontend', 'backend', 'mobile', 'desktop', 'data-science', 'devops', 'game-dev', 'ai-ml'];
const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'R', 'Scala', 'Elixir'];
const FRAMEWORKS = {
  frontend: ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte'],
  backend: ['Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel'],
  mobile: ['Flutter', 'React Native', 'Ionic', 'Electron'],
  'ai-ml': ['TensorFlow', 'PyTorch', 'Pandas', 'NumPy'],
  'data-science': ['Pandas', 'NumPy', 'TensorFlow', 'PyTorch'],
  'game-dev': ['Unity', 'Unreal', 'Godot', 'Phaser'],
  devops: ['Docker', 'Kubernetes', 'Terraform', 'Ansible'],
  desktop: ['Electron', 'Tauri', 'Qt', 'GTK'],
};
const GOALS = {
  'learning-new-tech': ['tutorial', 'course', 'learn', 'guide', 'example', 'walkthrough', 'getting-started'],
  'building-project': ['boilerplate', 'starter', 'template', 'scaffold', 'project'],
  'contributing': ['open-source', 'contributing', 'contribute'],
  'finding-solutions': ['library', 'package', 'sdk', 'tool', 'utility'],
  'exploring': ['awesome', 'curated', 'list', 'collection'],
};
const PROJECT_TYPES = {
  'tutorial': ['tutorial', 'course', 'learn', 'guide'],
  'boilerplate': ['boilerplate', 'starter', 'template'],
  'library': ['library', 'package', 'sdk'],
  'framework': ['framework', 'toolkit'],
  'tool': ['tool', 'utility', 'cli'],
  'full-app': ['app', 'application', 'project'],
};

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
  readme_content?: string | null;
}

// Assign cluster based on topics and language
function assignCluster(repo: GitHubRepo): string {
  const topics = repo.topics.map(t => t.toLowerCase());
  const language = repo.language?.toLowerCase() || '';
  const description = (repo.description || '').toLowerCase();
  const allText = `${topics.join(' ')} ${language} ${description}`;

  // Cluster detection logic
  if (topics.some(t => ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'frontend'].includes(t)) ||
      allText.includes('frontend') || allText.includes('ui') || allText.includes('web app')) {
    return 'frontend';
  }
  if (topics.some(t => ['express', 'fastapi', 'django', 'flask', 'spring', 'laravel', 'backend', 'api', 'server'].includes(t)) ||
      allText.includes('backend') || allText.includes('api') || allText.includes('server')) {
    return 'backend';
  }
  if (topics.some(t => ['flutter', 'react-native', 'mobile', 'ios', 'android', 'reactnative'].includes(t)) ||
      allText.includes('mobile') || allText.includes('ios') || allText.includes('android')) {
    return 'mobile';
  }
  if (topics.some(t => ['electron', 'desktop', 'tauri', 'qt', 'gtk'].includes(t)) ||
      allText.includes('desktop') || allText.includes('native app')) {
    return 'desktop';
  }
  if (topics.some(t => ['machine-learning', 'ai', 'tensorflow', 'pytorch', 'neural', 'deep-learning'].includes(t)) ||
      allText.includes('machine learning') || allText.includes('artificial intelligence')) {
    return 'ai-ml';
  }
  if (topics.some(t => ['data-science', 'data-analysis', 'pandas', 'numpy', 'jupyter', 'data-visualization'].includes(t)) ||
      allText.includes('data science') || allText.includes('data analysis')) {
    return 'data-science';
  }
  if (topics.some(t => ['devops', 'docker', 'kubernetes', 'terraform', 'ci-cd', 'infrastructure'].includes(t)) ||
      allText.includes('devops') || allText.includes('deployment')) {
    return 'devops';
  }
  if (topics.some(t => ['game', 'unity', 'unreal', 'godot', 'phaser', 'gamedev'].includes(t)) ||
      allText.includes('game') || allText.includes('gaming')) {
    return 'game-dev';
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

// Filter: Only include repos with recent commits (within last 18 months)
// Increased from 12 to 18 months for better coverage
function isRepoRecent(repo: GitHubRepo): boolean {
  const pushedAt = new Date(repo.pushed_at);
  const eighteenMonthsAgo = new Date();
  eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
  
  return pushedAt >= eighteenMonthsAgo;
}

// Normalize GitHub API response
async function normalizeRepo(repo: GitHubRepo, fetchReadme: boolean = false): Promise<RepoData | null> {
  // Filter out repos with last commit older than 12 months
  if (!isRepoRecent(repo)) {
    return null;
  }
  
  const cluster = assignCluster(repo);
  const scores = calculateScores(repo);

  // Fetch README content if requested
  let readmeContent: string | null = null;
  if (fetchReadme) {
    readmeContent = await fetchReadmeContent(repo.owner.login, repo.name);
    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

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
    readme_content: readmeContent,
  };
}

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
      // README not found or other error - return null
      if (response.status === 404) {
        return null;
      }
      // Rate limit or other errors - return null to continue
      if (response.status === 403) {
        console.warn(`⚠️ Rate limited when fetching README for ${owner}/${repo}`);
        return null;
      }
      return null;
    }
    
    const data = await response.json();
    // Decode base64 content
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

// Fetch repos from GitHub API
async function fetchReposFromGitHub(query: string, perPage: number = 100): Promise<GitHubRepo[]> {
  const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 403) {
        console.warn(`⚠️ Rate limited for query: ${query}`);
        return [];
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items as GitHubRepo[];
  } catch (error) {
    console.error(`Error fetching ${query}:`, error);
    return [];
  }
}

// Batch upsert to Supabase
async function upsertRepos(repos: RepoData[]) {
  if (repos.length === 0) return;
  
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

// Generate queries for each cluster
function generateClusterQueries(cluster: string): string[] {
  const queries: string[] = [];
  const clusterLower = cluster.toLowerCase();
  
  // Base cluster query
  queries.push(`${clusterLower} stars:>50`);
  
  // Cluster-specific frameworks
  const frameworks = FRAMEWORKS[cluster as keyof typeof FRAMEWORKS] || [];
  frameworks.forEach(framework => {
    const frameworkQuery = framework.toLowerCase().replace(/\s+/g, '-');
    queries.push(`${frameworkQuery} stars:>100`);
    queries.push(`${frameworkQuery} ${clusterLower} stars:>50`);
  });
  
  return queries;
}

// Generate queries for each language
function generateLanguageQueries(language: string): string[] {
  const langLower = language.toLowerCase();
  const queries: string[] = [];
  
  // Language + project types
  queries.push(`language:${langLower} stars:>100`);
  queries.push(`language:${langLower} tutorial stars:>50`);
  queries.push(`language:${langLower} boilerplate stars:>50`);
  queries.push(`language:${langLower} library stars:>100`);
  queries.push(`language:${langLower} framework stars:>200`);
  
  return queries;
}

// Generate queries for each goal
function generateGoalQueries(goal: string): string[] {
  const keywords = GOALS[goal as keyof typeof GOALS] || [];
  const queries: string[] = [];
  
  keywords.forEach(keyword => {
    queries.push(`${keyword} stars:>100`);
    queries.push(`${keyword} tutorial stars:>50`);
    queries.push(`${keyword} example stars:>50`);
  });
  
  return queries;
}

// Generate queries for each project type
function generateProjectTypeQueries(projectType: string): string[] {
  const keywords = PROJECT_TYPES[projectType as keyof typeof PROJECT_TYPES] || [];
  const queries: string[] = [];
  
  keywords.forEach(keyword => {
    queries.push(`${keyword} stars:>100`);
    queries.push(`${keyword} boilerplate stars:>50`);
  });
  
  return queries;
}

// Main comprehensive ingestion function
async function ingestComprehensive() {
  console.log('🚀 Starting comprehensive repo ingestion...\n');
  
  const allRepos: GitHubRepo[] = [];
  const seenIds = new Set<number>();
  
  // 1. Fetch by Primary Clusters (200 repos per cluster = 1600 repos target)
  console.log('📦 Fetching repos by primary clusters...');
  for (const cluster of PRIMARY_CLUSTERS) {
    console.log(`  → ${cluster}...`);
    const queries = generateClusterQueries(cluster);
    
    // Fetch 200 repos per cluster (5 queries × 40 repos each)
    for (const query of queries.slice(0, 5)) {
      const repos = await fetchReposFromGitHub(query, 40);
      repos.forEach(repo => {
        if (!seenIds.has(repo.id)) {
          seenIds.add(repo.id);
          allRepos.push(repo);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
  }
  console.log(`  ✅ Found ${allRepos.length} unique repos from clusters\n`);
  
  // 2. Fetch by Languages (40 repos per language = 640 repos target)
  console.log('🔤 Fetching repos by languages...');
  for (const language of LANGUAGES) {
    console.log(`  → ${language}...`);
    const queries = generateLanguageQueries(language);
    
    // Fetch 40 repos per language (2 queries × 20 repos each)
    for (const query of queries.slice(0, 2)) {
      const repos = await fetchReposFromGitHub(query, 20);
      repos.forEach(repo => {
        if (!seenIds.has(repo.id)) {
          seenIds.add(repo.id);
          allRepos.push(repo);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.log(`  ✅ Total unique repos: ${allRepos.length}\n`);
  
  // 3. Fetch by Goals (30 repos per goal = 150 repos target)
  console.log('🎯 Fetching repos by goals...');
  for (const goal of Object.keys(GOALS)) {
    console.log(`  → ${goal}...`);
    const queries = generateGoalQueries(goal);
    
    // Fetch 30 repos per goal (2 queries × 15 repos each)
    for (const query of queries.slice(0, 2)) {
      const repos = await fetchReposFromGitHub(query, 15);
      repos.forEach(repo => {
        if (!seenIds.has(repo.id)) {
          seenIds.add(repo.id);
          allRepos.push(repo);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.log(`  ✅ Total unique repos: ${allRepos.length}\n`);
  
  // 4. Fetch by Project Types (30 repos per type = 180 repos target)
  console.log('📁 Fetching repos by project types...');
  for (const projectType of Object.keys(PROJECT_TYPES)) {
    console.log(`  → ${projectType}...`);
    const queries = generateProjectTypeQueries(projectType);
    
    // Fetch 30 repos per type (2 queries × 15 repos each)
    for (const query of queries.slice(0, 2)) {
      const repos = await fetchReposFromGitHub(query, 15);
      repos.forEach(repo => {
        if (!seenIds.has(repo.id)) {
          seenIds.add(repo.id);
          allRepos.push(repo);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.log(`  ✅ Total unique repos: ${allRepos.length}\n`);
  
  // 5. Fetch general trending (150 repos target)
  console.log('🔥 Fetching general trending repos...');
  const trendingRepos = await fetchReposFromGitHub('stars:>500', 150);
  trendingRepos.forEach(repo => {
    if (!seenIds.has(repo.id)) {
      seenIds.add(repo.id);
      allRepos.push(repo);
    }
  });
  console.log(`  ✅ Total unique repos: ${allRepos.length}\n`);
  
  // Normalize and score all repos (filter out old repos)
  // Note: We'll fetch READMEs in a separate pass to avoid rate limits
  console.log('⚙️ Normalizing and scoring repos...');
  const normalizedRepos: RepoData[] = [];
  
  for (const repo of allRepos) {
    const normalized = await normalizeRepo(repo, false); // Don't fetch READMEs during initial ingestion
    if (normalized) {
      normalizedRepos.push(normalized);
    }
  }
  
  const filteredCount = allRepos.length - normalizedRepos.length;
  if (filteredCount > 0) {
    console.log(`  ⚠️ Filtered out ${filteredCount} repos (last commit >18 months ago)`);
  }
  
  console.log(`  ✅ Normalized ${normalizedRepos.length} repos`);
  
  // Batch upsert in chunks of 100
  console.log(`\n💾 Upserting ${normalizedRepos.length} repos to database...`);
  for (let i = 0; i < normalizedRepos.length; i += 100) {
    const chunk = normalizedRepos.slice(i, i + 100);
    await upsertRepos(chunk);
    console.log(`  ✅ Upserted ${i + chunk.length}/${normalizedRepos.length} repos`);
  }
  
  console.log('\n✨ Comprehensive ingestion complete!');
  console.log(`   Total repos ingested: ${normalizedRepos.length}`);
  console.log(`   Clusters covered: ${PRIMARY_CLUSTERS.length}`);
  console.log(`   Languages covered: ${LANGUAGES.length}`);
  console.log(`   Goals covered: ${Object.keys(GOALS).length}`);
  console.log(`   Project types covered: ${Object.keys(PROJECT_TYPES).length}`);
}

// Run ingestion
ingestComprehensive().catch(console.error);
