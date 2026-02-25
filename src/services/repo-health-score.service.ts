/**
 * Repo Health Score Calculator
 * Computes a composite 0-100 health score from raw GitHub signals.
 *
 * Six pillars (each scored 0-100):
 *  1. Popularity      – stars, watchers, forks
 *  2. Activity         – commit frequency, recency of last push
 *  3. Maintenance      – issue close rate, avg issue close time
 *  4. Community        – contributor count, fork-to-star ratio
 *  5. Documentation    – README, CONTRIBUTING, description quality
 *  6. Maturity         – releases, age, license
 *
 * Overall = weighted average of the six pillars.
 */

import { RepoHealthSignals, RepoHealthScore } from '@/lib/types';

// Weights for each pillar (must sum to 1)
const WEIGHTS = {
  popularity: 0.20,
  activity: 0.25,
  maintenance: 0.20,
  community: 0.15,
  documentation: 0.10,
  maturity: 0.10,
};

class RepoHealthScoreService {
  /**
   * Calculate full health score from raw signals.
   */
  calculate(signals: RepoHealthSignals): RepoHealthScore {
    const popularity = this.scorePopularity(signals);
    const activity = this.scoreActivity(signals);
    const maintenance = this.scoreMaintenance(signals);
    const community = this.scoreCommunity(signals);
    const documentation = this.scoreDocumentation(signals);
    const maturity = this.scoreMaturity(signals);

    const breakdown = { popularity, activity, maintenance, community, documentation, maturity };

    const overall = Math.round(
      popularity * WEIGHTS.popularity +
      activity * WEIGHTS.activity +
      maintenance * WEIGHTS.maintenance +
      community * WEIGHTS.community +
      documentation * WEIGHTS.documentation +
      maturity * WEIGHTS.maturity
    );

    const grade = this.toGrade(overall);
    const summary = this.buildSummary(breakdown, signals);

    return { overall, grade, breakdown, signals, summary };
  }

  // ── Pillar scorers ───────────────────────────────────────────

  private scorePopularity(s: RepoHealthSignals): number {
    // Stars: 0→0, 100→40, 1000→70, 10000→90, 50000+→100
    const starScore = this.logScale(s.stars, 10, 50000);
    // Watchers: 0→0, 10→30, 100→60, 1000+→100
    const watcherScore = this.logScale(s.watchers, 5, 5000);
    // Forks: 0→0, 10→30, 100→60, 1000+→100
    const forkScore = this.logScale(s.forks, 5, 5000);

    return Math.round(starScore * 0.5 + watcherScore * 0.25 + forkScore * 0.25);
  }

  private scoreActivity(s: RepoHealthSignals): number {
    // Recency of last push
    const daysSinceLastPush = this.daysSince(s.lastPush);
    let recencyScore: number;
    if (daysSinceLastPush <= 7) recencyScore = 100;
    else if (daysSinceLastPush <= 30) recencyScore = 85;
    else if (daysSinceLastPush <= 90) recencyScore = 65;
    else if (daysSinceLastPush <= 180) recencyScore = 40;
    else if (daysSinceLastPush <= 365) recencyScore = 20;
    else recencyScore = 5;

    // Commit frequency: commits per week over last year
    const commitsPerWeek = s.commitActivity52w / 52;
    let commitScore: number;
    if (commitsPerWeek >= 10) commitScore = 100;
    else if (commitsPerWeek >= 5) commitScore = 85;
    else if (commitsPerWeek >= 2) commitScore = 70;
    else if (commitsPerWeek >= 1) commitScore = 55;
    else if (commitsPerWeek >= 0.5) commitScore = 40;
    else if (commitsPerWeek > 0) commitScore = 25;
    else commitScore = 5;

    return Math.round(recencyScore * 0.5 + commitScore * 0.5);
  }

  private scoreMaintenance(s: RepoHealthSignals): number {
    // Issue close rate: 0→0, 0.5→50, 0.8→80, 0.95+→100
    let closeRateScore = 50; // Default if no issues
    if (s.issueCloseRate !== null) {
      closeRateScore = Math.min(100, Math.round(s.issueCloseRate * 100));
    }

    // Average issue close time
    let closeTimeScore = 50; // Default
    if (s.avgIssueCloseTimeDays !== null) {
      if (s.avgIssueCloseTimeDays <= 1) closeTimeScore = 100;
      else if (s.avgIssueCloseTimeDays <= 3) closeTimeScore = 90;
      else if (s.avgIssueCloseTimeDays <= 7) closeTimeScore = 75;
      else if (s.avgIssueCloseTimeDays <= 14) closeTimeScore = 60;
      else if (s.avgIssueCloseTimeDays <= 30) closeTimeScore = 45;
      else if (s.avgIssueCloseTimeDays <= 90) closeTimeScore = 25;
      else closeTimeScore = 10;
    }

    return Math.round(closeRateScore * 0.5 + closeTimeScore * 0.5);
  }

