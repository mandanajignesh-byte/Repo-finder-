/**
 * GitHub API Service
 * Handles all GitHub API interactions
 */

import { config } from '@/lib/config';
import { Repository, GitHubApiRepo, TrendingRepo } from '@/lib/types';

// Simple in-memory cache
interface CacheEntry {
  data: Repository[];
  timestamp: number;
  ttl?: number; // Optional custom TTL for this entry
}

class GitHubService {
  private baseUrl = config.github.baseUrl;
  private token = config.github.apiToken;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Debug: Check if token is loaded (only in development)
    if (import.meta.env.DEV) {
      console.log('GitHub token loaded:', this.token ? `${this.token.substring(0, 10)}...` : 'NOT FOUND');
    }
  }

  /**
   * Get cached data or null if expired/missing
   */
  private getCached(key: string): Repository[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    const ttl = entry.ttl || this.CACHE_TTL; // Use custom TTL if available
    if (now - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set cache entry with optional custom TTL
   */
  private setCache(key: string, data: Repository[], customTTL?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTTL,
    });
  }

  /**
   * Parse Link header to check for next page
   */
  private hasNextPage(linkHeader: string | null): boolean {
    if (!linkHeader) return false;
    return linkHeader.includes('rel="next"');
  }

  /**
   * Get authentication headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (this.token) {
      // GitHub accepts both 'token' and 'Bearer' for personal access tokens
      // Using 'Bearer' as it's the preferred format for newer tokens
      headers['Authorization'] = `Bearer ${this.token}`;
    } else {
      console.warn('GitHub API token not found. API calls will be rate-limited to 60/hour.');
    }

    return headers;
  }

  /**
   * Transform GitHub API response to our Repository type
   */
  private transformRepo(apiRepo: GitHubApiRepo): Repository {
    // Create tags array with language + unique topics (case-insensitive deduplication)
    const tagsSet = new Set<string>();
    const tags: string[] = [];
    
    // Add language first if it exists
    if (apiRepo.language) {
      tagsSet.add(apiRepo.language.toLowerCase());
      tags.push(apiRepo.language);
    }
    
    // Add topics, avoiding duplicates (case-insensitive)
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
      lastUpdated: this.formatTimeAgo(apiRepo.pushed_at || apiRepo.updated_at),
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
   * Format date to "time ago" format
   */
  private formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  }

  /**
   * Search repositories with pagination support
   * Based on Python script approach: fetches all pages using Link header
   */
  async searchRepos(query: string, options?: {
    language?: string;
    sort?: 'stars' | 'updated' | 'forks';
    order?: 'asc' | 'desc';
    perPage?: number;
    maxPages?: number; // Safety limit for pagination
    usePagination?: boolean; // Enable pagination to fetch all results
  }): Promise<Repository[]> {
    try {
      // Check cache first
      const cacheKey = `search-${query}-${options?.language || ''}-${options?.sort || 'stars'}`;
      if (!options?.usePagination) {
        const cached = this.getCached(cacheKey);
        if (cached) {
          console.log('Using cached search results');
          return cached;
        }
      }

      let searchQuery = query;
      if (options?.language) {
        searchQuery += ` language:${options.language}`;
      }

      // IMPORTANT: Keep per_page modest to avoid slow 3–6s responses on heavy queries.
      // Default is 30; callers can override but should generally stay <= 50.
      const perPage = options?.perPage || 30;
      const maxPages = options?.maxPages || 3; // Hard cap for defensive pagination
      const allRepos: Repository[] = [];
      let page = 1;

      // Loop through pages (like Python script)
      while (page <= maxPages) {
        const params = new URLSearchParams({
          q: searchQuery,
          sort: options?.sort || 'stars',
          order: options?.order || 'desc',
          per_page: perPage.toString(),
          page: page.toString(),
        });

        const response = await fetch(
          `${this.baseUrl}/search/repositories?${params}`,
          { headers: this.getHeaders() }
        );

        // Handle rate limiting
        if (response.status === 403) {
          const rateLimitReset = response.headers.get('x-ratelimit-reset');
          if (rateLimitReset) {
            const resetTime = parseInt(rateLimitReset) * 1000;
            const waitTime = resetTime - Date.now();
            if (waitTime > 0) {
              console.warn(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue; // Retry
            }
          }
        }

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage += ` - ${errorJson.message}`;
            }
          } catch {
            if (errorText) {
              errorMessage += ` - ${errorText}`;
            }
          }
          console.error('GitHub API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const repos = data.items.map((repo: GitHubApiRepo) => this.transformRepo(repo));
        
        // Extend list (like Python's extend())
        allRepos.push(...repos);

        // Check for next page using Link header (like Python script checks response.links)
        const linkHeader = response.headers.get('link');
        const hasNext = this.hasNextPage(linkHeader);

        // If no next page or got fewer results than perPage, we're done
        if (!options?.usePagination || !hasNext || repos.length < perPage) {
          break;
        }

        page++;

        // Small delay to be respectful of API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Cache results if not using pagination
      if (!options?.usePagination && allRepos.length > 0) {
        this.setCache(cacheKey, allRepos);
      }

      return allRepos;
    } catch (error) {
      console.error('Error searching repos:', error);
      throw error;
    }
  }

  /**
   * Filter out well-known/generic repos to surface unknown gems
   * Helps users discover lesser-known but trending repositories
   */
  private filterUnknownGems(repos: Repository[]): Repository[] {
    // Well-known organizations that typically have very popular repos
    const wellKnownOrgs = new Set([
      'facebook', 'microsoft', 'google', 'apple', 'amazon', 'netflix',
      'uber', 'airbnb', 'twitter', 'meta', 'openai', 'anthropic',
      'mozilla', 'apache', 'eclipse', 'torvalds', 'kubernetes',
      'docker', 'hashicorp', 'elastic', 'mongodb', 'redis',
      'nodejs', 'vercel', 'zeit', 'github', 'gitlab',
      'adobe', 'oracle', 'salesforce', 'vmware', 'redhat',
      'canonical', 'ubuntu', 'debian', 'archlinux',
    ]);

    // Very popular repo names/patterns to exclude
    const wellKnownRepos = new Set([
      'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt',
      'linux', 'tensorflow', 'pytorch', 'kubernetes', 'docker',
      'vscode', 'atom', 'electron', 'node', 'express', 'django',
      'rails', 'spring', 'laravel', 'flask', 'fastapi',
      'typescript', 'javascript', 'python', 'java', 'go', 'rust',
      'freecodecamp', 'awesome', 'the-book', '30-seconds',
      'jquery', 'bootstrap', 'tailwindcss', 'webpack', 'babel',
    ]);

    // Popular full repository names to exclude
    const popularFullNames = [
      'facebook/react',
      'microsoft/vscode',
      'torvalds/linux',
      'vercel/next.js',
      'vuejs/vue',
      'angular/angular',
      'nodejs/node',
      'python/cpython',
      'golang/go',
      'rust-lang/rust',
      'microsoft/typescript',
      'freecodecamp/freecodecamp',
      'tensorflow/tensorflow',
      'pytorch/pytorch',
      'kubernetes/kubernetes',
      'docker/docker',
      'microsoft/windows',
      'apple/swift',
      'facebook/react-native',
    ];

    return repos.filter(repo => {
      const owner = repo.owner.login.toLowerCase();
      const repoName = repo.name.toLowerCase();
      const fullName = repo.fullName.toLowerCase();

      // Filter 1: Exclude repos from well-known organizations
      if (wellKnownOrgs.has(owner)) {
        return false;
      }

      // Filter 2: Exclude repos with extremely high star counts (>50k = already well-known)
      if (repo.stars > 50000) {
        return false;
      }

      // Filter 3: Exclude repos with very common/well-known names
      if (wellKnownRepos.has(repoName) || wellKnownRepos.has(owner)) {
        return false;
      }

      // Filter 4: Exclude repos that are too generic (e.g., "awesome-*" with 10k+ stars)
      if (repoName.startsWith('awesome-') && repo.stars > 10000) {
        return false;
      }

      // Filter 5: Exclude repos from very popular full names
      if (popularFullNames.some(name => fullName.includes(name))) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get trending repositories with pagination
   * Note: GitHub doesn't have an official trending API, so we use search with recent activity
   * Strategy for daily trending:
   * 1. Find repos with recent activity (pushed in last 24h)
   * 2. Find newly created repos that are gaining traction
   * 3. Combine and sort by stars to get the most popular trending repos
   * 4. Filter out well-known repos to surface unknown gems (by default)
   */
  async getTrendingRepos(options?: {
    language?: string;
    since?: 'daily' | 'weekly' | 'monthly';
    perPage?: number;
    usePagination?: boolean;
    excludeWellKnown?: boolean; // New option: filter out well-known repos (default: true)
  }): Promise<TrendingRepo[]> {
    try {
      const since = options?.since || 'daily';
      
      // Create date-based cache key that refreshes daily/weekly/monthly
      const today = new Date();
      let cacheDateKey: string;
      
      if (since === 'daily') {
        // Cache key includes today's date - refreshes once per day
        cacheDateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (since === 'weekly') {
        // Cache key includes week number - refreshes once per week
        const weekNumber = this.getWeekNumber(today);
        cacheDateKey = `${today.getFullYear()}-W${weekNumber}`;
      } else {
        // Cache key includes month - refreshes once per month
        cacheDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      }
      
      const cacheKey = `trending-${since}-${cacheDateKey}-${options?.language || 'all'}-${options?.excludeWellKnown !== false ? 'filtered' : 'all'}`;
      
      // Check date-based cache first
      const cached = this.getCached(cacheKey);
      if (cached) {
        console.log(`Using cached trending repos for ${since} (${cacheDateKey})`);
        // Convert to TrendingRepo format
        return cached.map((repo, index) => ({
          ...repo,
          rank: index + 1,
          trending: this.calculateTrendingScore(repo.stars, since),
        })) as TrendingRepo[];
      }

      // Try to fetch from database first (if available)
      try {
        const { supabaseService } = await import('./supabase.service');
        const dbRepos = await supabaseService.getTrendingRepos({
          timeRange: since,
          language: options?.language,
          excludeWellKnown: options?.excludeWellKnown !== false,
          limit: options?.perPage || 100,
        });

        if (dbRepos && dbRepos.length > 0) {
          console.log(`Using ${dbRepos.length} trending repos from database for ${since} (${cacheDateKey})`);
          
          // Convert database format to TrendingRepo format
          const trendingRepos: TrendingRepo[] = dbRepos.map((dbRepo: any) => ({
            id: dbRepo.repo_id,
            name: dbRepo.repo_name,
            fullName: dbRepo.repo_full_name,
            description: dbRepo.repo_description || '',
            tags: dbRepo.repo_tags || [],
            stars: dbRepo.repo_stars || 0,
            forks: dbRepo.repo_forks || 0,
            lastUpdated: dbRepo.repo_updated_at || dbRepo.repo_pushed_at || '',
            language: dbRepo.repo_language || undefined,
            url: dbRepo.repo_url,
            owner: {
              login: dbRepo.repo_owner_login || '',
              avatarUrl: dbRepo.repo_owner_avatar_url || '',
            },
            topics: dbRepo.repo_topics || [],
            trending: dbRepo.trending_score || this.calculateTrendingScore(dbRepo.repo_stars || 0, since),
            rank: dbRepo.rank || 0,
          }));

          // Cache the results
          const dailyTTL = 24 * 60 * 60 * 1000; // 24 hours
          this.setCache(cacheKey, trendingRepos.map(({ trending, rank, ...repo }) => repo), dailyTTL);
          
          return trendingRepos;
        }
      } catch (dbError) {
        console.log('Database fetch failed, falling back to API:', dbError);
        // Continue to API fallback
      }
      
      const date = new Date();
      
      // Calculate date range based on since parameter
      if (since === 'daily') {
        date.setDate(date.getDate() - 1);
      } else if (since === 'weekly') {
        date.setDate(date.getDate() - 7);
      } else {
        date.setMonth(date.getMonth() - 1);
      }

      const dateStr = date.toISOString().split('T')[0];
      const allRepos: Repository[] = [];
      const repoMap = new Map<string, Repository>(); // To deduplicate
      
      // Strategy 1: Repos with recent activity (pushed) - these are actively maintained
      // For daily, look for repos pushed in last 24 hours with good star count
      const minStars = since === 'daily' ? 20 : since === 'weekly' ? 50 : 100;
      let query1 = `pushed:>${dateStr} stars:>${minStars}`;

      if (options?.language) {
        query1 += ` language:${options.language}`;
      }

      const recentActivityRepos = await this.searchRepos(query1, {
        sort: 'stars',
        order: 'desc',
        perPage: options?.perPage || 100,
        usePagination: false,
      });

      // Add to map (deduplicate by repo ID)
      recentActivityRepos.forEach(repo => {
        repoMap.set(repo.id, repo);
      });

      // Strategy 2: Newly created repos that are gaining traction (for daily/weekly)
      // These are fresh repos that are getting attention
      if (since === 'daily' || since === 'weekly') {
        const createdDate = new Date();
        if (since === 'daily') {
          createdDate.setDate(createdDate.getDate() - 7); // Created in last 7 days
        } else {
          createdDate.setDate(createdDate.getDate() - 30); // Created in last 30 days
        }
        const createdDateStr = createdDate.toISOString().split('T')[0];
        
        let query2 = `created:>${createdDateStr} pushed:>${dateStr} stars:>10`;
        
        if (options?.language) {
          query2 += ` language:${options.language}`;
        }

        const newRepos = await this.searchRepos(query2, {
          sort: 'stars',
          order: 'desc',
          perPage: 50, // Get fewer new repos
          usePagination: false,
        });

        // Add to map (will overwrite if duplicate, keeping the one with more stars)
        newRepos.forEach(repo => {
          const existing = repoMap.get(repo.id);
          if (!existing || repo.stars > existing.stars) {
            repoMap.set(repo.id, repo);
          }
        });
      }

      // Convert map to array and sort by stars
      allRepos.push(...Array.from(repoMap.values()));
      allRepos.sort((a, b) => b.stars - a.stars);

      // Filter out well-known repos to surface unknown gems (default: true)
      let filteredRepos = allRepos;
      if (options?.excludeWellKnown !== false) { // Default to true if not specified
        filteredRepos = this.filterUnknownGems(allRepos);
        
        // If filtering removed too many repos, get more to fill the quota
        if (filteredRepos.length < (options?.perPage || 100) && allRepos.length > filteredRepos.length) {
          // Add some more repos from the filtered list, but still exclude the most popular
          const additionalRepos = this.filterUnknownGems(allRepos.slice(filteredRepos.length));
          filteredRepos = [...filteredRepos, ...additionalRepos];
        }
      }

      // Limit to requested perPage
      const limitedRepos = filteredRepos.slice(0, options?.perPage || 100);

      // Calculate trending score (stars gained recently)
      const trendingRepos = limitedRepos.map((repo, index) => ({
        ...repo,
        rank: index + 1,
        trending: this.calculateTrendingScore(repo.stars, since),
      }));

      // Cache results with date-based key (will auto-refresh daily/weekly/monthly)
      // Use a long TTL (24 hours) since the date in the key ensures daily refresh
      const dailyTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      this.setCache(cacheKey, limitedRepos, dailyTTL);
      
      return trendingRepos;
    } catch (error) {
      console.error('Error fetching trending repos:', error);
      throw error;
    }
  }

  /**
   * Get week number for a given date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Calculate trending score display
   */
  private calculateTrendingScore(stars: number, since: string): string {
    // This is a simplified calculation
    // In production, you'd track star growth over time
    const growth = Math.floor(stars * 0.1); // Simulated growth
    
    if (since === 'daily') {
      return `+${growth} today`;
    } else if (since === 'weekly') {
      return `+${growth * 7} this week`;
    }
    return `+${growth * 30} this month`;
  }

  /**
   * Get repository by full name (owner/repo)
   */
  async getRepo(fullName: string): Promise<Repository> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${fullName}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const apiRepo: GitHubApiRepo = await response.json();
      return this.transformRepo(apiRepo);
    } catch (error) {
      console.error('Error fetching repo:', error);
      throw error;
    }
  }

  /**
   * Get README markdown for a repository by full name (owner/repo).
   * Uses GitHub's /readme endpoint and decodes the base64 content.
   */
  async getRepoReadme(fullName: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${fullName}/readme`, {
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        // Many repos simply don't have a README
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('GitHub README error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`GitHub README error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.content || typeof data.content !== 'string') {
        return null;
      }

      // README content is base64 encoded
      let decoded: string;
      try {
        if (typeof atob === 'function') {
          decoded = atob(data.content.replace(/\n/g, ''));
        } else {
          // Fallback for environments without atob (shouldn't normally run in browser)
          // eslint-disable-next-line no-undef
          decoded = Buffer.from(data.content, 'base64').toString('utf-8');
        }
      } catch (decodeError) {
        console.error('Failed to decode README content:', decodeError);
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Error fetching repo README:', error);
      return null;
    }
  }

  /**
   * Get repositories by topics
   */
  async getReposByTopics(topics: string[], perPage = 30): Promise<Repository[]> {
    try {
      const topicQuery = topics.map(t => `topic:${t}`).join(' ');
      return this.searchRepos(topicQuery, {
        sort: 'stars',
        order: 'desc',
        perPage,
      });
    } catch (error) {
      console.error('Error fetching repos by topics:', error);
      throw error;
    }
  }
}

export const githubService = new GitHubService();
