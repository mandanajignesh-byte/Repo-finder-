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
      const { data, error } = await supabase.rpc('get_scored_repos', {
        p_user_id: userId,
        p_cluster: cluster,
        p_exclude_ids: excludeIds,
        p_limit: limit,
        p_min_stars: minStars,
        p_max_stars: maxStars,
      });

      if (error) {
        console.error('Error calling get_scored_repos:', error);
        return [];
      }

      return (data || []) as Repo[];
    } catch (error) {
      console.error('Error in getScoredRepos:', error);
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
}

export const clusterService = new ClusterService();
