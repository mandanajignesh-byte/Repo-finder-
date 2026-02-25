/**
 * Enhanced GitHub Service
 * Fetches deep repo health signals beyond basic search results.
 * Uses GitHub REST API v3 to gather commit activity, issues, contributors,
 * releases, and community health data.
 */

import { config } from '@/lib/config';
import { RepoHealthSignals, Repository, GitHubApiRepo } from '@/lib/types';

// In-memory cache for health signals (keyed by fullName)
const healthCache = new Map<string, { data: RepoHealthSignals; ts: number }>();
const HEALTH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

class GitHubEnhancedService {
  private baseUrl = config.github.baseUrl;
  private token = config.github.apiToken;

  private headers(): HeadersInit {
    const h: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async fetchJSON<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Fetch comprehensive health signals for a repository.
   * This makes ~5 API calls per repo so use wisely (cache aggressively).
   */
  async getHealthSignals(fullName: string): Promise<RepoHealthSignals | null> {
    // Check cache
    const cached = healthCache.get(fullName);
    if (cached && Date.now() - cached.ts < HEALTH_CACHE_TTL) {
      return cached.data;
    }

    // 1) Basic repo info
    const repo = await this.fetchJSON<any>(`/repos/${fullName}`);
    if (!repo) return null;

    // 2) Contributors count (just first page headers)
    const contributorCount = await this.getContributorCount(fullName);

    // 3) Commit activity (last 52 weeks)
    const commitActivity = await this.getCommitActivity(fullName);

    // 4) Issue close metrics
    const issueMetrics = await this.getIssueMetrics(fullName);

    // 5) Releases
    const releaseInfo = await this.getReleaseInfo(fullName);

    // 6) Community profile (README, contributing, etc.)
    const community = await this.getCommunityProfile(fullName);

    const signals: RepoHealthSignals = {
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      openIssues: repo.open_issues_count || 0,
      watchers: repo.subscribers_count || 0,
      lastPush: repo.pushed_at || repo.updated_at,
      createdAt: repo.created_at,
      license: repo.license?.spdx_id || repo.license?.name || null,
      language: repo.language || null,
      topics: repo.topics || [],
      defaultBranch: repo.default_branch || 'main',
      contributorCount,
      avgIssueCloseTimeDays: issueMetrics.avgCloseTimeDays,
      issueCloseRate: issueMetrics.closeRate,
      commitActivity52w: commitActivity,
      releaseCount: releaseInfo.count,
      lastReleaseDate: releaseInfo.lastDate,
      hasReadme: community.hasReadme,
      hasContributing: community.hasContributing,
      sizeKB: repo.size || 0,
    };

    healthCache.set(fullName, { data: signals, ts: Date.now() });
    return signals;
  }

  /**
   * Search GitHub and return enriched results with health scores.
   * Limits health-signal fetching to top N repos to stay within rate limits.
   */
  async smartSearch(
    query: string,
    options: {
      language?: string;
      sort?: 'stars' | 'updated' | 'best-match';
      limit?: number;
      minStars?: number;
      maxStars?: number;
    } = {}
  ): Promise<Repository[]> {
    const { language, sort = 'stars', limit = 15, minStars = 10, maxStars } = options;

    let q = query;
    if (language) q += ` language:${language}`;
    if (minStars) q += ` stars:>=${minStars}`;
    if (maxStars) q += ` stars:<=${maxStars}`;

    const params = new URLSearchParams({
      q,
      sort: sort === 'best-match' ? '' : sort,
      order: 'desc',
      per_page: Math.min(limit * 2, 50).toString(), // Fetch extra to filter
    });

    const data = await this.fetchJSON<any>(`/search/repositories?${params}`);
    if (!data?.items) return [];

    return data.items.slice(0, limit).map((item: GitHubApiRepo) => this.transformRepo(item));
  }

  /**
   * Find alternatives to a given repo by searching for similar topics and descriptions.
   */
  async findAlternatives(fullName: string, limit = 10): Promise<Repository[]> {
    // Get the repo's details first
    const repo = await this.fetchJSON<any>(`/repos/${fullName}`);
    if (!repo) return [];

    const topics = repo.topics || [];
    const language = repo.language;
    const description = (repo.description || '').toLowerCase();

    // Build search queries from topics and description keywords
    const searchQueries: string[] = [];

    // Query 1: Search by topics
    if (topics.length > 0) {
      const topicQuery = topics.slice(0, 3).map((t: string) => `topic:${t}`).join(' ');
      searchQueries.push(topicQuery);
    }

    // Query 2: Search by description keywords + language
    const keywords = description
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !['this', 'that', 'with', 'from', 'your', 'the', 'and', 'for'].includes(w))
      .slice(0, 4);
    if (keywords.length > 0) {
      let kq = keywords.join(' ');
      if (language) kq += ` language:${language}`;
      searchQueries.push(kq);
    }

    // Execute searches and merge results
    const seen = new Set<string>();
    seen.add(fullName.toLowerCase()); // Exclude the original repo
    const results: Repository[] = [];

    for (const sq of searchQueries) {
      if (results.length >= limit) break;
      const repos = await this.smartSearch(sq, { limit: limit * 2, minStars: 20 });
      for (const r of repos) {
        if (!seen.has(r.fullName.toLowerCase()) && results.length < limit) {
          seen.add(r.fullName.toLowerCase());
          results.push(r);
        }
      }
    }

    return results;
  }

