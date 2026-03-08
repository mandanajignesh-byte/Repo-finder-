/**
 * Cluster Service - RepoVerse Recommendation System
 * Handles cluster queries and calls the get_scored_repos() Supabase function
 */

import { supabase } from '@/lib/supabase';
import type { Repo, RetryConfig } from '@/types/recommendation';

class ClusterService {
  /**
   * Get all active clusters from database
   */
  async getActiveClusters(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('cluster_metadata')
        .select('cluster_name')
        .eq('is_active', true);

      if (error) {
        console.error('Error getting active clusters:', error);
        return [];
      }

      return (data || []).map((row: any) => row.cluster_name);
    } catch (error) {
      console.error('Error in getActiveClusters:', error);
      return [];
    }
  }

  /**
   * Get scored repos using the Supabase get_scored_repos() function
   * This function applies personalized scoring: 40% like rate + 30% health + 20% affinity + 10% recency
   */
  async getScoredRepos(opts: {
    userId: string;
    cluster: string;
    excludeIds: number[];
    limit?: number;
    minStars?: number;
    maxStars?: number;
  }): Promise<Repo[]> {
    const {
      userId,
      cluster,
      excludeIds,
      limit = 30,
      minStars = 50,
      maxStars = 100000,
    } = opts;

    try {
      // Try the RPC function first
      const { data, error } = await supabase.rpc('get_scored_repos', {
        p_user_id: userId,
        p_cluster: cluster,
        p_exclude_ids: excludeIds,
        p_limit: limit,
        p_min_stars: minStars,
        p_max_stars: maxStars,
      });

      if (error) {
        console.error('Error calling get_scored_repos RPC, falling back to direct query:', error);
        // Fallback to direct query
        return this.getScoredReposFallback(opts);
      }

      if (!data || data.length === 0) {
        console.warn('get_scored_repos returned 0 results, trying fallback');
        return this.getScoredReposFallback(opts);
      }

      return (data || []) as Repo[];
    } catch (error) {
      console.error('Error in getScoredRepos, using fallback:', error);
      return this.getScoredReposFallback(opts);
    }
  }

  /**
   * Fallback method when RPC fails - directly query repo_clusters
   */
  private async getScoredReposFallback(opts: {
    userId: string;
    cluster: string;
    excludeIds: number[];
    limit?: number;
    minStars?: number;
    maxStars?: number;
  }): Promise<Repo[]> {
    const { cluster, excludeIds, limit = 30, minStars = 50, maxStars = 100000 } = opts;

    try {
      const { data, error } = await supabase
        .from('repo_clusters')
        .select('repo_data, tags, quality_score')
        .eq('cluster_name', cluster)
        .order('quality_score', { ascending: false })
        .limit(limit * 2);

      if (error) {
        console.error('Error in fallback query:', error);
        return [];
      }

      // Filter and map
      const excludeSet = new Set(excludeIds.map(id => id.toString()));
      const repos = (data || [])
        .filter((row: any) => {
          const repoData = row.repo_data;
          if (!repoData || !repoData.id) return false;
          if (excludeSet.has(repoData.id.toString())) return false;
          const stars = repoData.stars || 0;
          return stars >= minStars && stars <= maxStars;
        })
        .map((row: any) => {
          const repo = row.repo_data;
          return {
            id: parseInt(repo.id) || 0,
            name: repo.name || '',
            full_name: repo.full_name || repo.fullName || '',
            description: repo.description || '',
            stars: repo.stars || 0,
            forks: repo.forks || 0,
            language: repo.language || null,
            tags: row.tags || [],
            topics: repo.topics || [],
            url: repo.url || '',
            owner_avatar: repo.owner_avatar || repo.owner?.avatarUrl || '',
            health_score: row.quality_score || 50,
            like_rate: 0.5,
            final_score: row.quality_score || 50,
          } as Repo;
        })
        .slice(0, limit);

      console.log(`✅ Fallback returned ${repos.length} repos`);
      return repos;
    } catch (error) {
      console.error('Error in getScoredReposFallback:', error);
      return [];
    }
  }

  /**
   * Get a random active cluster
   */
  async getRandomCluster(): Promise<string | null> {
    const clusters = await this.getActiveClusters();
    if (clusters.length === 0) {
      return null;
    }
    return clusters[Math.floor(Math.random() * clusters.length)];
  }

  /**
   * Legacy method for backward compatibility
   * Calls getScoredRepos with default parameters
   */
  async getBestOfCluster(
    clusterName: string,
    limit: number = 20,
    excludeIds: string[] = [],
    userId?: string
  ): Promise<any[]> {
    try {
      // Convert string IDs to numbers for the RPC call
      const numericIds = excludeIds
        .map(id => typeof id === 'string' ? parseInt(id, 10) : id)
        .filter(id => !isNaN(id));

      // If userId not provided, use anonymous
      const user = userId || 'anonymous';

      const repos = await this.getScoredRepos({
        userId: user,
        cluster: clusterName,
        excludeIds: numericIds,
        limit,
        minStars: 50,
        maxStars: 100000,
      });

      // Convert back to old Repository format for compatibility
      return repos.map((repo: Repo) => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        stars: repo.stars,
        forks: repo.forks,
        language: repo.language,
        tags: repo.tags || [],
        topics: repo.topics || [],
        url: repo.url,
        owner: {
          login: repo.full_name?.split('/')[0] || '',
          avatarUrl: repo.owner_avatar || '',
        },
        lastUpdated: '',
        fitScore: repo.final_score,
      }));
    } catch (error) {
      console.error('Error in getBestOfCluster (legacy):', error);
      return [];
    }
  }
}

export const clusterService = new ClusterService();
