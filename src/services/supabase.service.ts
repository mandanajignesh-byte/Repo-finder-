/**
 * Supabase Service
 * Handles all database operations for user data, preferences, and interactions
 */

import { supabase } from '@/lib/supabase';
import { UserPreferences, Repository, UserInteraction } from '@/lib/types';

// Runtime flag: if Supabase user_preferences schema is incompatible (e.g. missing columns),
// we disable Supabase-backed preferences for the rest of the session to avoid repeated
// failing network calls and console noise.
let preferencesSupabaseEnabled = true;

// Helper to check if an error is due to a schema mismatch on user_preferences
const isPreferencesSchemaError = (error: any): boolean => {
  if (!error) return false;
  const message = typeof error.message === 'string' ? error.message : '';
  // PGRST204 = "Missing column" style errors from PostgREST
  return (
    error.code === 'PGRST204' ||
    message.includes("Could not find the 'interests' column") ||
    message.includes('in the schema cache')
  );
};

// Database table names
const TABLES = {
  users: 'users',
  user_preferences: 'user_preferences',
  saved_repos: 'saved_repos',
  liked_repos: 'liked_repos',
  user_interactions: 'user_interactions',
} as const;

// In-memory cache for seen repo IDs (5 minute TTL)
const seenRepoIdsCache = new Map<string, { ids: string[]; timestamp: number }>();
const SEEN_REPO_IDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for saved/liked repos (2 minute TTL)
const savedLikedCache = new Map<string, { saved: Repository[]; liked: Repository[]; timestamp: number }>();
const SAVED_LIKED_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

class SupabaseService {
  // PERF: Track whether we've already verified the user in Supabase this session
  private userVerified = false;
  private cachedUserId: string | null = null;

  /**
   * Get or create user ID
   * OPTIMIZED: Only hits Supabase once per session to verify user exists
   */
  async getOrCreateUserId(name?: string): Promise<string> {
    // Fast path: return cached userId if already verified
    if (this.cachedUserId && this.userVerified && !name) {
      return this.cachedUserId;
    }

    // Get user ID from localStorage or create one
    let userId = localStorage.getItem('user_id');
    
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('user_id', userId);
    }

    this.cachedUserId = userId;

    // Only verify/create in Supabase once per session (or when name is provided)
    if (!this.userVerified || name) {
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from(TABLES.users)
          .select('id, name')
          .eq('id', userId)
          .single();
        
        // If user doesn't exist, create it
        if (!existingUser || checkError?.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from(TABLES.users)
            .insert({
              id: userId,
              name: name || null,
              created_at: new Date().toISOString(),
            });
          
          if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating user:', insertError);
          }
        } else if (name && existingUser.name !== name) {
          // Update name if provided and different
          await supabase
            .from(TABLES.users)
            .update({ name, updated_at: new Date().toISOString() })
            .eq('id', userId);
        }
        
