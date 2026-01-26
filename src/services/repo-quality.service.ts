/**
 * Repository Quality Validation Service
 * Ensures only high-quality, useful repositories are recommended
 */

import { Repository, UserPreferences } from '@/lib/types';

interface QualityScore {
  passed: boolean;
  score: number; // 0-100
  reasons: string[];
  warnings: string[];
}

class RepoQualityService {
  /**
   * Validate if a repository meets quality standards
   */
  validateRepoQuality(repo: Repository, preferences: UserPreferences): QualityScore {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 100;
    let passed = true;

    // 1. Check minimum stars based on popularity preference
    const minStars = this.getMinStars(preferences.popularityWeight);
    if (repo.stars < minStars) {
      passed = false;
      score -= 50;
      reasons.push(`Too few stars (${repo.stars} < ${minStars} required)`);
      return { passed, score, reasons, warnings };
    }

    // 2. Must have a description
    if (!repo.description || repo.description.trim().length < 20) {
      passed = false;
      score -= 30;
      reasons.push('Missing or too short description');
      return { passed, score, reasons, warnings };
    }

    // 3. Check for recent activity (not abandoned)
    const hoursAgo = this.parseTimeAgo(repo.lastUpdated);
    if (hoursAgo > 365 * 24) { // More than 1 year
      warnings.push('No recent activity (over 1 year old)');
      score -= 10;
    } else if (hoursAgo > 180 * 24) { // More than 6 months
      warnings.push('Limited recent activity (over 6 months old)');
      score -= 5;
    }

    // 4. Check if it's a generic/curated list repo
    if (this.isGenericListRepo(repo)) {
      passed = false;
      score -= 40;
      reasons.push('Generic curated list repository');
      return { passed, score, reasons, warnings };
    }

    // 5. Check if it's a mega-corporate repo (usually too generic)
    if (this.isMegaCorporateRepo(repo)) {
      passed = false;
      score -= 30;
      reasons.push('Mega-corporate repository (too generic)');
      return { passed, score, reasons, warnings };
    }

    // 6. Must have at least one tag or language
    if (!repo.language && (!repo.tags || repo.tags.length === 0)) {
      warnings.push('No language or tags specified');
      score -= 5;
    }

    // 7. Check description quality
    const descQuality = this.checkDescriptionQuality(repo.description);
    if (descQuality === 'poor') {
      warnings.push('Description is too generic or unclear');
      score -= 10;
    } else if (descQuality === 'excellent') {
      score += 5; // Bonus for good descriptions
    }

    // 8. Check for forks (indicates it's being used)
    if (repo.forks === 0 && repo.stars < 50) {
      warnings.push('No forks and low stars (may not be useful)');
      score -= 5;
    }

    // 9. Check for topics (indicates well-maintained)
    if (!repo.topics || repo.topics.length === 0) {
      warnings.push('No topics specified');
      score -= 3;
    }

    // 10. Check if description contains useful keywords
    const hasUsefulKeywords = this.hasUsefulKeywords(repo);
    if (!hasUsefulKeywords) {
      warnings.push('Description lacks specific purpose');
      score -= 5;
    }

    // Final score must be at least 50 to pass
    if (score < 50) {
      passed = false;
      reasons.push(`Quality score too low (${score}/100)`);
    }

    return { passed, score: Math.max(0, Math.min(100, score)), reasons, warnings };
  }

  /**
   * Get minimum stars based on popularity preference
   */
  private getMinStars(popularityWeight?: string): number {
    switch (popularityWeight) {
      case 'high':
        return 50; // At least 50 stars if popularity matters a lot
      case 'medium':
        return 20; // At least 20 stars if popularity matters somewhat
      case 'low':
        return 5; // At least 5 stars if popularity doesn't matter much
      default:
        return 10; // Default minimum
    }
  }

  /**
   * Check if repo is a generic curated list
   */
  private isGenericListRepo(repo: Repository): boolean {
    const descLower = (repo.description || '').toLowerCase();
    const nameLower = repo.name.toLowerCase();
    const fullNameLower = repo.fullName.toLowerCase();

    // Check for list indicators
    const listIndicators = [
      'curated list',
      'awesome list',
      'awesome-',
      'awesome.',
      'awesome/',
      'collection of',
      'list of',
      'curated collection',
    ];

    const hasListIndicator = listIndicators.some(indicator =>
      descLower.includes(indicator) || nameLower.includes(indicator) || fullNameLower.includes(indicator)
    );

    // If it's a list AND has many stars, it's probably just a curated list
    if (hasListIndicator && repo.stars > 1000) {
      return true;
    }

    // Check for "awesome" repos that are just lists
    if (nameLower.startsWith('awesome-') && repo.stars > 5000) {
      return true;
    }

    return false;
  }

