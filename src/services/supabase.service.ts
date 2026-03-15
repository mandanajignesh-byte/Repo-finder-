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
        .maybeSingle();

      if (error) {
        console.error('Error getting preferences:', error);
        return null;
      }

      if (!data) return null;

      return {
        primaryCluster: data.primary_cluster,
        techStack: data.tech_stack || [],
        goals: data.goals || [],
        interests: data.interests || [],
        experienceLevel: data.experience_level || 'intermediate',
        onboardingCompleted: data.onboarding_completed || false,
      } as any;
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

  // ─── Subscription management ────────────────────────────────────────────────

  /**
   * Save a PayPal subscription to the database.
   * Called immediately after PayPal onApprove fires.
   */
  async saveSubscription(subscriptionId: string, planId: string, email?: string): Promise<void> {
    try {
      const userId = await this.getOrCreateUserId();
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          subscription_id: subscriptionId,
          status: 'active',
          plan_id: planId,
          email: email ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'subscription_id' });

      if (error) {
        console.error('Error saving subscription:', error);
      } else {
        // Mirror to localStorage so isProUser() works synchronously
        localStorage.setItem('subscription_status', 'active');
        localStorage.setItem('paypal_subscription_id', subscriptionId);
        console.log('✅ Subscription saved to DB:', subscriptionId);
      }
    } catch (err) {
      console.error('Error in saveSubscription:', err);
    }
  }

  /**
   * Check if the current user has an active subscription in the DB.
   * Checks by user_id first, then falls back to cached email (new device restore).
   * Syncs the result to localStorage so isProUser() stays accurate.
   * Call this once on app startup.
   */
  async syncSubscriptionStatus(): Promise<boolean> {
    try {
      const userId = await this.getOrCreateUserId();

      // 1. Check by user_id (fast path — same device / already linked)
      const { data: byId, error: idError } = await supabase
        .from('user_subscriptions')
        .select('status, subscription_id, email')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!idError && byId) {
        localStorage.setItem('subscription_status', 'active');
        localStorage.setItem('paypal_subscription_id', byId.subscription_id);
        if (byId.email) localStorage.setItem('pro_email', byId.email);
        return true;
      }

      // 2. Fallback: check by email cached from a previous device
      const cachedEmail = localStorage.getItem('pro_email');
      if (cachedEmail) {
        const { data: byEmail, error: emailError } = await supabase
          .from('user_subscriptions')
          .select('status, subscription_id')
          .eq('email', cachedEmail.toLowerCase())
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (!emailError && byEmail) {
          // Link this device's user_id to the subscription for faster future lookups
          await supabase
            .from('user_subscriptions')
            .update({ user_id: userId })
            .eq('subscription_id', byEmail.subscription_id);

          localStorage.setItem('subscription_status', 'active');
          localStorage.setItem('paypal_subscription_id', byEmail.subscription_id);
          return true;
        }
      }

      // 3. No active subscription found — clear stale state
      localStorage.removeItem('subscription_status');
      localStorage.removeItem('paypal_subscription_id');
      return false;
    } catch (err) {
      console.error('Error in syncSubscriptionStatus:', err);
      return localStorage.getItem('subscription_status') === 'active';
    }
  }

  /**
   * Manually restore Pro access by email on a new device.
   * Returns true if an active subscription was found for that email.
   */
  async restoreSubscriptionByEmail(email: string): Promise<boolean> {
    try {
      const trimmed = email.trim().toLowerCase();
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('status, subscription_id')
        .eq('email', trimmed)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error || !data) return false;

      // Link this device and set Pro status
      const userId = await this.getOrCreateUserId();
      await supabase
        .from('user_subscriptions')
        .update({ user_id: userId })
        .eq('subscription_id', data.subscription_id);

      localStorage.setItem('pro_email', trimmed);
      localStorage.setItem('subscription_status', 'active');
      localStorage.setItem('paypal_subscription_id', data.subscription_id);
      return true;
    } catch (err) {
      console.error('Error in restoreSubscriptionByEmail:', err);
      return false;
    }
  }
  /**
   * Fetch trending repos from trending_repos_v2 table.
   * Always returns the most recent batch for the given period.
   */
  async getTrendingRepos(options?: {
    timeRange?: 'daily' | 'weekly' | 'monthly';
    language?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const period = options?.timeRange === 'weekly' ? 'weekly' : 'daily';
      const limit  = options?.limit || 100;

      // Find the most recent date we have data for this period
      const { data: latest } = await supabase
        .from('trending_repos_v2')
        .select('date')
        .eq('period', period)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (!latest) return [];

      const latestDate = latest.date;

      let query = supabase
        .from('trending_repos_v2')
        .select('*')
        .eq('period', period)
        .eq('date', latestDate)
        .order('total_score', { ascending: false })
        .limit(limit);

      if (options?.language) {
        query = query.ilike('language', options.language);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) return [];

      console.log(`✅ Loaded ${data.length} trending repos from DB (${period}, ${latestDate})`);

      // Map to the shape github.service.ts expects
      return data.map((row: any) => ({
        repo_id:               String(row.github_id),
        repo_name:             row.repo,
        repo_full_name:        row.name,
        repo_description:      row.description || '',
        repo_tags:             Array.isArray(row.topics) ? row.topics : [],
        repo_stars:            row.stars   || 0,
        repo_forks:            row.forks   || 0,
        repo_updated_at:       row.github_pushed_at || '',
        repo_pushed_at:        row.github_pushed_at || '',
        repo_language:         row.language || null,
        repo_url:              row.url,
        repo_owner_login:      row.owner   || '',
        repo_owner_avatar_url: `https://github.com/${row.owner}.png`,
        repo_topics:           Array.isArray(row.topics) ? row.topics : [],
        trending_score:        row.total_score || 0,
        rank:                  0,
        health_grade:          row.health_grade  || null,
        health_status:         row.health_status || null,
        category:              row.category      || null,
        stars_last_24_hours:   row.stars_today        || row.stars_last_24_hours || 0,
        stars_last_7_days:     row.stars_this_week    || row.stars_last_7_days   || 0,
      }));
    } catch (err) {
      console.error('getTrendingRepos error:', err);
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