        this.userVerified = true;
      } catch (error) {
        console.error('Error ensuring user exists in Supabase:', error);
        // Still mark as verified to avoid retrying every call
        this.userVerified = true;
      }
    }
    
    return userId;
  }
  
  /**
   * Get user name
   */
  async getUserName(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.users)
        .select('name')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error getting user name:', error);
        return null;
      }
      
      return data?.name || null;
    } catch (error) {
      console.error('Error in getUserName:', error);
      return null;
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    // If we previously detected a schema problem, skip Supabase entirely
    if (!preferencesSupabaseEnabled) {
      return;
    }

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
        // If schema is incompatible, disable Supabase preferences for this session
        if (isPreferencesSchemaError(error)) {
          preferencesSupabaseEnabled = false;
          console.warn(
            '[Supabase] Disabling user_preferences sync for this session due to schema mismatch. Falling back to local storage only.',
          );
          return;
        }

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
    // If we already know Supabase schema is incompatible, skip the request
    if (!preferencesSupabaseEnabled) {
      return null;
    }

    try {
      // OPTIMIZATION: Add Accept header to prevent 406 errors
      const { data, error } = await supabase
        .from(TABLES.user_preferences)
        .select('primary_cluster, secondary_clusters, tech_stack, interests, experience_level, goals, project_types, activity_preference, popularity_weight, documentation_importance, license_preference, repo_size, onboarding_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Error getting preferences:', error);
        // Disable future Supabase preference calls on schema mismatch
        if (isPreferencesSchemaError(error)) {
          preferencesSupabaseEnabled = false;
          console.warn(
            '[Supabase] Disabling user_preferences sync for this session due to schema mismatch. Falling back to local storage only.',
          );
        }
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
      } else {
        // Invalidate caches after save
        this.invalidateSeenRepoIdsCache(userId);
        savedLikedCache.delete(userId);
      }
    } catch (error) {
      console.error('Error in saveRepository:', error);
    }
  }

  /**
   * Get saved repositories
   * CRITICAL OPTIMIZATION: Uses in-memory cache (2 min TTL) to prevent redundant calls
   */
  async getSavedRepositories(userId: string): Promise<Repository[]> {
    try {
      // Check cache first
      const cached = savedLikedCache.get(userId);
      if (cached && Date.now() - cached.timestamp < SAVED_LIKED_CACHE_TTL) {
        return cached.saved;
      }

      const { data, error } = await supabase
        .from(TABLES.saved_repos)
        .select('repo_id, repo_name, repo_full_name, repo_description, repo_stars, repo_language, repo_url, repo_tags, repo_topics, saved_at')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error getting saved repos:', error);
        return [];
      }

      const repos = (data || []).map((row) => ({
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

      // Update cache
      const existingCache = savedLikedCache.get(userId) || { saved: [], liked: [], timestamp: 0 };
      savedLikedCache.set(userId, { ...existingCache, saved: repos, timestamp: Date.now() });

      return repos;
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
      } else {
        // Invalidate caches after like
        this.invalidateSeenRepoIdsCache(userId);
        savedLikedCache.delete(userId);
      }
    } catch (error) {
      console.error('Error in likeRepository:', error);
    }
  }

  /**
   * Get liked repositories
   * CRITICAL OPTIMIZATION: Uses in-memory cache (2 min TTL) to prevent redundant calls
   */
  async getLikedRepositories(userId: string): Promise<Repository[]> {
    try {
      // Check cache first
      const cached = savedLikedCache.get(userId);
      if (cached && Date.now() - cached.timestamp < SAVED_LIKED_CACHE_TTL) {
        return cached.liked;
      }

      const { data, error } = await supabase
        .from(TABLES.liked_repos)
        .select('repo_id, repo_name, repo_full_name, repo_description, repo_stars, repo_language, repo_url, repo_tags, repo_topics, liked_at')
        .eq('user_id', userId)
        .order('liked_at', { ascending: false });

      if (error) {
        console.error('Error getting liked repos:', error);
        return [];
      }

      const repos = (data || []).map((row) => ({
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

      // Update cache
      const existingCache = savedLikedCache.get(userId) || { saved: [], liked: [], timestamp: 0 };
      savedLikedCache.set(userId, { ...existingCache, liked: repos, timestamp: Date.now() });

      return repos;
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
      } else {
        // Invalidate seen repo IDs cache after interaction (for view/skip actions)
        if (interaction.action === 'view' || interaction.action === 'skip') {
          this.invalidateSeenRepoIdsCache(userId);
        }
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
        .select('repo_id, action, created_at, session_id, time_spent, context')
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
   * 
   * CRITICAL OPTIMIZATION: Uses in-memory cache (5 min TTL) to prevent redundant Supabase calls
   */
  async getAllSeenRepoIds(userId: string): Promise<string[]> {
    try {
      // Check cache first
      const cached = seenRepoIdsCache.get(userId);
      if (cached && Date.now() - cached.timestamp < SEEN_REPO_IDS_CACHE_TTL) {
        return cached.ids;
      }

      // OPTIMIZATION: Run all queries in parallel instead of sequentially for 3x faster loading
      const [interactionsResult, savedResult, likedResult] = await Promise.all([
        supabase
        .from(TABLES.user_interactions)
        .select('repo_id')
        .eq('user_id', userId)
          .in('action', ['save', 'like', 'skip', 'view']),
        supabase
          .from(TABLES.saved_repos)
          .select('repo_id')
          .eq('user_id', userId),
        supabase
          .from(TABLES.liked_repos)
        .select('repo_id')
          .eq('user_id', userId),
      ]);

      // Log errors if any (but don't block)
      if (interactionsResult.error) {
        console.error('Error getting seen repo IDs from interactions:', interactionsResult.error);
      }
      if (savedResult.error) {
        console.error('Error getting seen repo IDs from saved:', savedResult.error);
      }
      if (likedResult.error) {
        console.error('Error getting seen repo IDs from liked:', likedResult.error);
      }

      // Combine all repo IDs and deduplicate
      // NOTE: This is filtered by user_id, so each user has their own exclusion list
      const allIds = new Set<string>();
      (interactionsResult.data || []).forEach((row: any) => allIds.add(row.repo_id));
      (savedResult.data || []).forEach((row: any) => allIds.add(row.repo_id));
      (likedResult.data || []).forEach((row: any) => allIds.add(row.repo_id));

      const idsArray = Array.from(allIds);
      
      // Cache the result
      seenRepoIdsCache.set(userId, { ids: idsArray, timestamp: Date.now() });

      // Only log if there are seen repos (reduces console noise)
      if (allIds.size > 0) {
        console.log(`📊 User ${userId} has seen ${allIds.size} repos (cached for 5 min)`);
      }
      return idsArray;
    } catch (error) {
      console.error('Error getting all seen repo IDs:', error);
      return [];
    }
  }

  /**
   * Invalidate cache for seen repo IDs (call after user interactions)
   */
  invalidateSeenRepoIdsCache(userId: string): void {
    seenRepoIdsCache.delete(userId);
  }

  /**
   * Get interactions for collaborative filtering
   */
  async getInteractionsForCollaborativeFiltering(repoId: string): Promise<UserInteraction[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.user_interactions)
        .select('repo_id, action, created_at, session_id, time_spent, context')
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
        .select('repos')
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
      // Import formatTimeAgo dynamically to avoid circular dependencies
      const { formatTimeAgo } = await import('@/utils/date.utils');
      
      return (data.repos as any[]).map((repo: any) => {
        // Recalculate lastUpdated from pushed_at if available (more accurate than updated_at)
        let lastUpdated = repo.lastUpdated || '';
        if (repo.pushed_at) {
          lastUpdated = formatTimeAgo(repo.pushed_at);
        }
        
        return {
          id: repo.id,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description || '',
          tags: repo.tags || [],
          stars: repo.stars || 0,
          forks: repo.forks || 0,
          lastUpdated,
          language: repo.language,
          url: repo.url,
          owner: repo.owner || {
            login: repo.fullName?.split('/')[0] || '',
            avatarUrl: '',
          },
          license: repo.license,
          topics: repo.topics || [],
          fitScore: repo.fitScore,
        };
      });
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

  /**
   * Get trending repos from database
   */
  async getTrendingRepos(options?: {
    timeRange?: 'daily' | 'weekly' | 'monthly';
    language?: string;
    excludeWellKnown?: boolean;
    limit?: number;
  }): Promise<any[]> {
    try {
      const timeRange = options?.timeRange || 'daily';
      const language = options?.language;
      const excludeWellKnown = options?.excludeWellKnown !== false; // Default to true
      const limit = options?.limit || 100;

      // Calculate date key
      const today = new Date();
      let dateKey: string;
      
      if (timeRange === 'daily') {
        dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (timeRange === 'weekly') {
        const weekNumber = this.getWeekNumber(today);
        dateKey = `${today.getFullYear()}-W${weekNumber}`;
      } else {
        dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      }

      // Build query
      let query = supabase
        .from('trending_repos')
        .select('*')
        .eq('time_range', timeRange)
        .eq('date_key', dateKey)
        .eq('exclude_well_known', excludeWellKnown)
        .order('rank', { ascending: true })
        .limit(limit);

      if (language) {
        query = query.eq('language', language);
      } else {
        query = query.is('language', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching trending repos from database:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTrendingRepos:', error);
      return [];
    }
  }

  /**
   * Helper: Get week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Track PWA install/open
   * Records when a user opens the app as an installed PWA (standalone mode)
   */
  async trackPWAInstall(deviceInfo?: Record<string, any>): Promise<void> {
    try {
      const userId = await this.getOrCreateUserId();

      // Extract device type and location from deviceInfo for dedicated columns
      const deviceType = deviceInfo?.deviceType || null;
      const location = deviceInfo?.location || {};
      const country = location?.country || null;
      const city = location?.city || null;

      const { error } = await supabase
        .from('pwa_installs')
        .upsert(
          {
            user_id: userId,
            device_info: deviceInfo || {},
            device_type: deviceType,
            country: country,
            city: city,
            last_opened_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error tracking PWA install:', error);
      }
    } catch (error) {
      console.error('Error in trackPWAInstall:', error);
    }
  }
}

export const supabaseService = new SupabaseService();
