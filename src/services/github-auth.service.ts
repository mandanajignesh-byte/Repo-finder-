/**
 * GitHub Auth Service
 * Handles GitHub OAuth via Supabase, starred repo sync, and connection management.
 * The GitHub OAuth token is persisted in `github_connections` (Supabase) and linked
 * to the app's custom localStorage user_id — so Supabase Auth is used only as an
 * OAuth broker, not as the primary identity system.
 */

import { supabase } from '@/lib/supabase';

export interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface StarredRepo {
  id: string;
  fullName: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
  ownerLogin: string;
  ownerAvatarUrl: string;
  topics: string[];
  starredAt: string;
}

export interface GitHubConnection {
  githubLogin: string;
  githubName: string | null;
  githubAvatarUrl: string;
  starredReposCount: number;
  connectedAt: string;
  lastSyncedAt: string | null;
}

class GitHubAuthService {
  /**
   * Kick off GitHub OAuth via Supabase.
   * Redirects the user to GitHub → Supabase callback → /app/github-callback.
   */
  async connectGitHub(): Promise<void> {
    const redirectTo = `${window.location.origin}/app/github-callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user,public_repo',
        redirectTo,
      },
    });
    if (error) throw new Error(error.message);
  }

  /**
   * Handle the OAuth redirect.
   *
   * Strategy (most-reliable-first):
   *  1. Parse provider_token directly from the URL hash — always present right
   *     after the GitHub → Supabase → app redirect, zero async dependency.
   *  2. Fall back to supabase.auth.getSession() in case the hash was already
   *     consumed by a previous call.
   *  3. Fall back to onAuthStateChange for the rare race where session isn't
   *     ready yet at call time.
   *  4. Hard timeout after 15 s.
   */
  async handleCallback(userId: string): Promise<{ profile: GitHubProfile; token: string } | null> {
    console.log('🔵 handleCallback called for userId:', userId);
    console.log('🔵 Current URL:', window.location.href);
    console.log('🔵 Hash:', window.location.hash);

    // ── Strategy 1: parse URL hash directly ────────────────────────────────
    // Supabase puts provider_token in the fragment after OAuth redirect.
    // This works even when the auth-state-change event fires before our
    // listener is registered (race condition on React mount).
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const providerToken = params.get('provider_token');

      console.log('🔵 Parsed provider_token from hash:', providerToken ? `${providerToken.substring(0, 20)}...` : 'null');

      if (providerToken) {
        try {
          console.log('🔵 Fetching GitHub profile...');
          const profile = await this.fetchGitHubProfile(providerToken);
          console.log('🔵 GitHub profile fetched:', profile);

          if (profile) {
            console.log('🔵 Calling saveConnection...');
            await this.saveConnection(userId, profile, providerToken);
            console.log('✅ saveConnection completed successfully');

            // Clear the hash from the URL so back-navigation doesn't re-trigger
            window.history.replaceState(null, '', window.location.pathname);
            return { profile, token: providerToken };
          }
        } catch (err) {
          console.error('❌ handleCallback (hash path) error:', err);
          throw err; // let the caller surface it
        }
      }
    }

    // ── Strategy 2 & 3: session object / auth-state-change ─────────────────
    return new Promise((resolve, reject) => {
      let settled = false;

      const settle = (result: { profile: GitHubProfile; token: string } | null, err?: Error) => {
        if (settled) return;
        settled = true;
        subscription.unsubscribe();
        if (err) reject(err);
        else resolve(result);
      };

      const process = async (token: string) => {
        const profile = await this.fetchGitHubProfile(token);
        if (!profile) { settle(null); return; }
        await this.saveConnection(userId, profile, token); // throws on error
        settle({ profile, token });
      };

      // Listener (strategy 3)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.provider_token) {
          process(session.provider_token).catch((err) => settle(null, err));
        }
      });

      // Immediate session check (strategy 2)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.provider_token && !settled) {
          process(session.provider_token).catch((err) => settle(null, err));
        }
      });

      // Hard timeout
      setTimeout(() => {
        if (!settled) {
          console.error('handleCallback timed out — no GitHub token found');
          settle(null, new Error(
            'Could not retrieve GitHub token. Make sure pop-ups are not blocked and try again.'
          ));
        }
      }, 15_000);
    });
  }

  /**
   * Fetch GitHub user profile using the OAuth access token.
   */
  async fetchGitHubProfile(token: string): Promise<GitHubProfile | null> {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (!res.ok) return null;
      return await res.json() as GitHubProfile;
    } catch {
      return null;
    }
  }

  /**
   * Upsert the GitHub connection record into Supabase.
   * Throws on failure so the callback page can surface the error.
   */
  async saveConnection(userId: string, profile: GitHubProfile, token: string): Promise<void> {
    console.log('🔵 saveConnection called:', {
      userId,
      githubId: profile.id,
      githubLogin: profile.login,
      tokenLength: token?.length,
    });

    const payload = {
      user_id: userId,
      github_id: profile.id,
      github_login: profile.login,
      github_name: profile.name,
      github_avatar_url: profile.avatar_url,
      github_access_token: token,
      updated_at: new Date().toISOString(),
    };

    console.log('🔵 Upserting to github_connections:', payload);

    const { data, error } = await supabase.from('github_connections').upsert(
      payload,
      { onConflict: 'user_id' }
    ).select();

    console.log('🔵 Upsert result:', { data, error });

    if (error) {
      console.error('❌ saveConnection error:', error);
      throw new Error(`Failed to save GitHub connection: ${error.message} (code: ${error.code})`);
    }

    console.log('✅ GitHub connection saved successfully');
  }

  /**
   * Load the current GitHub connection for a user.
   */
  async getConnection(userId: string): Promise<GitHubConnection | null> {
    const { data, error } = await supabase
      .from('github_connections')
      .select('github_login, github_name, github_avatar_url, starred_repos_count, connected_at, last_synced_at')
      .eq('user_id', userId)
      .maybeSingle(); // maybeSingle returns null (not error) when no row exists

    if (error || !data) return null;
    return {
      githubLogin: data.github_login,
      githubName: data.github_name ?? null,
      githubAvatarUrl: data.github_avatar_url,
      starredReposCount: data.starred_repos_count ?? 0,
      connectedAt: data.connected_at,
      lastSyncedAt: data.last_synced_at ?? null,
    };
  }

  /**
   * Disconnect GitHub — removes all stored data for this user.
   */
  async disconnect(userId: string): Promise<void> {
    await supabase.from('github_starred_repos').delete().eq('user_id', userId);
    await supabase.from('github_connections').delete().eq('user_id', userId);
  }

  /**
   * Sync all GitHub starred repos.
   * Paginates through the GitHub API and upserts in batches.
   * Calls onProgress(synced, estimatedTotal) as it goes.
   */
  async syncStarredRepos(
    userId: string,
    onProgress?: (synced: number, total: number) => void
  ): Promise<number> {
    // Get stored token
    const { data: conn } = await supabase
      .from('github_connections')
      .select('github_access_token')
      .eq('user_id', userId)
      .maybeSingle();

    if (!conn?.github_access_token) throw new Error('No GitHub token — please reconnect');
    const token = conn.github_access_token;

    // Probe first page for Link header to get total page count
    const probe = await fetch(
      `https://api.github.com/user/starred?per_page=1&page=1`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.star+json' } }
    );
    let estimatedTotal = 0;
    if (probe.ok) {
      const link = probe.headers.get('Link') ?? '';
      const m = link.match(/page=(\d+)>; rel="last"/);
      if (m) estimatedTotal = parseInt(m[1]);
    }

