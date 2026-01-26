/**
 * React hook for fetching repositories
 */

import { useState, useEffect } from 'react';
import { Repository } from '@/lib/types';
import { githubService } from '@/services/github.service';

export function useRepositories(query?: string) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      // Load default trending repos
      loadTrending();
    } else {
      loadSearch(query);
    }
  }, [query]);

  const loadTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use pagination to get more repos (100 per page like Python script)
      const trending = await githubService.getTrendingRepos({
        since: 'daily',
        perPage: 100, // Increased from 30 to 100
        usePagination: false, // Set to true if you want to fetch all pages
      });
      setRepos(trending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const loadSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      // Use pagination to get more repos (100 per page like Python script)
      const results = await githubService.searchRepos(searchQuery, {
        sort: 'stars',
        order: 'desc',
        perPage: 100, // Increased from 30 to 100
        usePagination: false, // Set to true if you want to fetch all pages
      });
      setRepos(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search repositories');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (query) {
      loadSearch(query);
    } else {
      loadTrending();
    }
  };

  return { repos, loading, error, refresh };
}
