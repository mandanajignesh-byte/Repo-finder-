/**
 * Repo Comparison Service
 * Compares 2-5 repositories side-by-side using health scores.
 * Determines category winners and produces a natural-language verdict.
 */

import { RepoComparison, ScoredRepository, RepoHealthScore } from '@/lib/types';
import { githubEnhancedService } from './github-enhanced.service';
import { repoHealthScoreService } from './repo-health-score.service';

class RepoComparisonService {
  /**
   * Compare 2+ repos by fullName (e.g. "facebook/react", "vuejs/vue").
   * Returns enriched data with health scores, category winners, and verdict.
   */
  async compare(fullNames: string[]): Promise<RepoComparison | null> {
    if (fullNames.length < 2) return null;

    // Limit to 5 repos for performance
    const names = fullNames.slice(0, 5);

    // Fetch health signals in parallel
    const scoredRepos: ScoredRepository[] = [];

    const results = await Promise.allSettled(
      names.map(async (name) => {
        const signals = await githubEnhancedService.getHealthSignals(name);
        if (!signals) return null;

        const healthScore = repoHealthScoreService.calculate(signals);

        // Fetch basic repo info for display
        const repos = await githubEnhancedService.smartSearch(name, { limit: 1, minStars: 0 });
        const repo = repos.find(
          (r) => r.fullName.toLowerCase() === name.toLowerCase()
        ) || repos[0];

        if (!repo) return null;

        // Calculate star velocity (stars per month)
        const ageDays = Math.max(1, (Date.now() - new Date(signals.createdAt).getTime()) / 86400000);
        const starVelocity = Math.round((signals.stars / ageDays) * 30);

        return { ...repo, healthScore, starVelocity } as ScoredRepository;
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        scoredRepos.push(r.value);
      }
    }

    if (scoredRepos.length < 2) return null;

    // Determine category winners
    const categories = ['popularity', 'activity', 'maintenance', 'community', 'documentation', 'maturity'] as const;
    const categoryWinners: Record<string, string> = {};

    for (const cat of categories) {
      let best = scoredRepos[0];
      for (const repo of scoredRepos) {
        if (repo.healthScore.breakdown[cat] > best.healthScore.breakdown[cat]) {
          best = repo;
        }
      }
      categoryWinners[cat] = best.fullName;
    }

    // Overall winner
    const overallWinner = scoredRepos.reduce((best, repo) =>
      repo.healthScore.overall > best.healthScore.overall ? repo : best
    );

    // Build verdict
    const verdict = this.buildVerdict(scoredRepos, categoryWinners, overallWinner);
    const summary = this.buildSummary(scoredRepos);

    return { repos: scoredRepos, verdict, categoryWinners, summary };
  }

  private buildVerdict(
    repos: ScoredRepository[],
    categoryWinners: Record<string, string>,
    overallWinner: ScoredRepository
  ): string {
    const parts: string[] = [];

    parts.push(
      `**${overallWinner.fullName}** leads overall with a health score of ` +
      `${overallWinner.healthScore.overall}/100 (${overallWinner.healthScore.grade}).`
    );

    // Highlight where the runner-up wins
    const runnerUp = repos.find((r) => r.fullName !== overallWinner.fullName);
    if (runnerUp) {
      const ruWins = Object.entries(categoryWinners)
        .filter(([, winner]) => winner === runnerUp.fullName)
        .map(([cat]) => cat);

      if (ruWins.length > 0) {
        parts.push(
          `However, **${runnerUp.fullName}** wins in ${ruWins.join(', ')}.`
        );
      }
    }

    return parts.join(' ');
  }

  private buildSummary(repos: ScoredRepository[]): string {
    return repos
      .map(
        (r) =>
          `• ${r.fullName}: ${r.healthScore.overall}/100 (${r.healthScore.grade}) — ` +
          `${r.stars.toLocaleString()} stars, ${r.starVelocity} stars/month`
      )
      .join('\n');
  }
}

export const repoComparisonService = new RepoComparisonService();