    // Fetch all pages
    const allStarred: StarredRepo[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const res = await fetch(
        `https://api.github.com/user/starred?per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.star+json',
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) throw new Error('GitHub token expired — please reconnect');
        break;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      for (const item of data) {
        // vnd.github.star+json returns { starred_at, repo } objects
        const r = item.repo ?? item;
        allStarred.push({
          id: String(r.id),
          fullName: r.full_name,
          name: r.name,
          description: r.description ?? null,
          stars: r.stargazers_count ?? 0,
          forks: r.forks_count ?? 0,
          language: r.language ?? null,
          url: r.html_url,
          ownerLogin: r.owner?.login ?? '',
          ownerAvatarUrl: r.owner?.avatar_url ?? '',
          topics: r.topics ?? [],
          starredAt: item.starred_at ?? new Date().toISOString(),
        });
      }

      onProgress?.(allStarred.length, estimatedTotal);

      const link = res.headers.get('Link') ?? '';
      if (!link.includes('rel="next"')) break;
      page++;
    }

    // Batch upsert (100 at a time)
    const CHUNK = 100;
    for (let i = 0; i < allStarred.length; i += CHUNK) {
      const chunk = allStarred.slice(i, i + CHUNK);
      const { error } = await supabase.from('github_starred_repos').upsert(
        chunk.map(r => ({
          user_id: userId,
          repo_id: r.id,
          repo_full_name: r.fullName,
          repo_name: r.name,
          repo_description: r.description,
          repo_stars: r.stars,
          repo_forks: r.forks,
          repo_language: r.language,
          repo_url: r.url,
          repo_owner_login: r.ownerLogin,
          repo_owner_avatar_url: r.ownerAvatarUrl,
          repo_topics: r.topics,
          starred_at: r.starredAt,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,repo_id' }
      );
      if (error) console.error('Upsert chunk error:', error);
    }

    // Update connection record with final count
    await supabase
      .from('github_connections')
      .update({
        starred_repos_count: allStarred.length,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return allStarred.length;
  }

  /**
   * Load cached starred repos from Supabase.
   */
  async getStarredRepos(userId: string, limit = 50, offset = 0): Promise<StarredRepo[]> {
    const { data, error } = await supabase
      .from('github_starred_repos')
      .select('*')
      .eq('user_id', userId)
      .order('starred_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return [];
    return data.map(r => ({
      id: r.repo_id,
      fullName: r.repo_full_name,
      name: r.repo_name,
      description: r.repo_description ?? '',
      stars: r.repo_stars ?? 0,
      forks: r.repo_forks ?? 0,
      language: r.repo_language ?? null,
      url: r.repo_url,
      ownerLogin: r.repo_owner_login,
      ownerAvatarUrl: r.repo_owner_avatar_url ?? '',
      topics: r.repo_topics ?? [],
      starredAt: r.starred_at ?? r.synced_at,
    }));
  }

  /**
   * Search starred repos by name / language.
   */
  async searchStarredRepos(userId: string, query: string, limit = 30): Promise<StarredRepo[]> {
    const { data, error } = await supabase
      .from('github_starred_repos')
      .select('*')
      .eq('user_id', userId)
      .or(`repo_full_name.ilike.%${query}%,repo_description.ilike.%${query}%,repo_language.ilike.%${query}%`)
      .order('repo_stars', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(r => ({
      id: r.repo_id,
      fullName: r.repo_full_name,
      name: r.repo_name,
      description: r.repo_description ?? '',
      stars: r.repo_stars ?? 0,
      forks: r.repo_forks ?? 0,
      language: r.repo_language ?? null,
      url: r.repo_url,
      ownerLogin: r.repo_owner_login,
      ownerAvatarUrl: r.repo_owner_avatar_url ?? '',
      topics: r.repo_topics ?? [],
      starredAt: r.starred_at ?? r.synced_at,
    }));
  }
}

export const gitHubAuthService = new GitHubAuthService();
