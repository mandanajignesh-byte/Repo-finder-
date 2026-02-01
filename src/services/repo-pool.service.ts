/**
 * Repository Pool Service
 * Pre-fetches and caches 100+ best repos based on user preferences
 * Provides a pool of repos that can be progressively shown and refined
 */

import { Repository, UserPreferences } from '@/lib/types';
import { githubService } from './github.service';
import { enhancedRecommendationService } from './enhanced-recommendation.service';
import { interactionService } from './interaction.service';
import { supabaseService } from './supabase.service';
import { clusterService } from './cluster.service';
import { repoQualityService } from './repo-quality.service';
import { supabase } from '@/lib/supabase';

const POOL_SIZE = 100; // REDUCED: Pre-fetch 100 repos (was 150) for faster initial loading
const POOL_CACHE_KEY = 'github_repo_app_repo_pool';
const POOL_CACHE_TIMESTAMP_KEY = 'github_repo_app_repo_pool_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface RepoPool {
  repos: Repository[];
  preferences: UserPreferences;
  timestamp: number;
}

class RepoPoolService {
  private pool: Repository[] = [];
  private currentPreferences: UserPreferences | null = null;

  /**
   * Build and cache a pool of repos based on preferences
   * HYBRID APPROACH:
   * 1. First-time users: Use pre-curated clusters (0 API calls)
   * 2. Engaged users: Mix of pre-curated + dynamic (minimal API calls)
   */
  async buildPool(preferences: UserPreferences): Promise<Repository[]> {
    try {
      const userId = await supabaseService.getOrCreateUserId();
      const preferencesHash = this.hashPreferences(preferences);
      
      // OPTIMIZATION: Get seen repo IDs in parallel with primary cluster fetch
      // This was a sequential bottleneck - now runs in parallel!
      // REDUCED LIMIT: Fetch fewer repos initially for faster loading (100 instead of 200)
      const primaryCluster = preferences.primaryCluster;
      const [allSeenRepoIds, primaryRepos] = await Promise.all([
        supabaseService.getAllSeenRepoIds(userId),
        primaryCluster ? clusterService.getBestOfCluster(
          primaryCluster,
          100, // REDUCED: Get 100 instead of 200 for faster initial load
          [], // Will filter with allSeenRepoIds after we get it
          userId
        ) : Promise.resolve([]),
      ]);
      
      // PRIORITY 1: Use PRIMARY CLUSTER if set (from new onboarding)
      let clusterRepos: Repository[] = [];
      
      if (primaryCluster && primaryRepos.length > 0) {
        console.log(`🎯 Using PRIMARY CLUSTER: ${primaryCluster}`);
        // Now filter out seen repos
        clusterRepos = primaryRepos
          .filter(r => r && r.id && !allSeenRepoIds.includes(r.id));
        console.log(`📊 Found ${clusterRepos.length} repos from primary cluster (after filtering seen repos)`);
        
        // Filter by tech stack, goals, and project types if specified
        if ((preferences.techStack?.length ?? 0) > 0 || (preferences.goals?.length ?? 0) > 0 || (preferences.projectTypes?.length ?? 0) > 0) {
          clusterRepos = this.filterReposByPreferences(clusterRepos, preferences);
          console.log(`📊 After filtering by preferences: ${clusterRepos.length} repos`);
        }
      }
      
      // PRIORITY 2: Supplement with SECONDARY CLUSTERS
      if (preferences.secondaryClusters && preferences.secondaryClusters.length > 0 && clusterRepos.length < POOL_SIZE) {
        console.log(`➕ Supplementing with SECONDARY CLUSTERS: ${preferences.secondaryClusters.join(', ')}`);
        let excludeIds = [...allSeenRepoIds, ...clusterRepos.map(r => r.id)];
        
        for (const secondaryCluster of preferences.secondaryClusters) {
          if (clusterRepos.length >= POOL_SIZE) break;
          
          const secondaryRepos = await clusterService.getBestOfCluster(
            secondaryCluster,
            POOL_SIZE - clusterRepos.length,
            excludeIds,
            userId
          );
          
          const validSecondaryRepos = secondaryRepos.filter(r => r && r.id);
          // Deduplicate when combining
          const combined = [...clusterRepos, ...validSecondaryRepos];
          clusterRepos = Array.from(
            new Map(combined.map(r => [r.id, r])).values()
          );
          // Update excludeIds to include all current cluster repos
          excludeIds = [...new Set([...excludeIds, ...clusterRepos.map(r => r.id)])];
        }
        console.log(`📊 After secondary clusters: ${clusterRepos.length} repos`);
      }
      
      // PRIORITY 3: If no primary cluster, use tag-based search
      if (clusterRepos.length < 50) {
        console.log('🔍 Building comprehensive tags for tag-based search...');
        const uniqueTags = this.buildComprehensiveTags(preferences);
        
        if (uniqueTags.length > 0) {
          // REDUCED LIMIT: Fetch 150 instead of 300 for faster loading
          const tagRepos = await clusterService.getReposByTags(
            uniqueTags,
            150,
            [...allSeenRepoIds, ...clusterRepos.map(r => r.id)],
            userId
          );
          
          const validTagRepos = tagRepos.filter(r => r && r.id);
          // Deduplicate when combining
          const combined = [...clusterRepos, ...validTagRepos];
          clusterRepos = Array.from(
            new Map(combined.map(r => [r.id, r])).values()
          );
          console.log(`📊 After tag search: ${clusterRepos.length} repos`);
        }
      }
      
      // PRIORITY 4: Fallback to detected primary cluster (for backward compatibility)
      if (clusterRepos.length < 50) {
        const detectedPrimary = clusterService.detectPrimaryCluster(preferences);
        console.log(`⚠️ Only ${clusterRepos.length} repos, trying detected primary cluster: ${detectedPrimary}`);
        
        // REDUCED LIMIT: Fetch 100 instead of 200 for faster loading
        const fallbackRepos = await clusterService.getBestOfCluster(
          detectedPrimary,
          100,
          [...allSeenRepoIds, ...clusterRepos.map(r => r.id)],
          userId
        );
        
        const validFallbackRepos = fallbackRepos.filter(r => r && r.id);
        // Deduplicate when combining
        const combined = [...clusterRepos, ...validFallbackRepos];
        clusterRepos = Array.from(
          new Map(combined.map(r => [r.id, r])).values()
        );
        console.log(`📊 After fallback: ${clusterRepos.length} repos`);
      }
      
      // Finalize: Use cluster repos if we have any (even if less than 50)
      // This ensures we always prioritize curated repos over generic trending
      if (clusterRepos.length > 0) {
        console.log(`✅ Using ${clusterRepos.length} curated cluster repos (0 API calls)`);
        const shuffled = this.shuffleReposForUser(clusterRepos, userId);
        // Filter out undefined repos and deduplicate by ID
        const validRepos = shuffled.filter(repo => repo && repo.id);
        const uniqueRepos = Array.from(
          new Map(validRepos.map(r => [r.id, r])).values()
        );
        this.pool = uniqueRepos.slice(0, POOL_SIZE);
        this.currentPreferences = preferences;
        this.cachePool(this.pool, preferences);
        await this.savePoolToSupabase(this.pool, preferences, userId, preferencesHash);
        return this.pool;
      }
      
      // Only if we have ZERO cluster repos, try Supabase cache
      const supabasePool = await supabaseService.getRepoPool(userId);
      if (supabasePool && supabasePool.length >= 20) {
        // Check if preferences match
        const poolData = await this.getPoolMetadata(userId);
        if (poolData && poolData.preferences_hash === preferencesHash) {
          this.pool = supabasePool;
          this.currentPreferences = preferences;
          this.cachePool(supabasePool, preferences);
          this.refreshPoolInBackground(preferences, userId, preferencesHash);
          console.log(`✅ Using ${supabasePool.length} repos from Supabase cache`);
          return supabasePool;
        }
      }
      
      // Last resort: try ANY cluster (should never reach here if clusters are populated)
      console.error('❌ NO CLUSTER REPOS FOUND! Trying any available cluster...');
      const { data: clusters } = await supabase
        .from('cluster_metadata')
        .select('cluster_name')
        .eq('is_active', true)
        .limit(1);
      if (clusters && clusters.length > 0) {
        const fallbackRepos = await clusterService.getBestOfCluster(
          clusters[0].cluster_name,
          50,
          allSeenRepoIds,
          userId
        );
        if (fallbackRepos.length > 0) {
          const shuffled = this.shuffleReposForUser(fallbackRepos, userId);
          this.pool = shuffled.slice(0, POOL_SIZE);
          this.currentPreferences = preferences;
          this.cachePool(this.pool, preferences);
          await this.savePoolToSupabase(this.pool, preferences, userId, preferencesHash);
          console.log(`✅ Using ${fallbackRepos.length} repos from fallback cluster`);
          return this.pool;
        }
      }
      
      // Absolute last resort - this should NEVER happen
      console.error('❌ CRITICAL: No cluster repos available! Returning empty pool.');
      return [];
    } catch (error) {
      console.error('Error building repo pool:', error);
      return [];
    }
  }