  /**
   * Check if repo is from mega-corporate (usually too generic)
   */
  private isMegaCorporateRepo(repo: Repository): boolean {
    const fullNameLower = repo.fullName.toLowerCase();
    const corporateOrgs = [
      'microsoft/',
      'facebook/',
      'google/',
      'apple/',
      'amazon/',
      'netflix/',
      'uber/',
      'airbnb/',
    ];

    const isCorporate = corporateOrgs.some(org => fullNameLower.startsWith(org));
    
    // Only filter if it's very popular (likely a framework/library, not a tutorial)
    if (isCorporate && repo.stars > 10000) {
      // But allow if it's clearly a tutorial/learning resource
      const descLower = (repo.description || '').toLowerCase();
      const tutorialKeywords = ['tutorial', 'learn', 'course', 'guide', 'example'];
      const isTutorial = tutorialKeywords.some(keyword => descLower.includes(keyword));
      
      return !isTutorial; // Filter out unless it's a tutorial
    }

    return false;
  }

  /**
   * Check description quality
   */
  private checkDescriptionQuality(description: string): 'poor' | 'good' | 'excellent' {
    if (!description || description.length < 20) return 'poor';

    const descLower = description.toLowerCase();

    // Poor indicators
    const poorIndicators = [
      'awesome',
      'curated',
      'list',
      'collection',
      'just',
      'simple',
      'basic',
    ];

    const poorCount = poorIndicators.filter(indicator => descLower.includes(indicator)).length;
    if (poorCount >= 3) return 'poor';

    // Excellent indicators
    const excellentIndicators = [
      'framework',
      'library',
      'tutorial',
      'guide',
      'example',
      'boilerplate',
      'starter',
      'template',
      'course',
      'learn',
    ];

    const excellentCount = excellentIndicators.filter(indicator => descLower.includes(indicator)).length;
    if (excellentCount >= 2) return 'excellent';

    return 'good';
  }

  /**
   * Check if description has useful keywords
   */
  private hasUsefulKeywords(repo: Repository): boolean {
    const descLower = (repo.description || '').toLowerCase();
    const nameLower = repo.name.toLowerCase();

    // Useful keywords that indicate a specific purpose
    const usefulKeywords = [
      'framework',
      'library',
      'tutorial',
      'guide',
      'example',
      'boilerplate',
      'starter',
      'template',
      'course',
      'learn',
      'build',
      'create',
      'implement',
      'demo',
      'project',
      'app',
      'application',
      'tool',
      'utility',
      'plugin',
      'extension',
      'package',
      'module',
    ];

    return usefulKeywords.some(keyword =>
      descLower.includes(keyword) || nameLower.includes(keyword)
    );
  }

  /**
   * Parse "time ago" string to hours
   */
  private parseTimeAgo(timeAgo: string): number {
    const match = timeAgo.match(/(\d+)([smhdmo])/);
    if (!match) return 999999;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value / 3600;
      case 'm': return value / 60;
      case 'h': return value;
      case 'd': return value * 24;
      case 'mo': return value * 24 * 30;
      default: return 999999;
    }
  }

  /**
   * Filter repos to only include high-quality ones
   */
  filterHighQualityRepos(repos: Repository[], preferences: UserPreferences): Repository[] {
    return repos.filter(repo => {
      const quality = this.validateRepoQuality(repo, preferences);
      return quality.passed;
    });
  }

  /**
   * Sort repos by quality score (highest first)
   */
  sortByQuality(repos: Repository[], preferences: UserPreferences): Repository[] {
    return repos
      .map(repo => ({
        repo,
        quality: this.validateRepoQuality(repo, preferences),
      }))
      .filter(item => item.quality.passed)
      .sort((a, b) => b.quality.score - a.quality.score)
      .map(item => item.repo);
  }
}

export const repoQualityService = new RepoQualityService();
