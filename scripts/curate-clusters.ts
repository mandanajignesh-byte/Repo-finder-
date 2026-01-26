/**
 * Cluster Curation Script
 * Fetches best repos for each cluster and stores in Supabase
 * Run this periodically (weekly/monthly) to keep clusters fresh
 * 
 * Usage: npx tsx scripts/curate-clusters.ts
 */

import dotenv from 'dotenv';
import { Repository } from '../src/lib/types';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
dotenv.config();

interface ClusterConfig {
  tags: string[];
  searchQueries: string[];
  description: string;
  icon: string;
}

// All languages from onboarding form
const ALL_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'R', 'Scala', 'Elixir'
];

// All frameworks from onboarding form (MUST MATCH OnboardingQuestionnaire.tsx)
const ALL_FRAMEWORKS = [
  // Frontend
  'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte',
  // Backend
  'Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel',
  // Mobile
  'Flutter', 'React Native', 'Ionic', 'Electron',
  // AI/ML
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  // Game Dev
  'Unity', 'Unreal', 'Godot', 'Phaser',
  // DevOps
  'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  // Desktop
  'Tauri', 'Qt', 'GTK'
];

// All project types from onboarding form
// Prioritizing tutorials (user's main focus) with more keywords
// Other types get fewer but most important keywords
const PROJECT_TYPE_KEYWORDS = {
  'tutorial': ['tutorial', 'course', 'learn', 'guide', 'example'], // 5 keywords for tutorials
  'boilerplate': ['boilerplate', 'starter', 'template'], // 3 keywords
  'library': ['library', 'package'], // 2 keywords
  'framework': ['framework'], // 1 keyword
  'full-app': ['app', 'application'], // 2 keywords
  'tool': ['tool', 'utility'] // 2 keywords
};

/**
 * Generate comprehensive search queries for a cluster
 * Covers ALL languages, frameworks, and project types
 */
function generateClusterQueries(clusterName: string, baseKeywords: string[]): string[] {
  const queries: string[] = [];
  
  // Base queries for the cluster
  queries.push(...baseKeywords);
  
  // For each language + each project type
  ALL_LANGUAGES.forEach(lang => {
    Object.entries(PROJECT_TYPE_KEYWORDS).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        queries.push(`${lang.toLowerCase()} ${keyword}`);
      });
    });
  });
  
  // For each framework + each project type (only relevant frameworks for this cluster)
  const relevantFrameworks = getRelevantFrameworks(clusterName);
  relevantFrameworks.forEach(framework => {
    // Handle frameworks with spaces (e.g., "React Native" -> "react-native")
    const frameworkQuery = framework.toLowerCase().replace(/\s+/g, '-');
    Object.entries(PROJECT_TYPE_KEYWORDS).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        queries.push(`${frameworkQuery} ${keyword}`);
      });
    });
  });
  
  // Domain-specific queries
  queries.push(`${clusterName} tutorial`, `${clusterName} course`, `${clusterName} boilerplate`);
  
  return queries;
}

/**
 * Get relevant frameworks for each cluster
 * MUST MATCH onboarding form FRAMEWORKS object
 */
function getRelevantFrameworks(clusterName: string): string[] {
  switch (clusterName) {
    case 'frontend':
      return ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte'];
    case 'backend':
      return ['Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel'];
    case 'mobile':
      return ['Flutter', 'React Native', 'Ionic', 'Electron'];
    case 'ai-ml':
      return ['TensorFlow', 'PyTorch', 'Pandas', 'NumPy'];
    case 'data-science':
      return ['Pandas', 'NumPy', 'TensorFlow', 'PyTorch'];
    case 'game-dev':
      return ['Unity', 'Unreal', 'Godot', 'Phaser'];
    case 'devops':
      return ['Docker', 'Kubernetes', 'Terraform', 'Ansible'];
    case 'desktop':
      return ['Electron', 'Tauri', 'Qt', 'GTK'];
    default:
      return [];
  }
}

