/**
 * Repos Master Service
 * Fetches repositories from repos_master table with health scores and activity data
 * This is the same backend structure used by the mobile app
 */

import { supabase } from '@/lib/supabase';
import { Repository, UserPreferences } from '@/lib/types';

interface RepoMasterRow {
  repo_id: number;
  name: string;
  full_name: string;
  description: string | null;
  avatar_url: string | null;
  language: string | null;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  html_url: string;
  homepage: string | null;
  topics: string[];
  license: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  archived: boolean;
  repo_health?: Array<{
    health_score: number;
    activity_score: number;
    maintenance_score: number;
    community_score: number;
    documentation_score: number;
  }>;
  repo_activity?: Array<{
    freshness_score: number;
    activity_score: number;
    last_commit_at: string;
    commits_30_days: number;
  }>;
  repo_badges?: Array<{
    badge_slug: string;
    badge_definitions?: {
      name: string;
      color: string;
      icon: string;
    };
  }>;
}

class ReposMasterService {
  /**
   * Convert repos_master row to Repository type
   */
  private mapToRepository(row: RepoMasterRow): Repository {
    const health = row.repo_health?.[0];
    const activity = row.repo_activity?.[0];
    const badges = row.repo_badges?.map(b => ({
      name: b.badge_definitions?.name || b.badge_slug,
      color: b.badge_definitions?.color || '#6b7280',
      icon: b.badge_definitions?.icon || 'badge'
    })) || [];

    return {
      id: row.repo_id.toString(),
      name: row.name,
      fullName: row.full_name,
      description: row.description || '',
      owner: row.full_name.split('/')[0] || '',
      ownerAvatar: row.avatar_url || '',
      language: row.language || '',
      stars: row.stars || 0,
      forks: row.forks || 0,
      watchers: row.watchers || 0,
      openIssues: row.open_issues || 0,
      url: row.html_url,
      homepage: row.homepage || undefined,
      topics: row.topics || [],
      license: row.license || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pushedAt: row.pushed_at,
      // Health scores from repo_health table
      healthScore: health?.health_score ? Math.round(health.health_score * 100) : undefined,
      activityScore: activity?.activity_score ? Math.round(activity.activity_score * 100) : undefined,
      freshnessScore: activity?.freshness_score ? Math.round(activity.freshness_score * 100) : undefined,
      // Badges with full metadata
      badges: badges.length > 0 ? badges.map(b => b.name) : undefined,
      badgeDetails: badges.length > 0 ? badges : undefined,
    };
  }

  /**
   * Get personalized recommendations from repos_master with health scores
   * Uses the same backend tables as the mobile app
   */
  async getPersonalizedRepos(
    preferences: UserPreferences,
    excludeIds: string[] = [],
    limit: number = 20
  ): Promise<Repository[]> {
    try {
      console.log('🔍 Fetching personalized repos from repos_master...');

      // Build cluster slugs from preferences
      const clusterSlugs: string[] = [];
      
      if (preferences.primaryCluster) {
        const clusterMap: Record<string, string> = {
          'frontend': 'web_dev',
          'backend': 'web_dev',
          'mobile': 'mobile',
          'desktop': 'desktop',
          'data-science': 'data_science',
          'devops': 'devops',
          'game-dev': 'game_dev',
          'ai-ml': 'ai_ml',
        };
        const slug = clusterMap[preferences.primaryCluster] || preferences.primaryCluster;
        if (!clusterSlugs.includes(slug)) {
          clusterSlugs.push(slug);
        }
      }

      if (preferences.secondaryClusters && preferences.secondaryClusters.length > 0) {
        const clusterMap: Record<string, string> = {
          'frontend': 'web_dev',
          'backend': 'web_dev',
          'mobile': 'mobile',
          'desktop': 'desktop',
          'data-science': 'data_science',
          'devops': 'devops',
          'game-dev': 'game_dev',
          'ai-ml': 'ai_ml',
        };
        preferences.secondaryClusters.forEach(cluster => {
          const slug = clusterMap[cluster] || cluster;
          if (!clusterSlugs.includes(slug)) {
            clusterSlugs.push(slug);
          }
        });
      }

      // If no clusters, use a default
      if (clusterSlugs.length === 0) {
        clusterSlugs.push('web_dev');
      }

      console.log(`📊 Querying clusters: ${clusterSlugs.join(', ')}`);

      // CRITICAL: Try repo_cluster_new first, then fall back to old repo_clusters table
      let repoIds: number[] = [];
      
      // Try new table first
      const { data: clusterDataNew, error: clusterErrorNew } = await supabase
        .from('repo_cluster_new')
        .select('repo_id')
        .in('cluster_slug', clusterSlugs)
        .order('weight', { ascending: false })
        .limit(limit * 10); // Get 10x more for better variety

      if (!clusterErrorNew && clusterDataNew && clusterDataNew.length > 0) {
        repoIds = clusterDataNew.map(item => item.repo_id);
        console.log(`✅ Found ${repoIds.length} repos in repo_cluster_new`);
      } else {
        // Fall back to old repo_clusters table (JSONB format)
        console.warn('⚠️ repo_cluster_new empty, falling back to repo_clusters...');
        
        const { data: clusterDataOld, error: clusterErrorOld } = await supabase
          .from('repo_clusters')
          .select('repo_data')
          .in('cluster_name', clusterSlugs)
          .order('quality_score', { ascending: false })
          .limit(limit * 10);

        if (clusterErrorOld || !clusterDataOld || clusterDataOld.length === 0) {
          console.error('❌ Both tables empty! No repos found.');
          return [];
        }

        // Extract repo IDs from JSONB
        repoIds = clusterDataOld
          .map(item => {
            const repoData = item.repo_data as any;
            return repoData?.id ? parseInt(repoData.id, 10) : null;
          })
          .filter((id): id is number => id !== null && !isNaN(id));
        
        console.log(`✅ Found ${repoIds.length} repos in repo_clusters (fallback)`);
      }

      if (repoIds.length === 0) {
        console.warn('No repos found after checking both tables');
        return [];
      }

      const excludeNumericIds = excludeIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      // Fetch full repo data with health scores and activity
      const { data: repos, error: reposError } = await supabase
        .from('repos_master')
        .select(`
          repo_id,
          name,
          full_name,
          description,
          avatar_url,
          language,
          stars,
          forks,
          watchers,
          open_issues,
          html_url,
          homepage,
          topics,
          license,
          created_at,
          updated_at,
          pushed_at,
          archived,
          repo_health (
            health_score,
            activity_score,
            maintenance_score,
            community_score,
            documentation_score
          ),
          repo_activity (
            freshness_score,
            activity_score,
            last_commit_at,
            commits_30_days
          ),
          repo_badges (
            badge_slug,
            badge_definitions (
              name,
              color,
              icon
            )
          )
        `)
        .in('repo_id', repoIds)
        .not('repo_id', 'in', `(${excludeNumericIds.join(',')})`)
        .eq('archived', false)
        .gte('stars', 50) // Minimum quality threshold
        .lt('stars', 25000) // Exclude mega repos
        .order('stars', { ascending: false })
        .limit(limit);

      if (reposError) {
        console.error('Error fetching repos:', reposError);
        return [];
      }

      if (!repos || repos.length === 0) {
        console.warn('No repos found after filtering');
        return [];
      }

      console.log(`✅ Found ${repos.length} repos with health scores`);

      // Map to Repository type
      const mappedRepos = repos.map(row => this.mapToRepository(row as RepoMasterRow));

      // Sort by health score if available, otherwise by stars
      return mappedRepos.sort((a, b) => {
        const scoreA = a.healthScore || (a.stars / 1000);
        const scoreB = b.healthScore || (b.stars / 1000);
        return scoreB - scoreA;
      });

    } catch (error) {
      console.error('Error in getPersonalizedRepos:', error);
      return [];
    }
  }