  // ── Private helpers ──────────────────────────────────────────

  private async getContributorCount(fullName: string): Promise<number> {
    try {
      const res = await fetch(`${this.baseUrl}/repos/${fullName}/contributors?per_page=1&anon=false`, {
        headers: this.headers(),
      });
      if (!res.ok) return 0;
      // GitHub returns the total count in the Link header's last page
      const link = res.headers.get('link');
      if (link) {
        const match = link.match(/page=(\d+)>; rel="last"/);
        if (match) return parseInt(match[1], 10);
      }
      // If no pagination, count the items
      const items = await res.json();
      return Array.isArray(items) ? items.length : 0;
    } catch {
      return 0;
    }
  }

  private async getCommitActivity(fullName: string): Promise<number> {
    // GitHub's stats/participation gives 52-week commit data
    const data = await this.fetchJSON<any>(`/repos/${fullName}/stats/participation`);
    if (!data?.all) return 0;
    return (data.all as number[]).reduce((sum: number, n: number) => sum + n, 0);
  }

  private async getIssueMetrics(fullName: string): Promise<{
    avgCloseTimeDays: number | null;
    closeRate: number | null;
  }> {
    try {
      // Get last 30 closed issues
      const closed = await this.fetchJSON<any[]>(
        `/repos/${fullName}/issues?state=closed&per_page=30&sort=updated&direction=desc`
      );

      // Get open issue count from repo (already have it) - use search
      const open = await this.fetchJSON<any>(
        `/search/issues?q=repo:${fullName}+is:issue+is:open&per_page=1`
      );

      const closedCount = closed?.length || 0;
      const openCount = open?.total_count || 0;
      const totalCount = closedCount + openCount;

      // Calculate average close time
      let avgCloseTimeDays: number | null = null;
      if (closed && closed.length > 0) {
        const closeTimes = closed
          .filter((issue: any) => issue.closed_at && issue.created_at && !issue.pull_request)
          .map((issue: any) => {
            const created = new Date(issue.created_at).getTime();
            const closedAt = new Date(issue.closed_at).getTime();
            return (closedAt - created) / (1000 * 60 * 60 * 24); // days
          })
          .filter((d: number) => d >= 0 && d < 365); // Filter outliers

        if (closeTimes.length > 0) {
          avgCloseTimeDays = closeTimes.reduce((a: number, b: number) => a + b, 0) / closeTimes.length;
        }
      }

      const closeRate = totalCount > 0 ? closedCount / totalCount : null;

      return { avgCloseTimeDays, closeRate };
    } catch {
      return { avgCloseTimeDays: null, closeRate: null };
    }
  }

  private async getReleaseInfo(fullName: string): Promise<{
    count: number;
    lastDate: string | null;
  }> {
    try {
      const res = await fetch(`${this.baseUrl}/repos/${fullName}/releases?per_page=1`, {
        headers: this.headers(),
      });
      if (!res.ok) return { count: 0, lastDate: null };

      // Total count from Link header
      let count = 0;
      const link = res.headers.get('link');
      if (link) {
        const match = link.match(/page=(\d+)>; rel="last"/);
        if (match) count = parseInt(match[1], 10);
      }

      const releases = await res.json();
      const lastDate = releases?.[0]?.published_at || null;

      if (count === 0 && Array.isArray(releases)) count = releases.length;

      return { count, lastDate };
    } catch {
      return { count: 0, lastDate: null };
    }
  }

  private async getCommunityProfile(fullName: string): Promise<{
    hasReadme: boolean;
    hasContributing: boolean;
  }> {
    const data = await this.fetchJSON<any>(`/repos/${fullName}/community/profile`);
    if (!data?.files) {
      return { hasReadme: true, hasContributing: false }; // Assume README exists
    }
    return {
      hasReadme: !!data.files.readme,
      hasContributing: !!data.files.contributing,
    };
  }

  private transformRepo(apiRepo: GitHubApiRepo): Repository {
    const tagsSet = new Set<string>();
    const tags: string[] = [];
    if (apiRepo.language) {
      tagsSet.add(apiRepo.language.toLowerCase());
      tags.push(apiRepo.language);
    }
    const topics = apiRepo.topics || [];
    for (const topic of topics) {
      if (!tagsSet.has(topic.toLowerCase()) && tags.length < 5) {
        tagsSet.add(topic.toLowerCase());
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

  private formatTimeAgo(dateString: string): string {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 2592000)}mo ago`;
  }
}

export const githubEnhancedService = new GitHubEnhancedService();
