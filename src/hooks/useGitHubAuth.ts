/**
 * useGitHubAuth — React hook for GitHub connection state.
 * Provides connect / disconnect / sync actions and live connection info.
 */

import { useState, useEffect, useCallback } from 'react';
import { gitHubAuthService, GitHubConnection, StarredRepo } from '@/services/github-auth.service';
import { supabaseService } from '@/services/supabase.service';

export function useGitHubAuth() {
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ synced: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Load saved connection ──────────────────────────────────────────────────
  const loadConnection = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await supabaseService.getOrCreateUserId();
      const conn = await gitHubAuthService.getConnection(userId);
      setConnection(conn);
    } catch (err) {
      console.error('useGitHubAuth: loadConnection error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // ── Connect — redirects to GitHub OAuth ──────────────────────────────────
  const connect = useCallback(async () => {
    try {
      setError(null);
      await gitHubAuthService.connectGitHub();
      // Page redirects to GitHub — nothing more to do
    } catch (err: any) {
      setError(err.message ?? 'Failed to start GitHub OAuth');
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = await supabaseService.getOrCreateUserId();
      await gitHubAuthService.disconnect(userId);
      setConnection(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to disconnect GitHub');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Re-sync starred repos ─────────────────────────────────────────────────
  const sync = useCallback(async (): Promise<number> => {
    try {
      setSyncing(true);
      setError(null);
      setSyncProgress({ synced: 0, total: 0 });
      const userId = await supabaseService.getOrCreateUserId();
      const count = await gitHubAuthService.syncStarredRepos(userId, (synced, total) => {
        setSyncProgress({ synced, total });
      });
      setSyncProgress(null);
      await loadConnection(); // Refresh count
      return count;
    } catch (err: any) {
      setError(err.message ?? 'Sync failed');
      setSyncProgress(null);
      return 0;
    } finally {
      setSyncing(false);
    }
  }, [loadConnection]);

  // ── Load starred repos (paginated) ────────────────────────────────────────
  const getStarredRepos = useCallback(
    async (limit = 50, offset = 0): Promise<StarredRepo[]> => {
      const userId = await supabaseService.getOrCreateUserId();
      return gitHubAuthService.getStarredRepos(userId, limit, offset);
    },
    []
  );

  // ── Search starred repos ──────────────────────────────────────────────────
  const searchStarredRepos = useCallback(async (query: string): Promise<StarredRepo[]> => {
    const userId = await supabaseService.getOrCreateUserId();
    return gitHubAuthService.searchStarredRepos(userId, query);
  }, []);

  return {
    connection,
    loading,
    syncing,
    syncProgress,
    error,
    connect,
    disconnect,
    sync,
    getStarredRepos,
    searchStarredRepos,
    reload: loadConnection,
  };
}
