/**
 * GitHub API Service (Backend)
 * Calls backend API instead of GitHub directly
 */

import { apiClient } from '../api.client';
import { Repository, TrendingRepo } from '@/lib/types';

export class GitHubApiService {
  /**
   * Search repositories
   */
  async searchRepos(query: string, options?: {
    language?: string;
    sort?: 'stars' | 'updated' | 'forks';
    order?: 'asc' | 'desc';
    perPage?: number;
  }): Promise<Repository[]> {
    const params: Record<string, string> = { q: query };
    if (options?.language) params.language = options.language;
    if (options?.sort) params.sort = options.sort;
    if (options?.order) params.order = options.order;
    if (options?.perPage) params.per_page = options.perPage.toString();

    const response = await apiClient.get<{ repos: Repository[] }>('/repos/search', params);
    return response.repos;
  }

  /**
   * Get trending repositories
   */
  async getTrendingRepos(options?: {
    language?: string;
    since?: 'daily' | 'weekly' | 'monthly';
    perPage?: number;
  }): Promise<TrendingRepo[]> {
    const params: Record<string, string> = {};
    if (options?.language) params.language = options.language;
    if (options?.since) params.since = options.since;
    if (options?.perPage) params.per_page = options.perPage.toString();

    const response = await apiClient.get<{ repos: TrendingRepo[] }>('/repos/trending', params);
    return response.repos;
  }

  /**
   * Get repository by full name
   */
  async getRepo(fullName: string): Promise<Repository> {
    // For now, use search - could add dedicated endpoint later
    const repos = await this.searchRepos(fullName, { perPage: 1 });
    if (repos.length === 0) {
      throw new Error('Repository not found');
    }
    return repos[0];
  }
}

export const githubApiService = new GitHubApiService();