const CLUSTERS: Record<string, ClusterConfig> = {
  frontend: {
    // Tags must include: languages, frameworks, project types, goals from onboarding
    tags: [
      // Languages from onboarding
      'javascript', 'typescript', 'html', 'css',
      // Frameworks from onboarding
      'react', 'vue', 'angular', 'next.js', 'nuxt', 'svelte',
      // Project types from onboarding
      'tutorial', 'course', 'learn', 'guide', 'example', 'boilerplate', 'starter', 'template', 'library', 'package', 'framework', 'full-app', 'application', 'tool', 'utility',
      // Goals from onboarding (mapped to tags)
      'learning', 'building', 'contributing', 'open-source', 'beginner-friendly',
      // Cluster-specific
      'ui-components', 'animations', 'css-tools', 'webpack', 'vite', 'frontend', 'web-frontend'
    ],
    searchQueries: generateClusterQueries('frontend', ['react', 'vue', 'angular', 'ui-components', 'css-framework', 'frontend-framework', 'web-frontend']),
    description: 'Frontend development frameworks, libraries, and tools',
    icon: '🌐',
  },
  backend: {
    tags: [
      // Languages from onboarding
      'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'ruby', 'scala', 'elixir',
      // Frameworks from onboarding
      'express', 'fastapi', 'django', 'flask', 'spring', 'laravel',
      // Project types
      'tutorial', 'course', 'learn', 'boilerplate', 'starter', 'template', 'library', 'package', 'framework', 'api', 'rest', 'graphql',
      // Goals
      'learning', 'building', 'contributing', 'open-source',
      // Cluster-specific
      'nodejs', 'backend', 'web-backend', 'server', 'api-framework'
    ],
    searchQueries: generateClusterQueries('backend', ['nodejs', 'express', 'django', 'flask', 'api-framework', 'backend-framework', 'web-backend', 'rest-api', 'graphql']),
    description: 'Backend frameworks, APIs, and server-side tools',
    icon: '⚙️',
  },
  'ai-ml': {
    tags: [
      // Languages
      'python', 'r', 'julia', 'javascript', 'typescript',
      // Frameworks from onboarding
      'tensorflow', 'pytorch', 'pandas', 'numpy',
      // Project types
      'tutorial', 'course', 'learn', 'library', 'package', 'framework',
      // Goals
      'learning', 'building', 'research',
      // Cluster-specific
      'machine-learning', 'ai', 'neural-network', 'deep-learning', 'nlp', 'ai-ml'
    ],
    searchQueries: generateClusterQueries('ai-ml', ['machine-learning', 'tensorflow', 'pytorch', 'ai', 'deep-learning', 'neural-network', 'nlp']),
    description: 'Artificial Intelligence and Machine Learning libraries',
    icon: '🤖',
  },
  mobile: {
    tags: [
      // Languages
      'javascript', 'typescript', 'swift', 'kotlin', 'dart', 'java',
      // Frameworks from onboarding
      'flutter', 'react-native', 'ionic', 'electron',
      // Project types
      'tutorial', 'course', 'learn', 'boilerplate', 'starter', 'template', 'library', 'framework', 'full-app',
      // Goals
      'learning', 'building', 'contributing',
      // Cluster-specific
      'ios', 'android', 'mobile-app', 'mobile', 'mobile-development'
    ],
    searchQueries: generateClusterQueries('mobile', ['react-native', 'flutter', 'mobile-app', 'ios-framework', 'android-framework', 'mobile-development']),
    description: 'Mobile app development frameworks and tools',
    icon: '📱',
  },
  devops: {
    tags: [
      // Languages
      'go', 'python', 'bash', 'shell', 'javascript', 'typescript',
      // Frameworks from onboarding
      'docker', 'kubernetes', 'terraform', 'ansible',
      // Project types
      'tutorial', 'course', 'learn', 'tool', 'utility', 'library', 'package',
      // Goals
      'learning', 'building', 'contributing',
      // Cluster-specific
      'ci-cd', 'devops', 'infrastructure', 'automation'
    ],
    searchQueries: generateClusterQueries('devops', ['docker', 'kubernetes', 'devops-tools', 'ci-cd', 'infrastructure', 'terraform', 'ansible']),
    description: 'DevOps tools, CI/CD, and infrastructure management',
    icon: '🔧',
  },
  'data-science': {
    tags: [
      // Languages
      'python', 'r', 'julia', 'scala', 'javascript',
      // Frameworks from onboarding
      'pandas', 'numpy', 'tensorflow', 'pytorch',
      // Project types
      'tutorial', 'course', 'learn', 'library', 'package', 'tool',
      // Goals
      'learning', 'building', 'research', 'analysis',
      // Cluster-specific
      'data-science', 'jupyter', 'analytics', 'data-visualization', 'data-analysis'
    ],
    searchQueries: generateClusterQueries('data-science', ['data-science', 'pandas', 'analytics', 'jupyter', 'data-visualization', 'data-analysis']),
    description: 'Data science libraries, analytics, and visualization tools',
    icon: '📊',
  },
  'game-dev': {
    tags: [
      // Languages
      'c++', 'c#', 'javascript', 'typescript', 'python', 'rust',
      // Frameworks from onboarding
      'unity', 'unreal', 'godot', 'phaser',
      // Project types
      'tutorial', 'course', 'learn', 'framework', 'library', 'full-app',
      // Goals
      'learning', 'building', 'contributing',
      // Cluster-specific
      'game-development', 'game-engine', 'gamedev', 'game-dev', 'graphics', 'game'
    ],
    searchQueries: generateClusterQueries('game-dev', ['game-development', 'unity', 'unreal-engine', 'game-engine', 'gamedev']),
    description: 'Game development engines, frameworks, and tools',
    icon: '🎮',
  },
  'desktop': {
    tags: [
      // Languages
      'javascript', 'typescript', 'c++', 'c#', 'rust', 'python',
      // Frameworks from onboarding
      'electron', 'tauri', 'qt', 'gtk',
      // Project types
      'tutorial', 'course', 'learn', 'framework', 'library', 'full-app', 'application',
      // Goals
      'learning', 'building', 'contributing',
      // Cluster-specific
      'desktop-app', 'desktop', 'desktop-application', 'native-app'
    ],
    searchQueries: generateClusterQueries('desktop', ['desktop-application', 'electron', 'tauri', 'desktop-app']),
    description: 'Desktop application development frameworks and tools',
    icon: '💻',
  },
};

