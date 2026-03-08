/**
 * Supabase Service - RepoVerse Recommendation System
 * Handles authentication, seen repo tracking, preferences, and like/save operations
 */

import { supabase } from '@/lib/supabase';
import type { Repo, UserPreferences } from '@/types/recommendation';

class SupabaseService {
  // In-memory deduplication store - NEVER reset during a session
  private seenSet: Set<number> = new Set();

  /**
   * Get or create user ID
   * Checks Supabase auth first, falls back to anonymous ID in localStorage
   */
  async getOrCreateUserId(): Promise<string> {
    // Try authenticated user first
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return user.id;
    }

    // Fall back to anonymous ID
    let anonId = localStorage.getItem('anon_id');
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('anon_id', anonId);
    }
    
    return anonId;
  }

  /**
   * Get all repo IDs this user has seen/interacted with
   * Merges database results with in-memory Set
   */
  async getAllSeenRepoIds(userId: string): Promise<number[]> {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('repo_id')
        .eq('user_id', userId)
        .in('action', ['view', 'like', 'skip', 'save']);

      if (error) {
        console.error('Error fetching seen repo IDs:', error);
        return Array.from(this.seenSet);
      }

      // Add all DB results to in-memory Set
      if (data) {
        data.forEach((row: any) => {
          if (row.repo_id) {
            this.seenSet.add(Number(row.repo_id));
          }
        });
      }

      return Array.from(this.seenSet);
    } catch (error) {
      console.error('Error in getAllSeenRepoIds:', error);
      return Array.from(this.seenSet);
    }
  }

  /**
   * Mark a repo as seen immediately (synchronous, no DB call)
   * Called before tracking to prevent showing same repo twice
   */
  markSeen(repoId: number): void {
    this.seenSet.add(repoId);
  }

  /**
   * Get the in-memory seen Set
   */
  getSeenSet(): Set<number> {
    return this.seenSet;
  }

  /**
   * Get user preferences from database
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('user_id, primary_cluster, tech_stack, goals, onboarding_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user hasn't completed onboarding
          return null;
        }
        console.error('Error getting preferences:', error);
        return null;
      }

      if (!data) return null;

      return {
        user_id: data.user_id,
        primary_cluster: data.primary_cluster,
        tech_stack: data.tech_stack || [],
        goals: data.goals || [],
        onboarding_completed: data.onboarding_completed || false,
      };
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return null;
    }
  }

  /**
   * Like a repository
   */
  async likeRepository(userId: string, repo: Repo): Promise<void> {
    try {
      const { error } = await supabase
        .from('liked_repos')
        .upsert({
          user_id: userId,
          repo_id: repo.id,
          repo_name: repo.name,
          repo_full_name: repo.full_name,
          repo_description: repo.description,
          repo_stars: repo.stars,
          repo_language: repo.language,
          repo_url: repo.url,
          repo_tags: repo.tags,
          repo_topics: repo.topics,
          liked_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,repo_id',
        });

      if (error) {
        console.error('Error liking repository:', error);
      }
    } catch (error) {
      console.error('Error in likeRepository:', error);
    }
  }

  /**
   * Save a repository
   */
  async saveRepository(userId: string, repo: Repo): Promise<void> {
    try {
      const { error } = await supabase
        .from('saved_repos')
        .upsert({
          user_id: userId,
          repo_id: repo.id,
          repo_name: repo.name,
          repo_full_name: repo.full_name,
          repo_description: repo.description,
          repo_stars: repo.stars,
          repo_language: repo.language,
          repo_url: repo.url,
          repo_tags: repo.tags,
          repo_topics: repo.topics,
          saved_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,repo_id',
        });

      if (error) {
        console.error('Error saving repository:', error);
      }
    } catch (error) {
      console.error('Error in saveRepository:', error);
    }
  }

  /**
   * Get saved repositories (backward compatibility)
   */
  async getSavedRepositories(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('saved_repos')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error getting saved repos:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.repo_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
        description: row.repo_description || '',
        stars: row.repo_stars || 0,
        forks: 0,
        language: row.repo_language,
        url: row.repo_url,
        tags: row.repo_tags || [],
        topics: row.repo_topics || [],
        lastUpdated: '',
        owner: {
          login: row.repo_full_name?.split('/')[0] || '',
          avatarUrl: '',
        },
      }));
    } catch (error) {
      console.error('Error in getSavedRepositories:', error);
      return [];
    }
  }

  /**
   * Get liked repositories (backward compatibility)
   */
  async getLikedRepositories(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('liked_repos')
        .select('*')
        .eq('user_id', userId)
        .order('liked_at', { ascending: false });

      if (error) {
        console.error('Error getting liked repos:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.repo_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
        description: row.repo_description || '',
        stars: row.repo_stars || 0,
        forks: 0,
        language: row.repo_language,
        url: row.repo_url,
        tags: row.repo_tags || [],
        topics: row.repo_topics || [],
        lastUpdated: '',
        owner: {
          login: row.repo_full_name?.split('/')[0] || '',
          avatarUrl: '',
        },
      }));
    } catch (error) {
      console.error('Error in getLikedRepositories:', error);
      return [];
    }
  }

  /**
   * Save user preferences (backward compatibility)
   */
  async saveUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          primary_cluster: preferences.primaryCluster || null,
          tech_stack: preferences.techStack || [],
          goals: preferences.goals || [],
          onboarding_completed: preferences.onboardingCompleted || false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving preferences:', error);
      }
    } catch (error) {
      console.error('Error in saveUserPreferences:', error);
    }
  }

  /**
   * Track interaction (backward compatibility)
   */
  async trackInteraction(userId: string, interaction: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_interactions')
        .insert({
          user_id: userId,
          repo_id: interaction.repoId,
          action: interaction.action,
          timestamp: interaction.timestamp?.toISOString() || new Date().toISOString(),
          metadata: interaction.metadata || {},
        });

      if (error) {
        console.error('Error tracking interaction:', error);
      }
    } catch (error) {
      console.error('Error in trackInteraction:', error);
    }
  }

  /**
   * Remove skip interaction (for undo)
   */
  async removeSkipInteraction(userId: string, repoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_interactions')
        .delete()
        .eq('user_id', userId)
        .eq('repo_id', repoId)
        .eq('action', 'skip');

      if (error) {
        console.error('Error removing skip interaction:', error);
      }
    } catch (error) {
      console.error('Error in removeSkipInteraction:', error);
    }
  }
}

export const supabaseService = new SupabaseService();