  /**
   * Fetch dynamic repos (only when needed)
   * Called only when curated repos aren't enough
   */
  private async fetchDynamicRepos(
    preferences: UserPreferences,
    limit: number
  ): Promise<Repository[]> {
    // Use existing fetchPool logic but with smaller limit
    const allRepos: Repository[] = [];
    
    // Build search query based on preferences
    const queryParts: string[] = [];
    
    // Add tech stack
    if (preferences.techStack && preferences.techStack.length > 0) {
      preferences.techStack.forEach(tech => {
        queryParts.push(tech);
      });
    }
    
    // Build final query
    let searchQuery = queryParts.length > 0 
      ? queryParts.slice(0, 3).join(' ') // Limit to 3 keywords for smaller fetch
      : 'stars:>100';
    
    // Add minimum stars based on popularity preference
    const minStars = preferences.popularityWeight === 'high' ? 100 :
                    preferences.popularityWeight === 'medium' ? 50 : 10;
    searchQuery += ` stars:>${minStars} stars:<50000`;
    
    try {
      const repos = await githubService.searchRepos(searchQuery, {
        sort: 'stars',
        order: 'desc',
        perPage: 100,
        usePagination: false, // Smaller fetch for dynamic
      });
      
      // Apply quality validation
      const qualityFiltered = repoQualityService.filterHighQualityRepos(repos, preferences);
      
      // Calculate scores
      const scored = qualityFiltered.map(repo => ({
        ...repo,
        fitScore: enhancedRecommendationService.calculateContentScore(repo, preferences),
      }));
      
      // Sort and return
      return scored
        .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching dynamic repos:', error);
      return [];
    }
  }

