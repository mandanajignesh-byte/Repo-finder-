/**
 * Improved Cluster Curation Script
 * Fetches REAL coding repos for each cluster - excludes no-code tools, AI agents, claude skills
 * Focuses on repos that actual programmers/coders would love
 * 
 * Usage: npx tsx scripts/curate-clusters-improved.ts
 */

import dotenv from 'dotenv';
import { Repository } from '../src/lib/types';
import { createClient } from '@supabase/supabase-js';

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

// All frameworks from onboarding form
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

// Project types with targeted keywords
const PROJECT_TYPE_KEYWORDS = {
  'tutorial': ['tutorial', 'course', 'learn', 'guide', 'example', 'walkthrough'],
  'boilerplate': ['boilerplate', 'starter', 'template', 'scaffold'],
  'library': ['library', 'package', 'sdk', 'module'],
  'framework': ['framework', 'toolkit'],
  'full-app': ['app', 'application', 'project'],
  'tool': ['tool', 'utility', 'cli', 'command-line']
};

/**
 * Generate targeted search queries for each cluster
 * Creates specific queries for language + framework + project type combinations
 */
function generateTargetedQueries(clusterName: string, baseKeywords: string[]): string[] {
  const queries: string[] = [];
  
  // Base cluster queries
  queries.push(...baseKeywords.map(k => `${k} stars:>50`));
  
  // Language-specific queries (more targeted)
  const relevantLanguages = getRelevantLanguages(clusterName);
  relevantLanguages.forEach(lang => {
    const langLower = lang.toLowerCase();
    
    // Language + project type combinations
    queries.push(`${langLower} tutorial stars:>100`);
    queries.push(`${langLower} library stars:>200`);
    queries.push(`${langLower} framework stars:>300`);
    queries.push(`${langLower} boilerplate stars:>100`);
    queries.push(`${langLower} example stars:>100`);
    
    // Language + cluster-specific
    queries.push(`${langLower} ${clusterName} stars:>100`);
  });
  
  // Framework-specific queries
  const relevantFrameworks = getRelevantFrameworks(clusterName);
  relevantFrameworks.forEach(framework => {
    const frameworkQuery = framework.toLowerCase().replace(/\s+/g, '-');
    
    // Framework + project type
    queries.push(`${frameworkQuery} tutorial stars:>100`);
    queries.push(`${frameworkQuery} example stars:>100`);
    queries.push(`${frameworkQuery} boilerplate stars:>100`);
    queries.push(`${frameworkQuery} starter stars:>100`);
    
    // Framework + cluster
    queries.push(`${frameworkQuery} ${clusterName} stars:>100`);
  });
  
  // Domain + project type combinations
  queries.push(`${clusterName} tutorial stars:>100`);
  queries.push(`${clusterName} course stars:>100`);
  queries.push(`${clusterName} boilerplate stars:>100`);
  queries.push(`${clusterName} example stars:>100`);
  queries.push(`${clusterName} library stars:>200`);
  queries.push(`${clusterName} framework stars:>300`);
  
  return queries;
}

/**
 * Get relevant languages for each cluster
 */
function getRelevantLanguages(clusterName: string): string[] {
  switch (clusterName) {
    case 'frontend':
      return ['JavaScript', 'TypeScript', 'HTML', 'CSS'];
    case 'backend':
      return ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'PHP', 'Ruby', 'Scala', 'Elixir'];
    case 'mobile':
      return ['JavaScript', 'TypeScript', 'Swift', 'Kotlin', 'Dart', 'Java'];
    case 'ai-ml':
      return ['Python', 'R', 'JavaScript', 'TypeScript'];
    case 'data-science':
      return ['Python', 'R', 'Scala', 'JavaScript'];
    case 'game-dev':
      return ['C++', 'C#', 'JavaScript', 'TypeScript', 'Python', 'Rust'];
    case 'devops':
      return ['Go', 'Python', 'Bash', 'JavaScript', 'TypeScript'];
    case 'desktop':
      return ['JavaScript', 'TypeScript', 'C++', 'C#', 'Rust', 'Python'];
    default:
      return ALL_LANGUAGES;
  }
}