  /**
   * Get repos by cluster from repos_master
   */
  async getReposByCluster(
    clusterSlug: string,
    excludeIds: string[] = [],
    limit: number = 20
  ): Promise<Repository[]> {
    try {
      // Get repo IDs from cluster
      const { data: clusterData, error: clusterError } = await supabase
        .from('repo_cluster_new')
        .select('repo_id')
        .eq('cluster_slug', clusterSlug)
        .order('weight', { ascending: false })
        .limit(limit * 2);

      if (clusterError || !clusterData || clusterData.length === 0) {
        return [];
      }

      const repoIds = clusterData.map(item => item.repo_id);
      const excludeNumericIds = excludeIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      // Fetch full repo data
      const { data: repos, error: reposError } = await supabase
        .from('repos_master')
        .select(`
          repo_id,
          name,
          full_name,
          description,
          avatar_url,
          language,
          stars,
          forks,
          watchers,
          open_issues,
          html_url,
          homepage,
          topics,
          license,
          created_at,
          updated_at,
          pushed_at,
          archived,
          repo_health (
            health_score,
            activity_score,
            maintenance_score,
            community_score,
            documentation_score
          ),
          repo_activity (
            freshness_score,
            activity_score,
            last_commit_at,
            commits_30_days
          ),
          repo_badges (
            badge_slug,
            badge_definitions (
              name,
              color,
              icon
            )
          )
        `)
        .in('repo_id', repoIds)
        .not('repo_id', 'in', `(${excludeNumericIds.join(',')})`)
        .eq('archived', false)
        .gte('stars', 50)
        .lt('stars', 25000)
        .order('stars', { ascending: false })
        .limit(limit);

      if (reposError || !repos) {
        return [];
      }

      return repos.map(row => this.mapToRepository(row as RepoMasterRow));

    } catch (error) {
      console.error('Error in getReposByCluster:', error);
      return [];
    }
  }

  /**
   * Get random high-quality repos from repos_master
   */
  async getRandomRepos(
    excludeIds: string[] = [],
    limit: number = 20
  ): Promise<Repository[]> {
    try {
      const excludeNumericIds = excludeIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      // Get random repos with good health scores
      const { data: repos, error } = await supabase
        .from('repos_master')
        .select(`
          repo_id,
          name,
          full_name,
          description,
          avatar_url,
          language,
          stars,
          forks,
          watchers,
          open_issues,
          html_url,
          homepage,
          topics,
          license,
          created_at,
          updated_at,
          pushed_at,
          archived,
          repo_health (
            health_score,
            activity_score,
            maintenance_score,
            community_score,
            documentation_score
          ),
          repo_activity (
            freshness_score,
            activity_score,
            last_commit_at,
            commits_30_days
          ),
          repo_badges (
            badge_slug,
            badge_definitions (
              name,
              color,
              icon
            )
          )
        `)
        .not('repo_id', 'in', `(${excludeNumericIds.join(',')})`)
        .eq('archived', false)
        .gte('stars', 100)
        .lt('stars', 25000)
        .order('stars', { ascending: false })
        .limit(limit * 2);

      if (error || !repos) {
        return [];
      }

      // Shuffle and return
      const shuffled = repos.sort(() => Math.random() - 0.5);
      return shuffled
        .slice(0, limit)
        .map(row => this.mapToRepository(row as RepoMasterRow));

    } catch (error) {
      console.error('Error in getRandomRepos:', error);
      return [];
    }
  }
}

export const reposMasterService = new ReposMasterService();