  /**
   * Combine curated and dynamic repos, deduplicate
   */
  private combineAndDeduplicate(
    curated: Repository[],
    dynamic: Repository[]
  ): Repository[] {
    const curatedIds = new Set(curated.map(r => r.id));
    const uniqueDynamic = dynamic.filter(r => !curatedIds.has(r.id));
    return [...curated, ...uniqueDynamic];
  }

  /**
   * Fetch a large pool of repos from GitHub
   */
  private async fetchPool(preferences: UserPreferences): Promise<Repository[]> {
    const allRepos: Repository[] = [];
    
    // Build search query based on preferences
    const queryParts: string[] = [];
    
    // Add tech stack
    if (preferences.techStack && preferences.techStack.length > 0) {
      // Search for each tech in the stack
      preferences.techStack.forEach(tech => {
        queryParts.push(tech);
      });
    }
    
    // Add goals/use cases
    if (preferences.goals && preferences.goals.length > 0) {
      preferences.goals.forEach(goal => {
        if (goal === 'learning-new-tech' || goal === 'learning') {
          queryParts.push('tutorial', 'learn', 'course', 'guide', 'example');
        } else if (goal === 'building-project' || goal === 'building') {
          queryParts.push('starter', 'boilerplate', 'template', 'scaffold');
        } else if (goal === 'contributing') {
          queryParts.push('open-source', 'contribution', 'good-first-issue');
        } else if (goal === 'finding-solutions') {
          queryParts.push('library', 'package', 'tool', 'utility');
        }
        // 'exploring' doesn't need specific keywords
      });
    }
    
    // Add project types
    if (preferences.projectTypes && preferences.projectTypes.length > 0) {
      preferences.projectTypes.forEach(type => {
        if (type === 'tutorial') {
          queryParts.push('tutorial', 'guide');
        } else if (type === 'boilerplate') {
          queryParts.push('starter', 'boilerplate');
        }
      });
    }
    
    // Build final query
    let searchQuery = queryParts.length > 0 
      ? queryParts.slice(0, 5).join(' ') // Limit to 5 keywords
      : 'stars:>100'; // Fallback to popular repos
    
    // Add minimum stars based on popularity preference
    const minStars = preferences.popularityWeight === 'high' ? 100 :
                    preferences.popularityWeight === 'medium' ? 50 : 10;
    searchQuery += ` stars:>${minStars} stars:<50000`;
    
    // Fetch repos with pagination to get a large pool
    try {
      const repos = await githubService.searchRepos(searchQuery, {
        sort: 'stars',
        order: 'desc',
        perPage: 100,
        usePagination: true, // Enable pagination to get more repos
        maxPages: 3, // Get up to 300 repos (3 pages * 100)
      });
      
      // Apply quality validation - only keep high-quality repos
      const qualityFiltered = repoQualityService.filterHighQualityRepos(repos, preferences);
      
      console.log(`Quality filter: ${repos.length} → ${qualityFiltered.length} repos`);
      
      // Calculate scores for all quality repos
      const scored = qualityFiltered.map(repo => ({
        ...repo,
        fitScore: enhancedRecommendationService.calculateContentScore(repo, preferences),
      }));
      
      // Sort by quality score first, then fit score
      const sorted = repoQualityService.sortByQuality(scored, preferences)
        .sort((a, b) => {
          // Primary sort: fit score
          const fitDiff = (b.fitScore || 0) - (a.fitScore || 0);
          if (Math.abs(fitDiff) > 5) return fitDiff;
          
          // Secondary sort: stars (for repos with similar fit scores)
          return b.stars - a.stars;
        });
      
      return sorted.slice(0, POOL_SIZE);
    } catch (error) {
      console.error('Error fetching repo pool:', error);
      // Fallback: get trending repos
      const trending = await githubService.getTrendingRepos({
        since: 'weekly',
        perPage: 100,
        usePagination: false,
      });
      return trending.slice(0, POOL_SIZE);
    }
  }

