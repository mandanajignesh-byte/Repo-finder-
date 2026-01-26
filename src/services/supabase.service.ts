/**
 * Supabase Service
 * Handles all database operations for user data, preferences, and interactions
 */

import { supabase } from '@/lib/supabase';
import { UserPreferences, Repository, UserInteraction } from '@/lib/types';

// Database table names
const TABLES = {
  users: 'users',
  user_preferences: 'user_preferences',
  saved_repos: 'saved_repos',
  liked_repos: 'liked_repos',
  user_interactions: 'user_interactions',
} as const;

class SupabaseService {
  /**
   * Get or create user ID
   */
  async getOrCreateUserId(): Promise<string> {
    // Get user ID from localStorage or create one
    let userId = localStorage.getItem('user_id');
    
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('user_id', userId);
    }
    
    // Always ensure user exists in Supabase (even if userId was in localStorage)
    // This fixes the foreign key constraint error
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from(TABLES.users)
        .select('id')
        .eq('id', userId)
        .single();
      
      // If user doesn't exist, create it
      if (!existingUser || checkError?.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from(TABLES.users)
          .insert({
            id: userId,
            created_at: new Date().toISOString(),
          });
        
        if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
          console.error('Error creating user:', insertError);
          // Don't throw - continue with userId even if creation fails
        } else {
          console.log('✅ User created/verified in Supabase:', userId);
        }
      }
    } catch (error) {
      console.error('Error ensuring user exists in Supabase:', error);
      // Don't throw - continue with userId even if check fails
    }
    
    return userId;
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.user_preferences)
        .upsert({
          user_id: userId,
          primary_cluster: preferences.primaryCluster || null,
          secondary_clusters: preferences.secondaryClusters || [],
          tech_stack: preferences.techStack || [],
          interests: preferences.interests || [],
          goals: preferences.goals || [],
          project_types: preferences.projectTypes || [],
          experience_level: preferences.experienceLevel || 'intermediate',
          activity_preference: preferences.activityPreference || 'any',
          popularity_weight: preferences.popularityWeight || 'medium',
          documentation_importance: preferences.documentationImportance || 'important',
          license_preference: preferences.licensePreference || ['any'],
          repo_size: preferences.repoSize || ['any'],
          onboarding_completed: preferences.onboardingCompleted || false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving preferences:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveUserPreferences:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.user_preferences)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Error getting preferences:', error);
        return null;
      }

      if (!data) return null;

      return {
        primaryCluster: data.primary_cluster || undefined,
        secondaryClusters: data.secondary_clusters || [],
        techStack: data.tech_stack || [],
        interests: data.interests || [],
        experienceLevel: data.experience_level || 'intermediate',
        goals: data.goals || [],
        projectTypes: data.project_types || [],
        activityPreference: data.activity_preference || 'any',
        popularityWeight: data.popularity_weight || 'medium',
        documentationImportance: data.documentation_importance || 'important',
        licensePreference: data.license_preference || ['any'],
        repoSize: data.repo_size || ['any'],
        onboardingCompleted: data.onboarding_completed || false,
      };
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return null;
    }
  }

  /**
   * Save a repository (saved repos)
   */
  async saveRepository(userId: string, repo: Repository): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.saved_repos)
        .insert({
          user_id: userId,
          repo_id: repo.id,
          repo_name: repo.name,
          repo_full_name: repo.fullName,
          repo_description: repo.description,
          repo_stars: repo.stars,
          repo_language: repo.language,
          repo_url: repo.url,
          repo_tags: repo.tags,
          repo_topics: repo.topics || [],
          saved_at: new Date().toISOString(),
        });

      if (error) {
        // Ignore duplicate key errors (repo already saved)
        if (error.code !== '23505') {
          console.error('Error saving repo:', error);
        }
      }
    } catch (error) {
      console.error('Error in saveRepository:', error);
    }
  }

  /**
   * Get saved repositories
   */
  async getSavedRepositories(userId: string): Promise<Repository[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.saved_repos)
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error getting saved repos:', error);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.repo_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
        description: row.repo_description || '',
        tags: row.repo_tags || [],
        stars: row.repo_stars || 0,
        forks: 0, // Not stored
        lastUpdated: '', // Not stored
        language: row.repo_language || undefined,
        url: row.repo_url,
        topics: row.repo_topics || [],
        owner: {
          login: row.repo_full_name.split('/')[0] || '',
          avatarUrl: '',
        },
      }));
    } catch (error) {
      console.error('Error in getSavedRepositories:', error);
      return [];
    }
  }

  /**
   * Remove a saved repository
   */
  async removeSavedRepository(userId: string, repoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.saved_repos)
        .delete()
        .eq('user_id', userId)
        .eq('repo_id', repoId);

      if (error) {
        console.error('Error removing saved repo:', error);
        throw error;
      }
      console.log(`✅ Removed repo ${repoId} from saved repos for user ${userId}`);
    } catch (error) {
      console.error('Error in removeSavedRepository:', error);
      throw error;
    }
  }

  /**
   * Like a repository
   */
  async likeRepository(userId: string, repo: Repository): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.liked_repos)
        .insert({
          user_id: userId,
          repo_id: repo.id,
          repo_name: repo.name,
          repo_full_name: repo.fullName,
          repo_description: repo.description,
          repo_stars: repo.stars,
          repo_language: repo.language,
          repo_url: repo.url,
          repo_tags: repo.tags,
          repo_topics: repo.topics || [],
          liked_at: new Date().toISOString(),
        });

      if (error) {
        // Ignore duplicate key errors
        if (error.code !== '23505') {
          console.error('Error liking repo:', error);
        }
      }
    } catch (error) {
      console.error('Error in likeRepository:', error);
    }
  }

  /**
   * Get liked repositories
   */
  async getLikedRepositories(userId: string): Promise<Repository[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.liked_repos)
        .select('*')
        .eq('user_id', userId)
        .order('liked_at', { ascending: false });

      if (error) {
        console.error('Error getting liked repos:', error);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.repo_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
        description: row.repo_description || '',
        tags: row.repo_tags || [],
        stars: row.repo_stars || 0,
        forks: 0,
        lastUpdated: '',
        language: row.repo_language || undefined,
        url: row.repo_url,
        topics: row.repo_topics || [],
        owner: {
          login: row.repo_full_name.split('/')[0] || '',
          avatarUrl: '',
        },
      }));
    } catch (error) {
      console.error('Error in getLikedRepositories:', error);
      return [];
    }
  }

  /**
   * Track user interaction
   */
  async trackInteraction(userId: string, interaction: UserInteraction): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.user_interactions)
        .insert({
          user_id: userId,
          repo_id: interaction.repoId,
          action: interaction.action,
          session_id: interaction.sessionId,
          time_spent: interaction.timeSpent,
          context: interaction.context || {},
          created_at: interaction.timestamp.toISOString(),
        });

      if (error) {
        console.error('Error tracking interaction:', error);
      }
    } catch (error) {
      console.error('Error in trackInteraction:', error);
    }
  }

  /**
   * Get user interactions for recommendations
   */
  async getUserInteractions(userId: string, limit = 1000): Promise<UserInteraction[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.user_interactions)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting interactions:', error);
        return [];
      }

      return (data || []).map((row) => ({
        repoId: row.repo_id,
        action: row.action,
        timestamp: new Date(row.created_at),
        sessionId: row.session_id,
        timeSpent: row.time_spent,
        context: row.context || {},
      }));
    } catch (error) {
      console.error('Error in getUserInteractions:', error);
      return [];
    }
  }

  /**
   * Get ALL repos a user has ever seen/interacted with
   * This includes: saved, liked, skipped, viewed
   * Used to prevent showing same repos to the same user
   * 
   * IMPORTANT: This is USER-SPECIFIC - repos viewed by one user
   * can still be recommended to other users. Each user has their
   * own exclusion list.
   */
  async getAllSeenRepoIds(userId: string): Promise<string[]> {
    try {
      // Get all interactions (save, like, skip, view)
      const { data: interactions, error: interactionsError } = await supabase
        .from(TABLES.user_interactions)
        .select('repo_id')
        .eq('user_id', userId)
        .in('action', ['save', 'like', 'skip', 'view']);

      if (interactionsError) {
        console.error('Error getting seen repo IDs from interactions:', interactionsError);
      }

      // Get saved repos
      const { data: saved, error: savedError } = await supabase
        .from(TABLES.saved_repos)
        .select('repo_id')
        .eq('user_id', userId);

      if (savedError) {
        console.error('Error getting seen repo IDs from saved:', savedError);
      }

      // Get liked repos
      const { data: liked, error: likedError } = await supabase
        .from(TABLES.liked_repos)
        .select('repo_id')
        .eq('user_id', userId);

      if (likedError) {
        console.error('Error getting seen repo IDs from liked:', likedError);
      }

      // Combine all repo IDs and deduplicate
      // NOTE: This is filtered by user_id, so each user has their own exclusion list
      const allIds = new Set<string>();
      (interactions || []).forEach((row: any) => allIds.add(row.repo_id));
      (saved || []).forEach((row: any) => allIds.add(row.repo_id));
      (liked || []).forEach((row: any) => allIds.add(row.repo_id));

      console.log(`📊 User ${userId} has seen ${allIds.size} repos (user-specific exclusion list)`);
      return Array.from(allIds);
    } catch (error) {
      console.error('Error getting all seen repo IDs:', error);
      return [];
    }
  }

  /**
   * Get interactions for collaborative filtering
   */
  async getInteractionsForCollaborativeFiltering(repoId: string): Promise<UserInteraction[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.user_interactions)
        .select('*')
        .eq('repo_id', repoId)
        .eq('action', 'save') // Only use saves for collaborative filtering
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error getting interactions for CF:', error);
        return [];
      }

      return (data || []).map((row) => ({
        repoId: row.repo_id,
        action: row.action,
        timestamp: new Date(row.created_at),
        sessionId: row.session_id,
        timeSpent: row.time_spent,
        context: row.context || {},
      }));
    } catch (error) {
      console.error('Error in getInteractionsForCollaborativeFiltering:', error);
      return [];
    }
  }

  /**
   * Save repository pool for a user
   */
  async saveRepoPool(userId: string, repos: Repository[], preferencesHash: string): Promise<void> {
    try {
      // Filter out any undefined/null repos before processing
      const validRepos = repos.filter(repo => repo && repo.id);
      
      if (validRepos.length === 0) {
        console.warn('⚠️ No valid repos to save to Supabase');
        return;
      }
      
      const { error } = await supabase
        .from('repo_pools')
        .upsert({
          user_id: userId,
          repos: validRepos.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            tags: repo.tags,
            stars: repo.stars,
            forks: repo.forks,
            lastUpdated: repo.lastUpdated,
            language: repo.language,
            url: repo.url,
            owner: repo.owner,
            license: repo.license,
            topics: repo.topics,
            fitScore: repo.fitScore,
          })),
          preferences_hash: preferencesHash,
          pool_size: validRepos.length,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving repo pool:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveRepoPool:', error);
      throw error;
    }
  }

  /**
   * Get repository pool for a user
   */
  async getRepoPool(userId: string): Promise<Repository[] | null> {
    try {
      const { data, error } = await supabase
        .from('repo_pools')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Error getting repo pool:', error);
        return null;
      }

      if (!data || !data.repos) return null;

      // Convert JSONB back to Repository objects
      return (data.repos as any[]).map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description || '',
        tags: repo.tags || [],
        stars: repo.stars || 0,
        forks: repo.forks || 0,
        lastUpdated: repo.lastUpdated || '',
        language: repo.language,
        url: repo.url,
        owner: repo.owner || {
          login: repo.fullName?.split('/')[0] || '',
          avatarUrl: '',
        },
        license: repo.license,
        topics: repo.topics || [],
        fitScore: repo.fitScore,
      }));
    } catch (error) {
      console.error('Error in getRepoPool:', error);
      return null;
    }
  }

  /**
   * Get users with similar preferences (for collaborative filtering)
   */
  async getSimilarUsers(userId: string, limit = 50): Promise<string[]> {
    try {
      // Get current user's preferences
      const userPrefs = await this.getUserPreferences(userId);
      if (!userPrefs || !userPrefs.techStack || userPrefs.techStack.length === 0) {
        return [];
      }

      // Find users with overlapping tech stack
      const { data, error } = await supabase
        .from(TABLES.user_preferences)
        .select('user_id, tech_stack')
        .neq('user_id', userId)
        .not('tech_stack', 'is', null);

      if (error) {
        console.error('Error getting similar users:', error);
        return [];
      }

      // Filter users with similar tech stack
      const similarUserIds = (data || [])
        .filter((pref) => {
          const userTechStack = pref.tech_stack || [];
          return userTechStack.some((tech: string) => userPrefs.techStack.includes(tech));
        })
        .map((pref) => pref.user_id)
        .slice(0, limit);

      return similarUserIds;
    } catch (error) {
      console.error('Error in getSimilarUsers:', error);
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