// Quality validation (simplified version)
function validateRepoQuality(repo: any, minStars: number): { passed: boolean; score: number } {
  let score = 100;
  let passed = true;

  // Check minimum stars
  if (repo.stars < minStars) {
    passed = false;
    return { passed, score: 0 };
  }

  // Must have description
  if (!repo.description || repo.description.length < 20) {
    passed = false;
    return { passed, score: 0 };
  }

  // Check for generic list repos
  const descLower = (repo.description || '').toLowerCase();
  const nameLower = (repo.name || '').toLowerCase();
  
  if (descLower.includes('awesome list') || descLower.includes('curated list')) {
    if (repo.stars > 1000) {
      passed = false;
      return { passed, score: 0 };
    }
  }

  // Check for mega-corporate (unless tutorial)
  const fullNameLower = (repo.fullName || '').toLowerCase();
  const corporateOrgs = ['microsoft/', 'facebook/', 'google/', 'apple/'];
  const isCorporate = corporateOrgs.some(org => fullNameLower.startsWith(org));
  const isTutorial = descLower.includes('tutorial') || descLower.includes('learn') || descLower.includes('course');
  
  if (isCorporate && repo.stars > 10000 && !isTutorial) {
    passed = false;
    return { passed, score: 0 };
  }

  // Calculate quality score
  if (repo.stars >= 100 && repo.stars <= 10000) score = 100;
  else if (repo.stars > 10000 && repo.stars <= 50000) score = 80;
  else if (repo.stars >= 50 && repo.stars < 100) score = 70;
  else if (repo.stars >= 10 && repo.stars < 50) score = 50;
  else score = 30;

  return { passed, score };
}