  /**
   * Get repos from pool, excluding already shown/interacted repos
   * DEPRECATED: Use getRecommendations instead for user-specific shuffling
   */
  getReposFromPool(
    excludeIds: string[] = [],
    limit: number = 20
  ): Repository[] {
    const excluded = new Set(excludeIds);
    const available = this.pool.filter(repo => !excluded.has(repo.id));
    return available.slice(0, limit);
  }

  /**
   * Get recommendations from the current pool, excluding already seen/interacted repos.
   * Includes user-specific shuffling to ensure different users see different repos.
   * 
   * IMPORTANT: Deduplication is USER-SPECIFIC:
   * - Repos viewed by User A are excluded only for User A
   * - The same repos can still be recommended to User B
   * - Each user has their own exclusion list based on their interactions
   * 
   * OPTIMIZATION: Check cache first to avoid rebuilding pool unnecessarily
   */
  async getRecommendations(userId: string, preferences: UserPreferences, count = 20, additionalExcludeIds: string[] = []): Promise<Repository[]> {
    // OPTIMIZATION: Check if pool matches current preferences before rebuilding
    const preferencesHash = this.hashPreferences(preferences);
    const cachedPool = this.getCachedPool(preferences);
    
    if (!this.pool || this.pool.length === 0 || this.currentPreferences !== preferences) {
      // Only rebuild if cache doesn't match or is expired
      if (!cachedPool || cachedPool.length === 0) {
        await this.buildPool(preferences); // Ensure pool is loaded and up-to-date
      } else {
        // Use cached pool for instant loading
        this.pool = cachedPool;
        this.currentPreferences = preferences;
        console.log(`✅ Using cached pool: ${cachedPool.length} repos`);
      }
    }

    if (this.pool.length === 0) {
      return [];
    }

    // Get ALL repos THIS USER has ever seen (saved, liked, skipped, viewed)
    // NOTE: This is user-specific - other users can still see these repos
    const allSeenRepoIds = await supabaseService.getAllSeenRepoIds(userId);
    const seenSet = new Set([...allSeenRepoIds, ...additionalExcludeIds]);
    
    // Only log if significant number of excluded repos
    if (seenSet.size > 0) {
      console.log(`🔍 Filtering pool for user ${userId}: ${this.pool.length} total repos, ${seenSet.size} excluded (user-specific)`);
    }

    // Filter out already seen repos and ensure valid repos
    let availableRepos = this.pool.filter(repo => repo && repo.id && !seenSet.has(repo.id));
    
    if (availableRepos.length > 0) {
      console.log(`✅ ${availableRepos.length} repos available for user ${userId} after user-specific filtering`);
    }

    // Deduplicate by ID (in case pool has duplicates)
    const uniqueRepos = Array.from(
      new Map(availableRepos.map(r => [r.id, r])).values()
    );

    // Score available repos based on current preferences
    const scoredRepos = uniqueRepos.map(repo => ({
      ...repo,
      fitScore: enhancedRecommendationService.calculateContentScore(repo, preferences),
    }));

    // Sort by fit score (highest first)
    const sorted = scoredRepos.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));

    // Apply user-specific shuffling to ensure different users see different repos
    // Even if they have identical preferences
    const shuffled = this.shuffleReposForUser(sorted as Repository[], userId);

    // Return with fitScore guaranteed (we just calculated it)
    return shuffled.map(repo => ({
      ...repo,
      fitScore: repo.fitScore ?? (sorted.find(s => s.id === repo.id)?.fitScore ?? 0),
    })).slice(0, count);
  }

  /**
   * Shuffle repos deterministically based on userId
   * Same user always gets same order, different users get different orders
   */
  private shuffleReposForUser(repos: Repository[], userId: string): Repository[] {
    // Create a hash from userId for deterministic shuffling
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use hash as seed for shuffling
    const shuffled = [...repos];
    const seed = Math.abs(hash);
    
    // Fisher-Yates shuffle with seed
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Use seeded random based on userId
      const j = this.seededRandom(seed + i) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  /**
   * Seeded random number generator
   * Same seed always produces same sequence
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Refine pool based on user interactions
   * Boost repos similar to liked/saved repos
   */
  refinePoolBasedOnInteractions(
    interactions: { repoId: string; action: string }[]
  ): void {
    if (interactions.length === 0) return;
    
    const likedRepoIds = new Set(
      interactions
        .filter(i => i.action === 'like' || i.action === 'save')
        .map(i => i.repoId)
    );
    
    if (likedRepoIds.size === 0) return;
    
    // Filter out any undefined/null repos first
    this.pool = this.pool.filter(repo => repo && repo.id);
    
    // Find liked repos in pool
    const likedRepos = this.pool.filter(repo => likedRepoIds.has(repo.id));
    
    // Boost similar repos
    this.pool = this.pool.map(repo => {
      if (likedRepoIds.has(repo.id)) {
        return repo; // Already liked, keep as is
      }
      
      // Calculate similarity to liked repos
      let maxSimilarity = 0;
      likedRepos.forEach(likedRepo => {
        const similarity = this.calculateSimilarity(repo, likedRepo);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      });
      
      // Boost score if similar
      if (maxSimilarity > 0.3) {
        const boost = Math.min(20, maxSimilarity * 30); // Boost up to 20 points
        return {
          ...repo,
          fitScore: Math.min(100, (repo.fitScore || 0) + boost),
        };
      }
      
      return repo;
    });
    
    // Re-sort by new scores
    this.pool.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
  }

  /**
   * Calculate similarity between two repos
   */
  private calculateSimilarity(repo1: Repository, repo2: Repository): number {
    let similarity = 0;
    let factors = 0;
    
    // Language match
    if (repo1.language && repo2.language && repo1.language === repo2.language) {
      similarity += 0.3;
      factors++;
    }
    
    // Tag overlap
    const tags1 = new Set(repo1.tags.map(t => t.toLowerCase()));
    const tags2 = new Set(repo2.tags.map(t => t.toLowerCase()));
    const intersection = Array.from(tags1).filter(t => tags2.has(t));
    const union = new Set([...tags1, ...tags2]);
    if (union.size > 0) {
      similarity += (intersection.length / union.size) * 0.5;
      factors++;
    }
    
    // Topic overlap
    if (repo1.topics && repo2.topics) {
      const topics1 = new Set(repo1.topics.map(t => t.toLowerCase()));
      const topics2 = new Set(repo2.topics.map(t => t.toLowerCase()));
      const topicIntersection = Array.from(topics1).filter(t => topics2.has(t));
      const topicUnion = new Set([...topics1, ...topics2]);
      if (topicUnion.size > 0) {
        similarity += (topicIntersection.length / topicUnion.size) * 0.2;
        factors++;
      }
    }
    
    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Build comprehensive tags from all user preferences
   */
  private buildComprehensiveTags(preferences: UserPreferences): string[] {
    const allTags: string[] = [];
    
    // Add tech stack (languages + frameworks)
    if (preferences.techStack && preferences.techStack.length > 0) {
      allTags.push(...preferences.techStack.map(t => t.toLowerCase()));
    }
    
    // Add interests/domains (web-frontend, mobile, etc.)
    if (preferences.interests && preferences.interests.length > 0) {
      allTags.push(...preferences.interests.map(i => i.toLowerCase()));
    }
    
    // Add project types (tutorial, boilerplate, library, etc.)
    if (preferences.projectTypes && preferences.projectTypes.length > 0) {
      allTags.push(...preferences.projectTypes.map(t => t.toLowerCase()));
    }
    
    // Add goals (learning-new-tech, building-project, etc.)
    if (preferences.goals && preferences.goals.length > 0) {
      preferences.goals.forEach(goal => {
        if (goal === 'learning-new-tech' || goal === 'learning') {
          allTags.push('tutorial', 'course', 'learn', 'guide', 'example');
        } else if (goal === 'building-project') {
          allTags.push('boilerplate', 'starter', 'template');
        } else if (goal === 'finding-solutions') {
          allTags.push('library', 'package', 'tool', 'utility');
        }
      });
    }
    
    // Remove duplicates and return
    return [...new Set(allTags)];
  }

  /**
   * Filter repos by user preferences (tech stack, goals, project types)
   */
  private filterReposByPreferences(repos: Repository[], preferences: UserPreferences): Repository[] {
    return repos.filter(repo => {
      // Check tech stack match
      if (preferences.techStack && preferences.techStack.length > 0) {
        const repoText = `${repo.name} ${repo.description} ${repo.language || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
        const hasTechMatch = preferences.techStack.some(tech => 
          repoText.includes(tech.toLowerCase()) ||
          (repo.language && repo.language.toLowerCase() === tech.toLowerCase())
        );
        if (!hasTechMatch) return false;
      }
      
      // Check goals match (project types)
      if (preferences.goals && preferences.goals.length > 0) {
        const repoText = `${repo.name} ${repo.description} ${(repo.topics || []).join(' ')}`.toLowerCase();
        const hasGoalMatch = preferences.goals.some(goal => {
          if (goal === 'learning-new-tech' || goal === 'learning') {
            return repoText.includes('tutorial') || repoText.includes('learn') || repoText.includes('course');
          } else if (goal === 'building-project') {
            return repoText.includes('boilerplate') || repoText.includes('starter') || repoText.includes('template');
          } else if (goal === 'finding-solutions') {
            return repoText.includes('library') || repoText.includes('package') || repoText.includes('tool');
          }
          return true;
        });
        if (!hasGoalMatch) return false;
      }
      
      // Check project types match
      if (preferences.projectTypes && preferences.projectTypes.length > 0) {
        const repoText = `${repo.name} ${repo.description} ${(repo.topics || []).join(' ')}`.toLowerCase();
        const hasTypeMatch = preferences.projectTypes.some(type => {
          if (type === 'tutorial') {
            return repoText.includes('tutorial') || repoText.includes('course') || repoText.includes('learn');
          } else if (type === 'boilerplate') {
            return repoText.includes('boilerplate') || repoText.includes('starter') || repoText.includes('template');
          } else if (type === 'library') {
            return repoText.includes('library') || repoText.includes('package');
          }
          return true;
        });
        if (!hasTypeMatch) return false;
      }
      
      return true;
    });
  }

  /**
   * Cache pool to localStorage
   */
  private cachePool(repos: Repository[], preferences: UserPreferences): void {
    try {
      const pool: RepoPool = {
        repos,
        preferences,
        timestamp: Date.now(),
      };
      localStorage.setItem(POOL_CACHE_KEY, JSON.stringify(pool));
    } catch (error) {
      console.error('Error caching repo pool:', error);
    }
  }

  /**
   * Get cached pool if it matches preferences
   */
  private getCachedPool(preferences: UserPreferences): Repository[] | null {
    try {
      const cached = localStorage.getItem(POOL_CACHE_KEY);
      if (!cached) return null;
      
      const pool: RepoPool = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - pool.timestamp > CACHE_DURATION) {
        return null;
      }
      
      // Check if preferences match (simple check - tech stack)
      const cachedTechStack = new Set(pool.preferences.techStack || []);
      const currentTechStack = new Set(preferences.techStack || []);
      
      // If tech stacks are similar enough, use cache
      const intersection = Array.from(cachedTechStack).filter(t => currentTechStack.has(t));
      const union = new Set([...cachedTechStack, ...currentTechStack]);
      const similarity = union.size > 0 ? intersection.length / union.size : 0;
      
      if (similarity >= 0.5) {
        return pool.repos;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached pool:', error);
      return null;
    }
  }

  /**
   * Refresh pool in background without blocking
   */
  private async refreshPoolInBackground(
    preferences: UserPreferences,
    userId: string,
    preferencesHash: string
  ): Promise<void> {
    setTimeout(async () => {
      try {
        const newPool = await this.fetchPool(preferences);
        this.pool = newPool;
        this.currentPreferences = preferences;
        // Save to both Supabase and localStorage
        await this.savePoolToSupabase(newPool, preferences, userId, preferencesHash);
        this.cachePool(newPool, preferences);
      } catch (error) {
        console.error('Error refreshing pool in background:', error);
      }
    }, 5000); // Wait 5 seconds before refreshing
  }

  /**
   * Save pool to Supabase
   */
  private async savePoolToSupabase(
    repos: Repository[],
    preferences: UserPreferences,
    userId: string,
    preferencesHash: string
  ): Promise<void> {
    try {
      await supabaseService.saveRepoPool(userId, repos, preferencesHash);
    } catch (error) {
      console.error('Error saving pool to Supabase:', error);
      // Continue without Supabase - localStorage is fallback
    }
  }

  /**
   * Get pool metadata from Supabase
   */
  private async getPoolMetadata(userId: string): Promise<{ preferences_hash: string } | null> {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('repo_pools')
        .select('preferences_hash')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return { preferences_hash: data.preferences_hash };
    } catch (error) {
      console.error('Error getting pool metadata:', error);
      return null;
    }
  }

  /**
   * Hash preferences to detect changes
   */
  private hashPreferences(preferences: UserPreferences): string {
    const key = JSON.stringify({
      techStack: preferences.techStack?.sort() || [],
      goals: preferences.goals?.sort() || [],
      projectTypes: preferences.projectTypes?.sort() || [],
      popularityWeight: preferences.popularityWeight || 'medium',
    });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Clear the pool cache
   */
  async clearPool(): Promise<void> {
    this.pool = [];
    this.currentPreferences = null;
    localStorage.removeItem(POOL_CACHE_KEY);
    localStorage.removeItem(POOL_CACHE_TIMESTAMP_KEY);
    
    // Also clear from Supabase
    try {
      const userId = await supabaseService.getOrCreateUserId();
      const { supabase } = await import('@/lib/supabase');
      await supabase
        .from('repo_pools')
        .delete()
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error clearing pool from Supabase:', error);
    }
  }

  /**
   * Get current pool size
   */
  getPoolSize(): number {
    return this.pool.length;
  }
}

export const repoPoolService = new RepoPoolService();