/**
 * Get relevant frameworks for each cluster
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
    tags: [
      'javascript', 'typescript', 'html', 'css',
      'react', 'vue', 'angular', 'next.js', 'nuxt', 'svelte',
      'tutorial', 'course', 'learn', 'guide', 'example', 'boilerplate', 'starter', 'template', 'library', 'package', 'framework',
      'ui-components', 'animations', 'css-framework', 'frontend', 'web-frontend'
    ],
    searchQueries: generateTargetedQueries('frontend', ['react', 'vue', 'angular', 'ui-components', 'css-framework', 'frontend-framework']),
    description: 'Frontend development frameworks, libraries, and tools',
    icon: '🌐',
  },
  backend: {
    tags: [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'ruby', 'scala', 'elixir',
      'express', 'fastapi', 'django', 'flask', 'spring', 'laravel',
      'tutorial', 'course', 'learn', 'boilerplate', 'starter', 'template', 'library', 'package', 'framework', 'api', 'rest', 'graphql',
      'nodejs', 'backend', 'web-backend', 'server', 'api-framework'
    ],
    searchQueries: generateTargetedQueries('backend', ['nodejs', 'express', 'django', 'flask', 'api-framework', 'backend-framework', 'rest-api', 'graphql']),
    description: 'Backend frameworks, APIs, and server-side tools',
    icon: '⚙️',
  },
  'ai-ml': {
    tags: [
      'python', 'r', 'javascript', 'typescript',
      'tensorflow', 'pytorch', 'pandas', 'numpy',
      'tutorial', 'course', 'learn', 'library', 'package', 'framework',
      'machine-learning', 'ai', 'neural-network', 'deep-learning', 'nlp', 'ai-ml'
    ],
    searchQueries: generateTargetedQueries('ai-ml', ['machine-learning', 'tensorflow', 'pytorch', 'ai', 'deep-learning', 'neural-network', 'nlp']),
    description: 'Artificial Intelligence and Machine Learning libraries',
    icon: '🤖',
  },
  mobile: {
    tags: [
      'javascript', 'typescript', 'swift', 'kotlin', 'dart', 'java',
      'flutter', 'react-native', 'ionic', 'electron',
      'tutorial', 'course', 'learn', 'boilerplate', 'starter', 'template', 'library', 'framework', 'full-app',
      'ios', 'android', 'mobile-app', 'mobile', 'mobile-development'
    ],
    searchQueries: generateTargetedQueries('mobile', ['react-native', 'flutter', 'mobile-app', 'ios-framework', 'android-framework', 'mobile-development']),
    description: 'Mobile app development frameworks and tools',
    icon: '📱',
  },
  devops: {
    tags: [
      'go', 'python', 'bash', 'shell', 'javascript', 'typescript',
      'docker', 'kubernetes', 'terraform', 'ansible',
      'tutorial', 'course', 'learn', 'tool', 'utility', 'library', 'package',
      'ci-cd', 'devops', 'infrastructure', 'automation'
    ],
    searchQueries: generateTargetedQueries('devops', ['docker', 'kubernetes', 'devops-tools', 'ci-cd', 'infrastructure', 'terraform', 'ansible']),
    description: 'DevOps tools, CI/CD, and infrastructure management',
    icon: '🔧',
  },
  'data-science': {
    tags: [
      'python', 'r', 'scala', 'javascript',
      'pandas', 'numpy', 'tensorflow', 'pytorch',
      'tutorial', 'course', 'learn', 'library', 'package', 'tool',
      'data-science', 'jupyter', 'analytics', 'data-visualization', 'data-analysis'
    ],
    searchQueries: generateTargetedQueries('data-science', ['data-science', 'pandas', 'analytics', 'jupyter', 'data-visualization', 'data-analysis']),
    description: 'Data science libraries, analytics, and visualization tools',
    icon: '📊',
  },
  'game-dev': {
    tags: [
      'c++', 'c#', 'javascript', 'typescript', 'python', 'rust',
      'unity', 'unreal', 'godot', 'phaser',
      'tutorial', 'course', 'learn', 'framework', 'library', 'full-app',
      'game-development', 'game-engine', 'gamedev', 'game-dev', 'graphics', 'game'
    ],
    searchQueries: generateTargetedQueries('game-dev', ['game-development', 'unity', 'unreal-engine', 'game-engine', 'gamedev']),
    description: 'Game development engines, frameworks, and tools',
    icon: '🎮',
  },
  'desktop': {
    tags: [
      'javascript', 'typescript', 'c++', 'c#', 'rust', 'python',
      'electron', 'tauri', 'qt', 'gtk',
      'tutorial', 'course', 'learn', 'framework', 'library', 'full-app', 'application',
      'desktop-app', 'desktop', 'desktop-application', 'native-app'
    ],
    searchQueries: generateTargetedQueries('desktop', ['desktop-application', 'electron', 'tauri', 'desktop-app']),
    description: 'Desktop application development frameworks and tools',
    icon: '💻',
  },
};

/**
 * Enhanced quality validation - EXCLUDES no-code tools, AI agents, claude skills
 */
