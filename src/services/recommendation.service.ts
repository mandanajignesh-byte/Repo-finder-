/**
 * Recommendation Service
 * Handles personalized repository recommendations
 */

import { Repository, UserPreferences } from '@/lib/types';
import { githubService } from './github.service';

class RecommendationService {
  /**
   * Calculate fit score for a repository based on user preferences
   */
  calculateFitScore(repo: Repository, preferences?: UserPreferences): number {
    if (!preferences) return 50; // Default score

    let score = 0;
    let maxScore = 0;

    // Tech stack match (40 points)
    if (preferences.techStack.length > 0) {
      const matchingTags = repo.tags.filter(tag =>
        preferences.techStack.some(tech =>
          tag.toLowerCase().includes(tech.toLowerCase()) ||
          tech.toLowerCase().includes(tag.toLowerCase())
        )
      );
      score += (matchingTags.length / preferences.techStack.length) * 40;
    }
    maxScore += 40;

    // Language match (30 points)
    if (repo.language && preferences.techStack.includes(repo.language)) {
      score += 30;
    }
    maxScore += 30;

    // Stars/popularity (20 points)
    if (repo.stars > 1000) score += 20;
    else if (repo.stars > 100) score += 10;
    maxScore += 20;

    // Recent activity (10 points)
    const hoursAgo = this.parseTimeAgo(repo.lastUpdated);
    if (hoursAgo < 24) score += 10;
    else if (hoursAgo < 168) score += 5; // Within a week
    maxScore += 10;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(
    preferences: UserPreferences,
    limit = 20
  ): Promise<Repository[]> {
    try {
      // Search based on tech stack
      const techStackQuery = preferences.techStack?.join(' ') || '';
      
      // If no tech stack, use a general popular query for well-known repos
      // This ensures we get real, popular repositories
      const searchQuery = techStackQuery || 'stars:>500 sort:stars';
      
      const repos = await githubService.searchRepos(searchQuery, {
        sort: 'stars',
        order: 'desc',
        perPage: 100, // Use 100 like Python script
        usePagination: false, // Set to true if you want all pages
      });

      // Calculate fit scores and sort
      const reposWithScores = repos.map(repo => ({
        ...repo,
        fitScore: this.calculateFitScore(repo, preferences),
      }));

      // Sort by fit score and return top results
      return reposWithScores
        .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Parse "time ago" string to hours
   */
  private parseTimeAgo(timeAgo: string): number {
    const match = timeAgo.match(/(\d+)([smhd])/);
    if (!match) return 999999;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value / 3600;
      case 'm': return value / 60;
      case 'h': return value;
      case 'd': return value * 24;
      default: return 999999;
    }
  }
}

export const recommendationService = new RecommendationService();
