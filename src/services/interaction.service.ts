/**
 * Interaction Tracking Service
 * Tracks user interactions (save/skip/view) for recommendation system
 * Syncs with Supabase for persistent storage and better recommendations
 */

import { UserInteraction, Repository } from '@/lib/types';
import { supabaseService } from './supabase.service';

const STORAGE_KEY = 'github_repo_app_interactions';
const SESSION_KEY = 'github_repo_app_session_id';

class InteractionService {
  private sessionId: string;

  constructor() {
    // Get or create session ID
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    this.sessionId = sessionId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Track a user interaction
   */
  async trackInteraction(
    repo: Repository,
    action: UserInteraction['action'],
    context?: UserInteraction['context'],
    timeSpent?: number
  ): Promise<void> {
    const interaction: UserInteraction = {
      repoId: repo.id,
      action,
      timestamp: new Date(),
      sessionId: this.sessionId,
      timeSpent,
      context: context || {
        position: 0,
        source: 'discover',
      },
    };

    // Save to localStorage immediately (for offline support)
    const existing = this.getInteractions();
    existing.push(interaction);
    const recent = existing.slice(-1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));

    // Sync to Supabase in background (non-blocking)
    // IMPORTANT: This tracks the interaction for THIS USER ONLY
    // Other users can still see this repo - deduplication is user-specific
    try {
      const userId = await supabaseService.getOrCreateUserId();
      await supabaseService.trackInteraction(userId, interaction);
      console.log(`✅ Tracked ${action} for repo ${repo.id} for user ${userId} (user-specific)`);
      
      // Also save/like repo if action is save/like
      if (action === 'save') {
        await supabaseService.saveRepository(userId, repo);
      } else if (action === 'like') {
        await supabaseService.likeRepository(userId, repo);
      }
    } catch (error) {
      console.error('Error syncing interaction to Supabase:', error);
      // Continue without Supabase - localStorage is the fallback
    }
  }

  /**
   * Get all interactions
   */
  getInteractions(): UserInteraction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp),
      }));
    } catch (error) {
      console.error('Error loading interactions:', error);
      return [];
    }
  }

  /**
   * Get interactions for current session
   */
  getSessionInteractions(): UserInteraction[] {
    return this.getInteractions().filter(i => i.sessionId === this.sessionId);
  }

  /**
   * Get saved repos
   */
  getSavedRepos(): string[] {
    return this.getInteractions()
      .filter(i => i.action === 'save')
      .map(i => i.repoId);
  }

  /**
   * Get liked repos
   */
  getLikedRepos(): string[] {
    return this.getInteractions()
      .filter(i => i.action === 'like')
      .map(i => i.repoId);
  }

  /**
   * Get skipped repos
   */
  getSkippedRepos(): string[] {
    return this.getInteractions()
      .filter(i => i.action === 'skip')
      .map(i => i.repoId);
  }

  /**
   * Check if repo was saved
   */
  isSaved(repoId: string): boolean {
    return this.getSavedRepos().includes(repoId);
  }

  /**
   * Check if repo was liked
   */
  isLiked(repoId: string): boolean {
    return this.getLikedRepos().includes(repoId);
  }

  /**
   * Check if repo was skipped
   */
  isSkipped(repoId: string): boolean {
    return this.getSkippedRepos().includes(repoId);
  }

  /**
   * Get interaction statistics
   */
  getStats() {
    const interactions = this.getInteractions();
    const sessionInteractions = this.getSessionInteractions();
    
    return {
      total: interactions.length,
      saved: interactions.filter(i => i.action === 'save').length,
      liked: interactions.filter(i => i.action === 'like').length,
      skipped: interactions.filter(i => i.action === 'skip').length,
      sessionTotal: sessionInteractions.length,
      sessionSaved: sessionInteractions.filter(i => i.action === 'save').length,
      sessionLiked: sessionInteractions.filter(i => i.action === 'like').length,
      sessionSkipped: sessionInteractions.filter(i => i.action === 'skip').length,
    };
  }

  /**
   * Extract topics from saved repos
   */
  getPreferredTopics(): string[] {
    // This would need repo data - for now return empty
    // Will be enhanced when we have access to repo data
    return [];
  }

  /**
   * Extract languages from saved repos
   */
  getPreferredLanguages(): string[] {
    // This would need repo data - for now return empty
    return [];
  }

  /**
   * Clear all interactions (for testing/debugging)
   */
  clearInteractions(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const interactionService = new InteractionService();