function validateRepoQuality(repo: any, minStars: number): { passed: boolean; score: number; reason?: string } {
  let score = 100;
  let passed = true;
  let reason = '';

  // Check minimum stars
  if (repo.stargazers_count < minStars) {
    return { passed: false, score: 0, reason: 'Too few stars' };
  }

  // Must have description
  if (!repo.description || repo.description.length < 20) {
    return { passed: false, score: 0, reason: 'No description' };
  }

  const descLower = (repo.description || '').toLowerCase();
  const nameLower = (repo.name || '').toLowerCase();
  const fullNameLower = (repo.full_name || '').toLowerCase();
  const fullText = `${nameLower} ${descLower} ${(repo.topics || []).join(' ')}`.toLowerCase();

  // EXCLUDE: No-code tools and platforms
  const noCodeKeywords = [
    'no-code', 'nocode', 'no code',
    'low-code', 'lowcode', 'low code',
    'visual builder', 'drag and drop builder',
    'bubble.io', 'webflow', 'airtable',
    'zapier integration', 'make.com',
    'notion template', 'coda template',
    'automation without code'
  ];
  if (noCodeKeywords.some(keyword => fullText.includes(keyword))) {
    return { passed: false, score: 0, reason: 'No-code tool' };
  }

  // EXCLUDE: AI agents and claude skills
  const aiAgentKeywords = [
    'claude skill', 'claude skills',
    'ai agent', 'ai agents',
    'anthropic claude', 'claude api wrapper',
    'automated agent', 'agent framework',
    'ai assistant tool', 'ai chatbot builder',
    'conversational ai', 'ai automation tool',
    'claude integration', 'claude wrapper'
  ];
  if (aiAgentKeywords.some(keyword => fullText.includes(keyword))) {
    return { passed: false, score: 0, reason: 'AI agent/claude skill' };
  }

  // EXCLUDE: Generic list repos (unless small)
  if ((descLower.includes('awesome list') || descLower.includes('curated list') || descLower.includes('awesome-')) && repo.stargazers_count > 1000) {
    return { passed: false, score: 0, reason: 'Generic awesome list' };
  }

  // EXCLUDE: Mega-corporate repos (unless tutorial/learning)
  const corporateOrgs = ['microsoft/', 'facebook/', 'google/', 'apple/', 'amazon/', 'netflix/'];
  const isCorporate = corporateOrgs.some(org => fullNameLower.startsWith(org));
  const isTutorial = descLower.includes('tutorial') || descLower.includes('learn') || descLower.includes('course') || descLower.includes('guide');
  
  if (isCorporate && repo.stargazers_count > 10000 && !isTutorial) {
    return { passed: false, score: 0, reason: 'Mega-corporate repo (not tutorial)' };
  }

  // EXCLUDE: Repos that are just wrappers or integrations (unless they're libraries)
  const wrapperKeywords = ['wrapper for', 'integration for', 'plugin for', 'extension for'];
  const isLibrary = descLower.includes('library') || descLower.includes('package') || descLower.includes('sdk') || descLower.includes('module');
  if (wrapperKeywords.some(keyword => fullText.includes(keyword)) && !isLibrary && repo.stargazers_count < 500) {
    return { passed: false, score: 0, reason: 'Simple wrapper/integration' };
  }

  // REQUIRE: Must have code-related indicators
  const codeIndicators = [
    'library', 'framework', 'sdk', 'package', 'module',
    'tutorial', 'course', 'learn', 'guide', 'example',
    'boilerplate', 'starter', 'template',
    'api', 'cli', 'tool', 'utility',
    'component', 'plugin', 'extension'
  ];
  const hasCodeIndicator = codeIndicators.some(indicator => fullText.includes(indicator));
  
  if (!hasCodeIndicator && repo.stargazers_count < 500) {
    return { passed: false, score: 0, reason: 'No clear code-related purpose' };
  }

  // Calculate quality score
  if (repo.stargazers_count >= 100 && repo.stargazers_count <= 10000) score = 100;
  else if (repo.stargazers_count > 10000 && repo.stargazers_count <= 50000) score = 80;
  else if (repo.stargazers_count >= 50 && repo.stargazers_count < 100) score = 70;
  else if (repo.stargazers_count >= 10 && repo.stargazers_count < 50) score = 50;
  else score = 30;

  return { passed, score, reason: 'Passed' };
}