  private scoreCommunity(s: RepoHealthSignals): number {
    // Contributors: 1→10, 5→40, 20→70, 100+→100
    const contribScore = this.logScale(s.contributorCount, 1, 500);

    // Fork-to-star ratio: high ratio = people are building on it
    const forkRatio = s.stars > 0 ? s.forks / s.stars : 0;
    let forkRatioScore: number;
    if (forkRatio >= 0.3) forkRatioScore = 100;
    else if (forkRatio >= 0.2) forkRatioScore = 80;
    else if (forkRatio >= 0.1) forkRatioScore = 60;
    else if (forkRatio >= 0.05) forkRatioScore = 40;
    else forkRatioScore = 20;

    return Math.round(contribScore * 0.6 + forkRatioScore * 0.4);
  }

  private scoreDocumentation(s: RepoHealthSignals): number {
    let score = 0;
    if (s.hasReadme) score += 50;
    if (s.hasContributing) score += 30;
    if (s.topics.length >= 3) score += 10;
    if (s.language) score += 10;
    return Math.min(100, score);
  }

  private scoreMaturity(s: RepoHealthSignals): number {
    // Age: older = more mature (up to a point)
    const ageDays = this.daysSince(s.createdAt);
    let ageScore: number;
    if (ageDays >= 1095) ageScore = 100; // 3+ years
    else if (ageDays >= 730) ageScore = 85; // 2+ years
    else if (ageDays >= 365) ageScore = 70; // 1+ year
    else if (ageDays >= 180) ageScore = 55;
    else if (ageDays >= 90) ageScore = 40;
    else ageScore = 25;

    // Releases
    let releaseScore: number;
    if (s.releaseCount >= 20) releaseScore = 100;
    else if (s.releaseCount >= 10) releaseScore = 80;
    else if (s.releaseCount >= 5) releaseScore = 60;
    else if (s.releaseCount >= 1) releaseScore = 40;
    else releaseScore = 10;

    // License
    const licenseScore = s.license ? 100 : 20;

    return Math.round(ageScore * 0.35 + releaseScore * 0.35 + licenseScore * 0.30);
  }

  // ── Utilities ────────────────────────────────────────────────

  /** Logarithmic scale mapping: maps `value` from `[0..max]` to `[0..100]` */
  private logScale(value: number, min: number, max: number): number {
    if (value <= 0) return 0;
    const clamped = Math.max(min, Math.min(value, max));
    const normalized = (Math.log(clamped) - Math.log(min)) / (Math.log(max) - Math.log(min));
    return Math.round(normalized * 100);
  }

  private daysSince(isoDate: string): number {
    return Math.max(0, (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  private toGrade(score: number): RepoHealthScore['grade'] {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 55) return 'C+';
    if (score >= 45) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  private buildSummary(
    breakdown: RepoHealthScore['breakdown'],
    signals: RepoHealthSignals
  ): string {
    const parts: string[] = [];

    // Strengths
    const strengths = Object.entries(breakdown)
      .filter(([, v]) => v >= 75)
      .map(([k]) => k);
    if (strengths.length > 0) {
      parts.push(`Strong in: ${strengths.join(', ')}.`);
    }

    // Weaknesses
    const weaknesses = Object.entries(breakdown)
      .filter(([, v]) => v < 45)
      .map(([k]) => k);
    if (weaknesses.length > 0) {
      parts.push(`Needs improvement: ${weaknesses.join(', ')}.`);
    }

    // Key stats
    parts.push(
      `${signals.stars.toLocaleString()} stars, ${signals.contributorCount} contributors, ` +
      `${signals.releaseCount} releases.`
    );

    const daysSincePush = Math.round(this.daysSince(signals.lastPush));
    if (daysSincePush <= 7) {
      parts.push('Actively maintained (pushed within last week).');
    } else if (daysSincePush <= 30) {
      parts.push(`Last push ${daysSincePush} days ago.`);
    } else {
      parts.push(`⚠️ Last push ${daysSincePush} days ago.`);
    }

    return parts.join(' ');
  }
}

export const repoHealthScoreService = new RepoHealthScoreService();