async function fetchReposFromGitHub(query: string, token?: string): Promise<any[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=100`;
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    // Check rate limit headers
    const remaining = response.headers.get('x-ratelimit-remaining');
    const resetTime = response.headers.get('x-ratelimit-reset');
    
    if (!response.ok) {
      if (response.status === 403) {
        // Rate limited - wait and retry
        if (remaining === '0' && resetTime) {
          const waitSeconds = parseInt(resetTime) - Math.floor(Date.now() / 1000) + 5;
          console.log(`  ⏳ Rate limited. Waiting ${waitSeconds}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          // Retry once
          const retryResponse = await fetch(url, { headers });
          if (!retryResponse.ok) {
            throw new Error(`GitHub API error: ${retryResponse.status}`);
          }
          const retryData = await retryResponse.json();
          return retryData.items || [];
        }
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error fetching repos for query "${query}":`, error);
    return [];
  }
}

function transformGitHubRepo(apiRepo: any, clusterName?: string): Repository {
  const tags: string[] = [];
  const descLower = (apiRepo.description || '').toLowerCase();
  const nameLower = (apiRepo.name || '').toLowerCase();
  const fullText = `${nameLower} ${descLower} ${(apiRepo.topics || []).join(' ')}`.toLowerCase();
  
  // Add language (normalized to match onboarding)
  if (apiRepo.language) {
    const lang = apiRepo.language.toLowerCase();
    // Map to onboarding language names
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'cpp': 'c++',
      'csharp': 'c#',
    };
    tags.push(langMap[lang] || lang);
  }
  
  // Add GitHub topics (normalized)
  if (apiRepo.topics) {
    apiRepo.topics.forEach((topic: string) => {
      const normalized = topic.toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');
      tags.push(normalized);
    });
  }
  
  // Detect project types from description/name (matching onboarding PROJECT_TYPES)
  if (fullText.includes('tutorial') || fullText.includes('course') || fullText.includes('learn') || fullText.includes('guide')) {
    tags.push('tutorial', 'course', 'learn');
  }
  if (fullText.includes('boilerplate') || fullText.includes('starter') || fullText.includes('template')) {
    tags.push('boilerplate', 'starter', 'template');
  }
  if (fullText.includes('library') || fullText.includes('package')) {
    tags.push('library', 'package');
  }
  if (fullText.includes('framework')) {
    tags.push('framework');
  }
  if (fullText.includes('app') || fullText.includes('application')) {
    tags.push('full-app', 'application');
  }
  if (fullText.includes('tool') || fullText.includes('utility')) {
    tags.push('tool', 'utility');
  }
  
  // Detect goals (matching onboarding USE_CASES)
  if (fullText.includes('beginner') || fullText.includes('getting started') || fullText.includes('introduction')) {
    tags.push('learning', 'beginner-friendly');
  }
  if (fullText.includes('contribute') || fullText.includes('contributing') || fullText.includes('open source')) {
    tags.push('contributing', 'open-source');
  }
  
  // Add cluster name as tag
  if (clusterName) {
    tags.push(clusterName.toLowerCase());
  }
  
  // Add frameworks (normalized, matching onboarding)
  const allFrameworksLower = ALL_FRAMEWORKS.map(f => f.toLowerCase());
  allFrameworksLower.forEach(framework => {
    const frameworkVariants = [
      framework,
      framework.replace(/\s+/g, '-'),
      framework.replace(/\s+/g, ''),
    ];
    if (frameworkVariants.some(v => fullText.includes(v))) {
      tags.push(framework);
    }
  });
  
  // Remove duplicates and limit to 20 tags (more comprehensive than before)
  const uniqueTags = Array.from(new Set(tags.map(t => t.toLowerCase().trim()))).slice(0, 20);

  return {
    id: apiRepo.id.toString(),
    name: apiRepo.name,
    fullName: apiRepo.full_name,
    description: apiRepo.description || '',
    tags: uniqueTags,
    stars: apiRepo.stargazers_count || 0,
    forks: apiRepo.forks_count || 0,
    lastUpdated: formatTimeAgo(apiRepo.updated_at),
    language: apiRepo.language || undefined,
    url: apiRepo.html_url,
    owner: {
      login: apiRepo.owner.login,
      avatarUrl: apiRepo.owner.avatar_url,
    },
    license: apiRepo.license?.name,
    topics: apiRepo.topics || [],
  };
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

async function curateCluster(
  clusterName: string,
  config: ClusterConfig & { githubToken?: string },
  supabaseClient: any
) {
  console.log(`\n🔄 Curating ${clusterName} cluster...`);

  const allRepos: any[] = [];

  // Fetch repos for each search query
  // We'll fetch ALL queries to ensure comprehensive coverage
  console.log(`  Total queries to fetch: ${config.searchQueries.length}`);
  
  for (let i = 0; i < config.searchQueries.length; i++) {
    const query = config.searchQueries[i];
    const searchQuery = `${query} stars:>50 stars:<50000`;
    console.log(`  [${i + 1}/${config.searchQueries.length}] Fetching: ${searchQuery}`);
    
    try {
      const repos = await fetchReposFromGitHub(searchQuery, config.githubToken);
      allRepos.push(...repos);
      console.log(`    ✓ Found ${repos.length} repos`);
    } catch (error) {
      console.error(`    ⚠️  Error fetching "${query}":`, error);
      // Continue with other queries even if one fails
    }
    
    // Delay to avoid rate limits (1.5s between queries)
    if (i < config.searchQueries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Deduplicate by ID
  const uniqueRepos = Array.from(
    new Map(allRepos.map(r => [r.id, r])).values()
  );

  console.log(`  Found ${uniqueRepos.length} unique repos`);

  // Transform and quality filter (pass clusterName for proper tagging)
  const transformed = uniqueRepos.map(repo => transformGitHubRepo(repo, clusterName));
  const qualityRepos = transformed.filter(repo => {
    const quality = validateRepoQuality(repo, 50);
    return quality.passed;
  });

  console.log(`  ${qualityRepos.length} repos passed quality filter`);

  // Score repos by tag matches and quality
  const scored = qualityRepos
    .map(repo => {
      const quality = validateRepoQuality(repo, 50);
      const tagMatches = config.tags.filter(tag =>
        repo.tags.some(rTag => rTag.toLowerCase().includes(tag.toLowerCase())) ||
        repo.topics?.some(topic => topic.toLowerCase().includes(tag.toLowerCase()))
      ).length;

      return {
        repo,
        qualityScore: quality.score,
        tagMatches,
        combinedScore: quality.score * 0.7 + (tagMatches / config.tags.length) * 100 * 0.3,
      };
    })
    .sort((a, b) => {
      // Sort by combined score
      if (b.combinedScore !== a.combinedScore) {
        return b.combinedScore - a.combinedScore;
      }
      // Then by tag matches
      if (b.tagMatches !== a.tagMatches) {
        return b.tagMatches - a.tagMatches;
      }
      // Then by quality
      return b.qualityScore - a.qualityScore;
    })
    .slice(0, 500); // Top 500 per cluster (target: 500+ repos per cluster for better coverage)

  console.log(`  Selected top ${scored.length} repos (target: 500+ repos per cluster)`);

  // Store in Supabase
  let storedCount = 0;

  for (const item of scored) {
    // Combine tags from config and repo
    const allTags = [
      ...new Set([
        ...config.tags.filter(tag =>
          item.repo.tags.some(rTag => rTag.toLowerCase().includes(tag.toLowerCase())) ||
          item.repo.topics?.some(topic => topic.toLowerCase().includes(tag.toLowerCase()))
        ),
        ...item.repo.tags,
      ])
    ].slice(0, 10); // Limit to 10 tags

    const { error } = await supabaseClient
      .from('repo_clusters')
      .upsert({
        cluster_name: clusterName,
        repo_id: item.repo.id,
        repo_data: item.repo,
        tags: allTags,
        quality_score: item.qualityScore,
        rotation_priority: Math.floor(Math.random() * 100), // For rotation
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cluster_name,repo_id',
      });

    if (error) {
      console.error(`  ❌ Error storing repo ${item.repo.id}:`, error.message);
    } else {
      storedCount++;
    }
  }

  // Update cluster metadata
  await supabaseClient
    .from('cluster_metadata')
    .upsert({
      cluster_name: clusterName,
      display_name: clusterName.split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' '),
      description: config.description,
      icon: config.icon,
      repo_count: storedCount,
      last_curated_at: new Date().toISOString(),
      is_active: true,
    }, {
      onConflict: 'cluster_name',
    });

  console.log(`  ✅ Stored ${storedCount} repos for ${clusterName} cluster`);
}

// Main execution
async function main() {
  // Try both VITE_ prefixed and non-prefixed env vars
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const githubToken = process.env.VITE_GITHUB_API_TOKEN || process.env.GITHUB_API_TOKEN || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log('🚀 Starting cluster curation...');
  console.log(`📦 Will curate ${Object.keys(CLUSTERS).length} clusters`);

  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  // Curate each cluster
  for (const [clusterName, config] of Object.entries(CLUSTERS)) {
    await curateCluster(clusterName, { ...config, githubToken }, supabaseClient);
    // Delay between clusters
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ Cluster curation complete!');
}

// Run if executed directly
// In ES modules, we just call main() directly
main().catch(console.error);

export { curateCluster, CLUSTERS };