/**
 * Fetch repos from GitHub with pagination
 */
async function fetchReposFromGitHub(query: string, token?: string, maxPages: number = 3): Promise<any[]> {
  const allRepos: any[] = [];
  let page = 1;
  
  while (page <= maxPages) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=100&page=${page}`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 403) {
          const remaining = response.headers.get('x-ratelimit-remaining');
          if (remaining === '0') {
            const resetTime = response.headers.get('x-ratelimit-reset');
            if (resetTime) {
              const waitSeconds = parseInt(resetTime) - Math.floor(Date.now() / 1000) + 5;
              console.log(`  ⏳ Rate limited. Waiting ${waitSeconds}s...`);
              await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
              continue; // Retry same page
            }
          }
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      const items = data.items || [];
      
      if (items.length === 0) break; // No more results
      
      allRepos.push(...items);
      
      // Check if we have more pages
      if (items.length < 100) break; // Last page
      
      page++;
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1200));
    } catch (error) {
      console.error(`  ⚠️  Error fetching page ${page} for "${query}":`, error);
      break;
    }
  }
  
  return allRepos;
}

function transformGitHubRepo(apiRepo: any, clusterName?: string): Repository {
  const tags: string[] = [];
  const descLower = (apiRepo.description || '').toLowerCase();
  const nameLower = (apiRepo.name || '').toLowerCase();
  const fullText = `${nameLower} ${descLower} ${(apiRepo.topics || []).join(' ')}`.toLowerCase();
  
  // Add language (normalized)
  if (apiRepo.language) {
    const lang = apiRepo.language.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'cpp': 'c++',
      'csharp': 'c#',
    };
    tags.push(langMap[lang] || lang);
  }
  
  // Add GitHub topics
  if (apiRepo.topics) {
    apiRepo.topics.forEach((topic: string) => {
      tags.push(topic.toLowerCase());
    });
  }
  
  // Detect project types
  if (fullText.includes('tutorial') || fullText.includes('course') || fullText.includes('learn') || fullText.includes('guide')) {
    tags.push('tutorial', 'course', 'learn');
  }
  if (fullText.includes('boilerplate') || fullText.includes('starter') || fullText.includes('template')) {
    tags.push('boilerplate', 'starter', 'template');
  }
  if (fullText.includes('library') || fullText.includes('package') || fullText.includes('sdk')) {
    tags.push('library', 'package');
  }
  if (fullText.includes('framework')) {
    tags.push('framework');
  }
  if (fullText.includes('app') || fullText.includes('application')) {
    tags.push('full-app', 'application');
  }
  if (fullText.includes('tool') || fullText.includes('utility') || fullText.includes('cli')) {
    tags.push('tool', 'utility');
  }
  
  // Add cluster name
  if (clusterName) {
    tags.push(clusterName.toLowerCase());
  }
  
  // Add frameworks
  const allFrameworksLower = ALL_FRAMEWORKS.map(f => f.toLowerCase());
  allFrameworksLower.forEach(framework => {
    const variants = [
      framework,
      framework.replace(/\s+/g, '-'),
      framework.replace(/\s+/g, ''),
    ];
    if (variants.some(v => fullText.includes(v))) {
      tags.push(framework.toLowerCase());
    }
  });
  
  // Remove duplicates and limit
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
  console.log(`  📋 ${config.searchQueries.length} search queries`);

  const allRepos: any[] = [];
  const seenIds = new Set<number>();

  // Fetch repos for each query
  for (let i = 0; i < config.searchQueries.length; i++) {
    const query = config.searchQueries[i];
    console.log(`  [${i + 1}/${config.searchQueries.length}] Fetching: ${query}`);
    
    try {
      const repos = await fetchReposFromGitHub(query, config.githubToken, 3); // 3 pages = up to 300 repos per query
      
      // Deduplicate
      repos.forEach(repo => {
        if (!seenIds.has(repo.id)) {
          seenIds.add(repo.id);
          allRepos.push(repo);
        }
      });
      
      console.log(`    ✓ Found ${repos.length} repos (${allRepos.length} unique total)`);
    } catch (error) {
      console.error(`    ⚠️  Error:`, error);
    }
    
    // Delay between queries
    if (i < config.searchQueries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log(`  📦 Total unique repos: ${allRepos.length}`);

  // Transform and quality filter
  const transformed = allRepos.map(repo => transformGitHubRepo(repo, clusterName));
  const qualityRepos = transformed.filter(repo => {
    const quality = validateRepoQuality(repo, 50);
    if (!quality.passed) {
      console.log(`    ❌ Filtered: ${repo.fullName} - ${quality.reason}`);
    }
    return quality.passed;
  });

  console.log(`  ✅ ${qualityRepos.length} repos passed quality filter`);

  // Score and rank repos
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
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      if (b.tagMatches !== a.tagMatches) return b.tagMatches - a.tagMatches;
      return b.qualityScore - a.qualityScore;
    })
    .slice(0, 1000); // Top 1000 repos per cluster

  console.log(`  🎯 Selected top ${scored.length} repos`);

  // Store in Supabase
  let storedCount = 0;
  const batchSize = 50;

  for (let i = 0; i < scored.length; i += batchSize) {
    const batch = scored.slice(i, i + batchSize);
    
    const upserts = batch.map(item => {
      const allTags = [
        ...new Set([
          ...config.tags.filter(tag =>
            item.repo.tags.some(rTag => rTag.toLowerCase().includes(tag.toLowerCase())) ||
            item.repo.topics?.some(topic => topic.toLowerCase().includes(tag.toLowerCase()))
          ),
          ...item.repo.tags,
        ])
      ].slice(0, 15);

      return {
        cluster_name: clusterName,
        repo_id: item.repo.id,
        repo_data: item.repo,
        tags: allTags,
        quality_score: item.qualityScore,
        rotation_priority: Math.floor(Math.random() * 100),
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabaseClient
      .from('repo_clusters')
      .upsert(upserts, {
        onConflict: 'cluster_name,repo_id',
      });

    if (error) {
      console.error(`  ❌ Error storing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    } else {
      storedCount += batch.length;
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

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const githubToken = process.env.VITE_GITHUB_API_TOKEN || process.env.GITHUB_API_TOKEN || process.env.GITHUB_TOKEN || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log('🚀 Starting improved cluster curation...');
  console.log(`📦 Will curate ${Object.keys(CLUSTERS).length} clusters`);
  console.log(`🔍 Focus: REAL coding repos (excluding no-code tools, AI agents, claude skills)`);

  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  // Curate each cluster
  for (const [clusterName, config] of Object.entries(CLUSTERS)) {
    await curateCluster(clusterName, { ...config, githubToken }, supabaseClient);
    // Delay between clusters
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n✅ Cluster curation complete!');
}

main().catch(console.error);

export { curateCluster, CLUSTERS };
