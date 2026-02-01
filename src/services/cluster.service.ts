/**
 * Cluster Service
 * Manages pre-curated repository clusters for first-time users
 * Provides zero-API-call recommendations from Supabase
 */

import { Repository, UserPreferences } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export interface Cluster {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  repoCount: number;
}

class ClusterService {
  /**
   * Get all available clusters
   */
  async getClusters(): Promise<Cluster[]> {
    try {
      const { data, error } = await supabase
        .from('cluster_metadata')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) {
        console.error('Error getting clusters:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        name: row.cluster_name,
        displayName: row.display_name,
        description: row.description || '',
        icon: row.icon || '📦',
        repoCount: row.repo_count || 0,
      }));
    } catch (error) {
      console.error('Error in getClusters:', error);
      return [];
    }
  }

  /**
   * Get "Best of [Cluster]" repos for first-time users
   * NO API CALLS - all from Supabase
   * Includes user-specific shuffling to ensure different users see different repos
   * 
   * IMPORTANT: excludeIds should be user-specific (from getAllSeenRepoIds).
   * Repos excluded for one user can still be shown to other users.
   */
  async getBestOfCluster(
    clusterName: string,
    limit: number = 20,
    excludeIds: string[] = [],
    userId?: string
  ): Promise<Repository[]> {
    try {
      const excluded = new Set(excludeIds);

      // OPTIMIZATION: Reduce multiplier from 3x to 2x for faster queries
      // Still get enough repos for filtering and shuffling
      const { data, error } = await supabase
        .from('repo_clusters')
        .select('repo_data, tags, quality_score, rotation_priority')
        .eq('cluster_name', clusterName)
        .order('quality_score', { ascending: false })
        .order('rotation_priority', { ascending: false })
        .limit(limit * 2); // REDUCED: Get 2x instead of 3x for faster queries

      if (error) {
        console.error('Error getting cluster repos:', error);
        return [];
      }

      // Filter excluded and convert to Repository format
      let repos = (data || [])
        .filter((row: any) => !excluded.has(row.repo_data.id))
        .map((row: any) => row.repo_data as Repository);

      // Apply user-specific shuffling if userId provided
      if (userId && repos.length > 0) {
        repos = this.shuffleReposForUser(repos, userId);
      }

      return repos.slice(0, limit);
    } catch (error) {
      console.error('Error in getBestOfCluster:', error);
      return [];
    }
  }

  /**
   * Get repos by matching tags (for personalized recommendations)
   * Still uses pre-curated data - no API calls
   * Includes user-specific shuffling
   * 
   * IMPORTANT: excludeIds should be user-specific (from getAllSeenRepoIds).
   * Repos excluded for one user can still be shown to other users.
   */
  async getReposByTags(
    tags: string[],
    limit: number = 20,
    excludeIds: string[] = [],
    userId?: string
  ): Promise<Repository[]> {
    if (tags.length === 0) {
      console.warn('⚠️ getReposByTags called with empty tags array');
      return [];
    }

    try {
      const excluded = new Set(excludeIds);
      console.log(`🔍 Searching for repos with tags: ${tags.join(', ')}`);

      // Normalize tags for query (PostgreSQL is case-sensitive for array operations)
      const normalizedTags = tags.map(t => t.toLowerCase().trim());
      
      // Search for repos that have ANY of the matching tags
      // OPTIMIZATION: Reduce multiplier from 4x to 2.5x for faster queries
      const { data, error } = await supabase
        .from('repo_clusters')
        .select('repo_data, tags, quality_score, cluster_name')
        .overlaps('tags', normalizedTags) // PostgreSQL array overlap operator
        .order('quality_score', { ascending: false })
        .limit(Math.ceil(limit * 2.5)); // REDUCED: Get 2.5x instead of 4x for faster queries
      
      if (error) {
        console.error('❌ Error querying repo_clusters:', error);
        return [];
      }
      
      console.log(`📦 Found ${data?.length || 0} repos from database before filtering`);
      console.log(`🚫 Excluding ${excluded.size} already-seen repos`);

      // Score repos by tag match count
      let scored = (data || [])
        .filter((row: any) => {
          const isExcluded = excluded.has(row.repo_data.id);
          if (isExcluded) return false;
          // Also filter out repos without proper data
          return row.repo_data && row.repo_data.id;
        })
        .map((row: any) => {
          // Check tag matches (case-insensitive, partial matches)
          const repoTags = (row.tags || []).map((t: string) => t.toLowerCase().trim());
          const matchingTags = normalizedTags.filter(userTag => 
            repoTags.some((repoTag: string) => 
              repoTag === userTag ||
              repoTag.includes(userTag) ||
              userTag.includes(repoTag) ||
              // Also check repo language and topics
              (row.repo_data?.language?.toLowerCase() === userTag) ||
              (row.repo_data?.topics?.some((topic: string) => 
                topic.toLowerCase() === userTag || 
                topic.toLowerCase().includes(userTag)
              ))
            )
          ).length;

          return {
            repo: row.repo_data as Repository,
            matchScore: matchingTags,
            qualityScore: row.quality_score || 0,
          };
        })
        .sort((a, b) => {
          // Sort by match score first, then quality
          if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
          }
          return b.qualityScore - a.qualityScore;
        })
        .map(item => item.repo);

      console.log(`✅ After filtering and scoring: ${scored.length} repos available`);

      // Apply user-specific shuffling if userId provided
      if (userId && scored.length > 0) {
        scored = this.shuffleReposForUser(scored, userId);
      }

      const result = scored.slice(0, limit);
      console.log(`📤 Returning ${result.length} repos (requested ${limit})`);
      return result;
    } catch (error) {
      console.error('Error in getReposByTags:', error);
      return [];
    }
  }

  /**
   * Get repos with rotation strategy
   * Mix of trending, stars, updated, hidden gems
   */
  async getRotatedRepos(
    clusterName: string,
    strategy: 'trending' | 'stars' | 'updated' | 'hidden-gems' | 'balanced',
    limit: number = 20,
    excludeIds: string[] = []
  ): Promise<Repository[]> {
    try {
      const excluded = new Set(excludeIds);
      let query = supabase
        .from('repo_clusters')
        .select('repo_data, tags, quality_score, rotation_priority')
        .eq('cluster_name', clusterName);

      // Apply rotation strategy
      switch (strategy) {
        case 'trending':
          query = query.order('rotation_priority', { ascending: false });
          break;
        case 'stars':
          // Note: PostgreSQL JSONB ordering - may need adjustment
          query = query.order('quality_score', { ascending: false });
          break;
        case 'updated':
          query = query.order('quality_score', { ascending: false });
          break;
        case 'hidden-gems':
          // High quality but lower stars (we'll sort in memory)
          query = query.order('quality_score', { ascending: false });
          break;
        case 'balanced':
        default:
          // Mix: quality score + rotation priority
          query = query
            .order('quality_score', { ascending: false })
            .order('rotation_priority', { ascending: false });
      }

      const { data, error } = await query.limit(limit * 2);

      if (error) {
        console.error('Error getting rotated repos:', error);
        return [];
      }

      let repos = (data || [])
        .filter((row: any) => !excluded.has(row.repo_data.id))
        .map((row: any) => row.repo_data as Repository);

      // Apply additional sorting for hidden-gems
      if (strategy === 'hidden-gems') {
        repos = repos.sort((a, b) => {
          // High quality, lower stars
          if (a.stars < 1000 && b.stars >= 1000) return -1;
          if (a.stars >= 1000 && b.stars < 1000) return 1;
          return b.stars - a.stars; // Lower stars first
        });
      }

      return repos.slice(0, limit);
    } catch (error) {
      console.error('Error in getRotatedRepos:', error);
      return [];
    }
  }

  /**
   * Detect primary cluster from user preferences
   * Based on onboarding form data
   * NEW: Checks primaryCluster field first (from redesigned onboarding)
   */
  detectPrimaryCluster(preferences: {
    primaryCluster?: string;
    techStack?: string[];
    interests?: string[];
    goals?: string[];
    experienceLevel?: string;
  }): string {
    // NEW: If primaryCluster is set (from new onboarding), use it directly
    if (preferences.primaryCluster) {
      return preferences.primaryCluster;
    }
    
    const allTags = [
      ...(preferences.techStack || []),
      ...(preferences.interests || []),
    ].map(t => t.toLowerCase());

    // Check domains/interests first (from onboarding)
    if (allTags.some(t => ['web-frontend', 'frontend'].includes(t))) {
      return 'frontend';
    }
    if (allTags.some(t => ['web-backend', 'backend'].includes(t))) {
      return 'backend';
    }
    if (allTags.some(t => ['ai-ml', 'ai', 'machine-learning'].includes(t))) {
      return 'ai-ml';
    }
    if (allTags.some(t => ['mobile'].includes(t))) {
      return 'mobile';
    }
    if (allTags.some(t => ['devops'].includes(t))) {
      return 'devops';
    }
    if (allTags.some(t => ['data-science', 'data'].includes(t))) {
      return 'data-science';
    }

    // Check tech stack for frameworks
    if (allTags.some(t => ['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt'].includes(t))) {
      return 'frontend';
    }
    if (allTags.some(t => ['express', 'django', 'flask', 'fastapi', 'spring', 'laravel'].includes(t))) {
      return 'backend';
    }
    if (allTags.some(t => ['tensorflow', 'pytorch'].includes(t))) {
      return 'ai-ml';
    }
    if (allTags.some(t => ['flutter', 'react-native', 'ionic'].includes(t))) {
      return 'mobile';
    }
    if (allTags.some(t => ['pandas', 'numpy'].includes(t))) {
      return 'data-science';
    }

    // Check goals/use cases
    if (preferences.goals?.includes('learning-new-tech') || preferences.goals?.includes('learning')) {
      // For learning, default to frontend (most common)
      return 'frontend';
    }

    // Default to frontend (most common category)
    return 'frontend';
  }

  /**
   * Get repos for first-time user based on minimal preferences
   */
  async getFirstTimeUserRepos(
    preferences: Partial<UserPreferences>,
    limit: number = 20,
    userId?: string,
    excludeIds: string[] = []
  ): Promise<Repository[]> {
    // Detect cluster from minimal data
    const cluster = this.detectPrimaryCluster(preferences);
    
    // Get best of that cluster with user-specific shuffling
    return this.getBestOfCluster(cluster, limit, excludeIds, userId);
  }

  /**
   * Shuffle repos deterministically based on userId
   * Same user always gets same order, different users get different orders
   * This ensures users with same preferences see different repos
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
}

export const clusterService = new ClusterService();
