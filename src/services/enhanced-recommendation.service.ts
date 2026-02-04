/**
 * Enhanced Recommendation Service
 * Implements hybrid recommendation system with:
 * - Enhanced content-based filtering
 * - Collaborative filtering (user-based and item-based)
 * - Session-based recommendations
 * - Diversity and novelty filters
 */

import { Repository, UserPreferences, UserInteraction, RecommendationScores } from '@/lib/types';
import { githubService } from './github.service';
import { interactionService } from './interaction.service';
import { supabaseService } from './supabase.service';

class EnhancedRecommendationService {
  /**
   * Enhanced content-based score calculation
   */
  calculateContentScore(repo: Repository, preferences: UserPreferences): number {
    if (!preferences) return 50;

    // Penalty for overly generic repos
    const genericPenalty = this.calculateGenericPenalty(repo);
    if (genericPenalty < 0.3) {
      return Math.round(genericPenalty * 50); // Heavily penalize generic repos
    }

    let score = 0;
    let maxScore = 0;

    // Tech stack match (30 points)
    if (preferences.techStack.length > 0) {
      const matchingTags = repo.tags.filter(tag =>
        preferences.techStack.some(tech =>
          tag.toLowerCase().includes(tech.toLowerCase()) ||
          tech.toLowerCase().includes(tag.toLowerCase())
        )
      );
      score += (matchingTags.length / preferences.techStack.length) * 30;
    }
    maxScore += 30;

    // Language match (20 points)
    if (repo.language && preferences.techStack.includes(repo.language)) {
      score += 20;
    }
    maxScore += 20;

    // Goals match (15 points)
    if (preferences.goals && preferences.goals.length > 0) {
      const goalMatch = this.calculateGoalMatch(repo, preferences.goals);
      score += goalMatch * 15;
    }
    maxScore += 15;

    // Project type match (10 points)
    if (preferences.projectTypes && preferences.projectTypes.length > 0) {
      const typeMatch = this.calculateProjectTypeMatch(repo, preferences.projectTypes);
      score += typeMatch * 10;
    }
    maxScore += 10;

    // Activity preference (10 points)
    if (preferences.activityPreference) {
      const activityMatch = this.calculateActivityMatch(repo, preferences.activityPreference);
      score += activityMatch * 10;
    }
    maxScore += 10;

    // Documentation quality (5 points)
    if (preferences.documentationImportance) {
      const docScore = this.calculateDocumentationScore(repo, preferences.documentationImportance);
      score += docScore * 5;
    }
    maxScore += 5;

    // Popularity (10 points) - adjusted by user preference
    const popularityWeight = preferences.popularityWeight === 'high' ? 1.0 :
                             preferences.popularityWeight === 'medium' ? 0.5 : 0.2;
    const popularityScore = this.calculatePopularityScore(repo) * popularityWeight;
    score += popularityScore * 10;
    maxScore += 10;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Calculate goal match score with enhanced tutorial/learning detection
   */
  private calculateGoalMatch(repo: Repository, goals: string[]): number {
    const description = (repo.description || '').toLowerCase();
    const tags = repo.tags.map(t => t.toLowerCase()).join(' ');
    const name = repo.name.toLowerCase();
    const fullName = repo.fullName.toLowerCase();
    const topics = (repo.topics || []).map(t => t.toLowerCase());
    const allText = `${description} ${tags} ${name} ${fullName} ${topics.join(' ')}`;

    // Tutorial/learning indicators (comprehensive list)
    const tutorialIndicators = [
      'tutorial', 'tutorials', 'learn', 'learning', 'course', 'courses',
      'workshop', 'workshops', 'guide', 'guides', 'example', 'examples',
      'lesson', 'lessons', 'training', 'education', 'educational',
      'beginner', 'beginners', 'getting-started', 'getting started',
      'how-to', 'howto', 'walkthrough', 'walk-through', 'demo', 'demos'
    ];

    // Check if repo is tutorial-related
    const hasTutorialIndicator = tutorialIndicators.some(indicator => 
      allText.includes(indicator) ||
      name.includes(indicator) ||
      topics.includes(indicator)
    );

    // Prioritize repos with "tutorial" in name (strongest signal)
    const hasTutorialInName = name.includes('tutorial') || name.includes('learn') || name.includes('course');
    
    // Check topics for tutorial-related topics
    const hasTutorialTopic = topics.some(topic => 
      tutorialIndicators.some(indicator => topic.includes(indicator))
    );

    let matchCount = 0;
    let matchStrength = 0; // Track how strong the match is (0-1)

    if (goals.includes('learning') || goals.includes('learning-new-tech')) {
      if (hasTutorialInName) {
        matchCount++;
        matchStrength = Math.max(matchStrength, 1.0); // Strongest signal
      } else if (hasTutorialTopic) {
        matchCount++;
        matchStrength = Math.max(matchStrength, 0.9); // Very strong signal
      } else if (hasTutorialIndicator) {
        matchCount++;
        matchStrength = Math.max(matchStrength, 0.7); // Good signal
      } else if (allText.includes('tutorial') || allText.includes('learn') || allText.includes('example')) {
        matchCount++;
        matchStrength = Math.max(matchStrength, 0.5); // Basic match
      }
    }

    if (goals.includes('contributing') && (allText.includes('contribut') || allText.includes('open source') || repo.stars > 100)) {
      matchCount++;
      matchStrength = Math.max(matchStrength, 0.6);
    }

    if (goals.includes('discovering') && repo.stars > 500) {
      matchCount++;
      matchStrength = Math.max(matchStrength, 0.5);
    }

    if ((goals.includes('building') || goals.includes('building-project')) && (allText.includes('boilerplate') || allText.includes('starter') || allText.includes('template'))) {
      matchCount++;
      matchStrength = Math.max(matchStrength, 0.6);
    }

    // Return weighted score based on match count and strength
    if (matchCount === 0) return 0;
    return (matchCount / goals.length) * (0.5 + matchStrength * 0.5);
  }

  /**
   * Calculate project type match with enhanced tutorial detection
   */
  private calculateProjectTypeMatch(repo: Repository, projectTypes: string[]): number {
    const description = (repo.description || '').toLowerCase();
    const tags = repo.tags.map(t => t.toLowerCase()).join(' ');
    const name = repo.name.toLowerCase();
    const fullName = repo.fullName.toLowerCase();
    const topics = (repo.topics || []).map(t => t.toLowerCase());
    const allText = `${description} ${tags} ${name} ${fullName} ${topics.join(' ')}`;

    // Tutorial indicators
    const tutorialIndicators = [
      'tutorial', 'tutorials', 'learn', 'learning', 'course', 'courses',
      'workshop', 'workshops', 'guide', 'guides', 'example', 'examples',
      'lesson', 'lessons', 'training', 'education', 'educational'
    ];

    let matchCount = 0;
    let matchStrength = 0;

    if (projectTypes.includes('library') && (allText.includes('library') || allText.includes('lib'))) {
      matchCount++;
      matchStrength = Math.max(matchStrength, 0.7);
    }
    if (projectTypes.includes('framework') && allText.includes('framework')) {
      matchCount++;
      matchStrength = Math.max(matchStrength, 0.8);
    }
    if (projectTypes.includes('tool') && (allText.includes('tool') || allText.includes('cli'))) {
      matchCount++;
      matchStrength = Math.max(matchStrength, 0.7);
    }
    if (projectTypes.includes('tutorial')) {
      // Enhanced tutorial detection
      const hasTutorialInName = name.includes('tutorial') || name.includes('learn') || name.includes('course');
      const hasTutorialTopic = topics.some(topic => 
        tutorialIndicators.some(indicator => topic.includes(indicator))
      );
      const hasTutorialIndicator = tutorialIndicators.some(indicator => allText.includes(indicator));

      if (hasTutorialInName) {
        matchCount++;
        matchStrength = Math.max(matchStrength, 1.0); // Strongest
      } else if (hasTutorialTopic) {
        matchCount++;
        matchStrength = Math.max(matchStrength, 0.9); // Very strong
      } else if (hasTutorialIndicator) {
        matchCount++;
        matchStrength = Math.max(matchStrength, 0.7); // Good
      } else if (allText.includes('tutorial') || allText.includes('learn')) {
        matchCount++;
        matchStrength = Math.max(matchStrength, 0.5); // Basic
      }
    }
    if (projectTypes.includes('full-app') && (allText.includes('app') || allText.includes('application'))) {
      matchCount++;
      matchStrength = Math.max(matchStrength, 0.6);
    }
    if (projectTypes.includes('boilerplate') && (allText.includes('boilerplate') || allText.includes('starter'))) {
      matchCount++;
      matchStrength = Math.max(matchStrength, 0.7);
    }

    if (matchCount === 0) return 0;
    return (matchCount / projectTypes.length) * (0.5 + matchStrength * 0.5);
  }

  /**
   * Calculate activity match
   */
  private calculateActivityMatch(repo: Repository, preference: string): number {
    const hoursAgo = this.parseTimeAgo(repo.lastUpdated);

    if (preference === 'active') {
      return hoursAgo < 168 ? 1.0 : hoursAgo < 720 ? 0.5 : 0; // Active = updated within week
    } else if (preference === 'stable') {
      return hoursAgo > 720 && repo.stars > 100 ? 1.0 : 0.5; // Stable = older but popular
    } else if (preference === 'trending') {
      return repo.stars > 1000 ? 1.0 : repo.stars > 500 ? 0.7 : 0.3;
    }
    return 0.5; // 'any'
  }

  /**
   * Calculate documentation score
   */
  private calculateDocumentationScore(repo: Repository, importance: string): number {
    // For now, assume repos with longer descriptions have better docs
    // In future, could check README length or presence of docs folder
    const hasGoodDescription = repo.description && repo.description.length > 100;
    
    if (importance === 'critical') {
      return hasGoodDescription ? 1.0 : 0.3;
    } else if (importance === 'important') {
      return hasGoodDescription ? 1.0 : 0.6;
    }
    return 0.8; // 'nice-to-have'
  }

  /**
   * Calculate popularity score (with penalty for overly popular)
   */
  private calculatePopularityScore(repo: Repository): number {
    // Return 0 for repos with no stars - they should be filtered out if popularity matters
    if (repo.stars === 0) return 0;
    
    // Sweet spot: 100-10000 stars (not too niche, not too generic)
    if (repo.stars >= 100 && repo.stars <= 10000) return 1.0;
    if (repo.stars > 10000 && repo.stars <= 50000) return 0.7; // Slightly penalize very popular
    if (repo.stars > 50000) return 0.3; // Heavily penalize mega-popular
    if (repo.stars >= 50 && repo.stars < 100) return 0.8;
    if (repo.stars >= 10 && repo.stars < 50) return 0.5;
    // For 1-9 stars, give a very low score
    return 0.1;
  }

  /**
   * Calculate penalty for generic repos (preserves tutorial repos)
   */
  private calculateGenericPenalty(repo: Repository): number {
    const fullNameLower = repo.fullName.toLowerCase();
    const descLower = (repo.description || '').toLowerCase();
    const nameLower = repo.name.toLowerCase();
    const topics = (repo.topics || []).map(t => t.toLowerCase());
    
    // Tutorial/learning indicators - don't penalize these
    const tutorialIndicators = [
      'tutorial', 'tutorials', 'learn', 'learning', 'course', 'courses',
      'workshop', 'workshops', 'guide', 'guides', 'example', 'examples',
      'lesson', 'lessons', 'training', 'education', 'educational'
    ];
    
    const isTutorialRepo = tutorialIndicators.some(indicator => 
      nameLower.includes(indicator) ||
      descLower.includes(indicator) ||
      topics.some(topic => topic.includes(indicator))
    );
    
    // Don't penalize tutorial repos
    if (isTutorialRepo) {
      return 1.0;
    }
    
    // Check for generic patterns
    const genericIndicators = [
      fullNameLower.includes('freecodecamp'),
      fullNameLower.includes('vscode'),
      fullNameLower.includes('visual-studio-code'),
      fullNameLower.includes('facebook/') && repo.stars > 10000,
      fullNameLower.includes('microsoft/') && repo.stars > 10000,
      descLower.includes('curated list'),
      descLower.includes('awesome list') && repo.stars > 5000,
      repo.name.toLowerCase().startsWith('awesome-') && repo.stars > 10000,
    ];

    if (genericIndicators.some(ind => ind)) {
      return 0.1; // Heavy penalty
    }

    // Check for overly generic descriptions
    if (!repo.description || repo.description.length < 30) {
      return 0.5; // Penalty for short descriptions
    }

    // Check if description is too generic
    const genericWords = ['awesome', 'curated', 'list', 'collection', 'resources'];
    const genericWordCount = genericWords.filter(word => descLower.includes(word)).length;
    if (genericWordCount >= 3) {
      return 0.3; // Penalty for too many generic words
    }

    return 1.0; // No penalty
  }

  /**
   * Get content-based recommendations
   */
  async getContentBasedRecommendations(
    preferences: UserPreferences,
    limit = 50
  ): Promise<(Repository & { scores: RecommendationScores })[]> {
    try {
      // Build a more specific search query based on user preferences
      let searchQuery = '';
      const queryParts: string[] = [];

      // Add tech stack if available
      if (preferences.techStack && preferences.techStack.length > 0) {
        // Use language filter for tech stack
        const languages = preferences.techStack
          .filter(tech => ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin'].includes(tech))
          .map(tech => tech.toLowerCase());
        
        if (languages.length > 0) {
          queryParts.push(`language:${languages[0]}`); // Use first language
        }
      }

      // Add project type filters
      if (preferences.projectTypes && preferences.projectTypes.length > 0) {
        const typeKeywords: string[] = [];
        preferences.projectTypes.forEach(type => {
          switch(type) {
            case 'library':
              typeKeywords.push('library', 'package', 'module');
              break;
            case 'framework':
              typeKeywords.push('framework');
              break;
            case 'tool':
              typeKeywords.push('tool', 'cli', 'utility');
              break;
            case 'tutorial':
              // Enhanced keywords for tutorial repos
              typeKeywords.push('tutorial', 'learn', 'course', 'workshop', 'example', 'guide', 'lesson');
              break;
            case 'boilerplate':
              typeKeywords.push('boilerplate', 'starter', 'template');
              break;
          }
        });
        if (typeKeywords.length > 0) {
          // Use more keywords for tutorial type
          const uniqueKeywords = [...new Set(typeKeywords)];
          queryParts.push(uniqueKeywords.slice(0, 4).join(' '));
        }
      }

      // Add goal-based filters
      if (preferences.goals && preferences.goals.length > 0) {
        const goalKeywords: string[] = [];
        preferences.goals.forEach(goal => {
          switch(goal) {
            case 'learning':
              // Enhanced keywords for learning/tutorial repos
              goalKeywords.push('tutorial', 'learn', 'course', 'workshop', 'example', 'guide');
              break;
            case 'contributing':
              goalKeywords.push('open-source', 'contributing');
              break;
            case 'building':
              goalKeywords.push('starter', 'boilerplate', 'template');
              break;
          }
        });
        if (goalKeywords.length > 0) {
          // Use multiple keywords for better results
          const uniqueKeywords = [...new Set(goalKeywords)].slice(0, 3);
          queryParts.push(uniqueKeywords.join(' '));
        }
      }

      // Construct final query
      if (queryParts.length > 0) {
        searchQuery = queryParts.join(' ');
        
        // Add topic-based search for learning/tutorial goals (GitHub supports topic: qualifier)
        if (preferences.goals?.includes('learning') || preferences.goals?.includes('learning-new-tech') || preferences.projectTypes?.includes('tutorial')) {
          // Note: GitHub search doesn't support OR in topic, so we'll prioritize repos with tutorial topics in scoring
          // The keywords in queryParts already cover tutorial/learn/course/workshop
        }
        
        // Add minimum stars based on popularity preference
        const minStars = preferences.popularityWeight === 'high' ? 100 :
                        preferences.popularityWeight === 'medium' ? 50 : 10;
        searchQuery += ` stars:>${minStars} stars:<50000`;
      } else {
        // Fallback: use trending repos with recent activity, respect popularity preference
        const minStars = preferences.popularityWeight === 'high' ? 500 :
                        preferences.popularityWeight === 'medium' ? 100 : 10;
        searchQuery = `pushed:>2024-01-01 stars:>${minStars} stars:<10000`;
      }

      const repos = await githubService.searchRepos(searchQuery, {
        sort: 'stars',
        order: 'desc',
        // PERFORMANCE: 50 results is enough for scoring/diversity; larger pages cause 3–6s waits.
        perPage: 50,
        usePagination: false,
      });

      // Filter out overly generic/popular repos
      const filteredRepos = this.filterGenericRepos(repos);

      // Calculate scores and filter by minimum score
      const scored = filteredRepos
        .map(repo => ({
          ...repo,
          scores: {
            content: this.calculateContentScore(repo, preferences),
            collaborative: 0,
            session: 0,
            finalScore: 0,
          },
        }))
        .filter(repo => {
          // Minimum relevance threshold
          if (repo.scores.content <= 20) return false;
          
          // If popularity matters a lot, filter out repos with very few stars
          if (preferences.popularityWeight === 'high') {
            // Require at least 50 stars if popularity matters a lot
            if (repo.stars < 50) return false;
          } else if (preferences.popularityWeight === 'medium') {
            // Require at least 10 stars if popularity matters somewhat
            if (repo.stars < 10) return false;
          }
          // If popularity doesn't matter much, allow any stars
          
          return true;
        });

      return scored.slice(0, limit);
    } catch (error) {
      console.error('Error getting content-based recommendations:', error);
      return [];
    }
  }

  /**
   * Filter out overly generic/popular repos that aren't useful
   * But preserve tutorial/learning repos even if they might be generic
   */
  private filterGenericRepos(repos: Repository[]): Repository[] {
    // Blacklist of known generic repos (partial matches)
    const genericPatterns = [
      'freecodecamp',
      'free-code-camp',
      'vscode',
      'visual-studio-code',
      'facebook',
      'microsoft',
      'google',
      'apple',
      'github',
      'git',
      'awesome-',
      'awesome.',
      'awesome/',
      'curated',
      'list',
      'awesome list',
    ];

    // Tutorial/learning indicators
    const tutorialIndicators = [
      'tutorial', 'tutorials', 'learn', 'learning', 'course', 'courses',
      'workshop', 'workshops', 'guide', 'guides', 'example', 'examples',
      'lesson', 'lessons', 'training', 'education', 'educational'
    ];

    // Also filter repos that are too generic (very high stars but no specific purpose)
    return repos.filter(repo => {
      const fullNameLower = repo.fullName.toLowerCase();
      const descLower = (repo.description || '').toLowerCase();
      const nameLower = repo.name.toLowerCase();
      const topics = (repo.topics || []).map(t => t.toLowerCase());
      
      // Check if this is a tutorial/learning repo
      const isTutorialRepo = tutorialIndicators.some(indicator => 
        nameLower.includes(indicator) ||
        descLower.includes(indicator) ||
        topics.some(topic => topic.includes(indicator))
      );

      // Don't filter out tutorial repos even if they might be generic
      if (isTutorialRepo) {
        return true;
      }
      
      // Check against blacklist
      const isGeneric = genericPatterns.some(pattern => 
        fullNameLower.includes(pattern) || descLower.includes(pattern)
      );

      // Filter out repos that are just "awesome lists" or "curated lists"
      const isListRepo = descLower.includes('curated list') || 
                        descLower.includes('awesome list') ||
                        (repo.name.toLowerCase().startsWith('awesome-') && repo.stars > 10000);

      // Filter out mega-corporate repos that are too generic
      const isMegaCorp = repo.stars > 50000 && (
        fullNameLower.includes('microsoft/') ||
        fullNameLower.includes('facebook/') ||
        fullNameLower.includes('google/') ||
        fullNameLower.includes('apple/')
      );

      // Keep repos that have specific descriptions (not just "awesome" or "curated")
      const hasSpecificPurpose = repo.description && 
        repo.description.length > 50 &&
        !descLower.includes('curated') &&
        !descLower.includes('awesome list');

      return !isGeneric && !isListRepo && !isMegaCorp && hasSpecificPurpose;
    });
  }

  /**
   * Get collaborative filtering recommendations (user-based)
   * Uses Supabase to find similar users and their saved repos
   */
  async getCollaborativeRecommendations(
    userId: string,
    limit = 50
  ): Promise<(Repository & { scores: RecommendationScores })[]> {
    try {
      // Get current user's saved repos from Supabase
      const userSavedRepos = await supabaseService.getSavedRepositories(userId);
      const userSavedSet = new Set(userSavedRepos.map(r => r.id));

      if (userSavedSet.size === 0) {
        return []; // No data for collaborative filtering
      }

      // Find similar users using Supabase
      const similarUserIds = await supabaseService.getSimilarUsers(userId, 50);
      
      if (similarUserIds.length === 0) {
        return [];
      }

      // Get saved repos from similar users
      const candidateRepos = new Map<string, number>(); // repoId -> score
      
      for (const similarUserId of similarUserIds) {
        const similarUserSaved = await supabaseService.getSavedRepositories(similarUserId);
        
        // Calculate similarity (Jaccard similarity)
        const similarUserSavedSet = new Set(similarUserSaved.map(r => r.id));
        const intersection = Array.from(similarUserSavedSet).filter(id => userSavedSet.has(id)).length;
        const union = new Set([...Array.from(similarUserSavedSet), ...Array.from(userSavedSet)]).size;
        const similarity = union > 0 ? intersection / union : 0;

        if (similarity > 0.1) { // Only consider users with >10% similarity
          // Add repos saved by similar user (that current user hasn't saved)
          similarUserSaved.forEach(repo => {
            if (!userSavedSet.has(repo.id)) {
              const currentScore = candidateRepos.get(repo.id) || 0;
              candidateRepos.set(repo.id, currentScore + similarity);
            }
          });
        }
      }

      // Sort by score and get top repos
      const topRepoIds = Array.from(candidateRepos.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([repoId]) => repoId);

      // For now, return empty as we'd need to fetch full repo data from GitHub
      // In production, would fetch from cache or API
      return [];
    } catch (error) {
      console.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  /**
   * Get item-based collaborative recommendations
   */
  async getItemBasedRecommendations(
    savedRepos: Repository[],
    allRepos: Repository[],
    limit = 50
  ): Promise<(Repository & { scores: RecommendationScores })[]> {
    if (savedRepos.length === 0) return [];

    const savedIds = new Set(savedRepos.map(r => r.id));
    const candidateScores = new Map<string, number>();

    // For each saved repo, find similar repos
    savedRepos.forEach(savedRepo => {
      allRepos.forEach(repo => {
        if (savedIds.has(repo.id)) return; // Skip already saved

        const similarity = this.calculateRepoSimilarity(savedRepo, repo);
        const currentScore = candidateScores.get(repo.id) || 0;
        candidateScores.set(repo.id, Math.max(currentScore, similarity));
      });
    });

    return Array.from(candidateScores.entries())
      .map(([repoId, score]) => {
        const repo = allRepos.find(r => r.id === repoId);
        if (!repo) return null;
        return {
          ...repo,
          scores: {
            content: 0,
            collaborative: score * 100,
            session: 0,
            finalScore: 0,
          },
        };
      })
      .filter((r): r is Repository & { scores: RecommendationScores } => r !== null)
      .sort((a, b) => b.scores.collaborative - a.scores.collaborative)
      .slice(0, limit);
  }

  /**
   * Calculate similarity between two repos
   */
  private calculateRepoSimilarity(repo1: Repository, repo2: Repository): number {
    let score = 0;
    let maxScore = 0;

    // Language match
    if (repo1.language && repo2.language) {
      if (repo1.language === repo2.language) {
        score += 0.3;
      }
    }
    maxScore += 0.3;

    // Topics overlap
    const topics1 = new Set(repo1.topics || []);
    const topics2 = new Set(repo2.topics || []);
    const intersection = Array.from(topics1).filter(t => topics2.has(t)).length;
    const union = new Set([...topics1, ...topics2]).size;
    if (union > 0) {
      score += (intersection / union) * 0.4;
    }
    maxScore += 0.4;

    // Tags overlap
    const tags1 = new Set(repo1.tags);
    const tags2 = new Set(repo2.tags);
    const tagIntersection = Array.from(tags1).filter(t => tags2.has(t)).length;
    const tagUnion = new Set([...tags1, ...tags2]).size;
    if (tagUnion > 0) {
      score += (tagIntersection / tagUnion) * 0.3;
    }
    maxScore += 0.3;

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Get session-based recommendations
   */
  async getSessionBasedRecommendations(
    sessionHistory: UserInteraction[],
    allRepos: Repository[],
    limit = 50
  ): Promise<(Repository & { scores: RecommendationScores })[]> {
    const recentSaves = sessionHistory
      .filter(i => i.action === 'save')
      .slice(-5);

    const recentSkips = sessionHistory
      .filter(i => i.action === 'skip')
      .slice(-10);

    if (recentSaves.length === 0 && recentSkips.length === 0) {
      return [];
    }

    const savedIds = new Set(recentSaves.map(i => i.repoId));
    const skippedIds = new Set(recentSkips.map(i => i.repoId));

    // Extract preferred topics from saved repos
    const preferredTopics = new Set<string>();
    recentSaves.forEach(interaction => {
      const repo = allRepos.find(r => r.id === interaction.repoId);
      if (repo) {
        repo.topics?.forEach(t => preferredTopics.add(t));
        repo.tags.forEach(t => preferredTopics.add(t));
      }
    });

    // Extract avoided topics from skipped repos
    const avoidedTopics = new Set<string>();
    recentSkips.forEach(interaction => {
      const repo = allRepos.find(r => r.id === interaction.repoId);
      if (repo) {
        repo.topics?.forEach(t => avoidedTopics.add(t));
        repo.tags.forEach(t => avoidedTopics.add(t));
      }
    });

    // Score repos based on session preferences
    const scored = allRepos
      .filter(repo => !savedIds.has(repo.id) && !skippedIds.has(repo.id))
      .map(repo => {
        let sessionScore = 0;

        // Positive signals from preferred topics
        const preferredMatches = (repo.topics || []).filter(t => preferredTopics.has(t)).length +
                                 repo.tags.filter(t => preferredTopics.has(t)).length;
        sessionScore += preferredMatches * 0.5;

        // Negative signals from avoided topics
        const avoidedMatches = (repo.topics || []).filter(t => avoidedTopics.has(t)).length +
                               repo.tags.filter(t => avoidedTopics.has(t)).length;
        sessionScore -= avoidedMatches * 0.3;

        // Boost if similar to recently saved repos
        recentSaves.forEach(interaction => {
          const savedRepo = allRepos.find(r => r.id === interaction.repoId);
          if (savedRepo) {
            const similarity = this.calculateRepoSimilarity(savedRepo, repo);
            sessionScore += similarity * 0.2;
          }
        });

        return {
          ...repo,
          scores: {
            content: 0,
            collaborative: 0,
            session: Math.max(0, Math.min(100, sessionScore * 100)),
            finalScore: 0,
          },
        };
      })
      .filter(repo => repo.scores.session > 0)
      .sort((a, b) => b.scores.session - a.scores.session)
      .slice(0, limit);

    return scored;
  }

  /**
   * Get hybrid recommendations combining all methods
   */
  async getHybridRecommendations(
    userId: string,
    preferences: UserPreferences,
    sessionHistory: UserInteraction[],
    limit = 20
  ): Promise<Repository[]> {
    try {
      // Get candidates from each method
      const [contentBased, sessionBased] = await Promise.all([
        this.getContentBasedRecommendations(preferences, 50),
        this.getSessionBasedRecommendations(
          sessionHistory,
          await githubService.searchRepos('stars:>100', {
            sort: 'stars',
            order: 'desc',
            // PERFORMANCE: smaller page for background candidate pool
            perPage: 50,
            usePagination: false,
          }),
          50
        ),
      ]);

      // Combine and deduplicate
      const allCandidates = new Map<string, Repository & { scores: RecommendationScores }>();

      // Merge content-based
      contentBased.forEach(repo => {
        allCandidates.set(repo.id, repo);
      });

      // Merge session-based
      sessionBased.forEach(repo => {
        const existing = allCandidates.get(repo.id);
        if (existing) {
          existing.scores.session = repo.scores.session;
        } else {
          allCandidates.set(repo.id, repo);
        }
      });

      // Calculate final scores with weights
      const weights = {
        content: 0.5,
        collaborative: 0.2,
        session: 0.3,
      };

      const scored = Array.from(allCandidates.values()).map(repo => {
        const finalScore =
          repo.scores.content * weights.content +
          repo.scores.collaborative * weights.collaborative +
          repo.scores.session * weights.session;

        return {
          ...repo,
          scores: {
            ...repo.scores,
            finalScore,
          },
          fitScore: Math.round(finalScore),
        };
      });

      // Apply diversity filter
      const diverse = this.applyDiversityFilter(
        scored.sort((a, b) => b.scores.finalScore - a.scores.finalScore),
        limit
      );

      return diverse.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        tags: repo.tags,
        stars: repo.stars,
        forks: repo.forks,
        lastUpdated: repo.lastUpdated,
        fitScore: repo.fitScore,
        language: repo.language,
        url: repo.url,
        owner: repo.owner,
        license: repo.license,
        topics: repo.topics,
      }));
    } catch (error) {
      console.error('Error getting hybrid recommendations:', error);
      return [];
    }
  }

  /**
   * Apply diversity filter to prevent filter bubbles
   */
  private applyDiversityFilter(
    repos: (Repository & { scores: RecommendationScores })[],
    limit: number
  ): (Repository & { scores: RecommendationScores })[] {
    const selected: (Repository & { scores: RecommendationScores })[] = [];
    const usedLanguages = new Map<string, number>();
    const usedTopics = new Map<string, number>();

    for (const repo of repos) {
      // Max 2 repos per language in top 10
      const langCount = usedLanguages.get(repo.language || '') || 0;
      if (langCount >= 2 && selected.length < 10 && repo.language) {
        continue;
      }

      // Max 3 repos with same topic
      const topicOverlap = (repo.topics || []).filter(t => {
        const count = usedTopics.get(t) || 0;
        return count >= 3;
      }).length;

      if (topicOverlap > 0) {
        continue;
      }

      selected.push(repo);
      if (repo.language) {
        usedLanguages.set(repo.language, langCount + 1);
      }
      (repo.topics || []).forEach(t => {
        usedTopics.set(t, (usedTopics.get(t) || 0) + 1);
      });

      if (selected.length >= limit) break;
    }

    // Fill remaining slots if needed
    if (selected.length < limit) {
      const remaining = repos.filter(r => !selected.includes(r));
      selected.push(...remaining.slice(0, limit - selected.length));
    }

    return selected;
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

export const enhancedRecommendationService = new EnhancedRecommendationService();
