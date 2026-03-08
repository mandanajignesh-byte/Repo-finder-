/**
 * Recommendation Engine - RepoVerse Recommendation System
 * The brain of the recommendation system
 * Handles batch loading, retry logic, preloading, and swipe handling
 */

import { supabaseService } from './supabase.service';
import { clusterService } from './cluster.service';
import { interactionService } from './interaction.service';
import type { Repo, BatchOptions, RetryConfig } from '@/types/recommendation';

// ─── RETRY CONFIGS (progressively widen star range) ─────────────────
const RETRY_CONFIGS: Array<RetryConfig | null> = [
  { minStars: 100, maxStars: 30_000 },   // attempt 0 — tight (quality repos)
  { minStars: 50, maxStars: 80_000 },    // attempt 1 — wider
  { minStars: 10, maxStars: 150_000 },   // attempt 2 — widest
  null,                                   // attempt 3 — random cluster fallback
];

const BATCH_SIZE = 10;
const PRELOAD_THRESHOLD = 5; // Start preloading when cards < 5

// ─── RECOMMENDATION ENGINE CLASS ─────────────────────────────────────

class RecommendationEngine {
  private loading = false;
  private userId: string | null = null;
  private primaryCluster: string | null = null;

  /**
   * Initialize the engine - get user ID and preferences
   */
  async init(): Promise<void> {
    try {
      // Get user ID
      this.userId = await supabaseService.getOrCreateUserId();
      console.log('🔐 User ID:', this.userId);

      // Get preferences
      const preferences = await supabaseService.getUserPreferences(this.userId);
      if (preferences?.primary_cluster) {
        this.primaryCluster = preferences.primary_cluster;
        console.log('🎯 Primary cluster:', this.primaryCluster);
      } else {
        console.log('ℹ️ No primary cluster set (onboarding not completed)');
      }
    } catch (error) {
      console.error('Error initializing recommendation engine:', error);
    }
  }

  /**
   * Load a batch of repos
   * Implements retry logic with progressive star range widening
   */
  async loadBatch(opts: BatchOptions): Promise<Repo[]> {
    // Prevent duplicate fetches
    if (this.loading) {
      console.log('⚠️ Already loading, skipping duplicate fetch');
      return [];
    }

    this.loading = true;

    try {
      // ═══ A. Ensure userId is ready ═══
      if (!this.userId) {
        await this.init();
      }

      if (!this.userId) {
        console.error('❌ Failed to get user ID');
        return [];
      }

      // ═══ B. Get exclude IDs ═══
      const seenIds = await supabaseService.getAllSeenRepoIds(this.userId);
      const seenSet = supabaseService.getSeenSet();
      console.log(`📊 Excluding ${seenIds.length} seen repos (attempt ${opts.attempt})`);

      // ═══ C. Determine cluster ═══
      let cluster = this.primaryCluster;
      const retryConfig = RETRY_CONFIGS[opts.attempt];

      // If no primary cluster or last attempt, use random cluster
      if (!cluster || retryConfig === null) {
        cluster = await clusterService.getRandomCluster();
        console.log(`🎲 Using random cluster: ${cluster}`);
      } else {
        console.log(`🎯 Using primary cluster: ${cluster}`);
      }

      if (!cluster) {
        console.error('❌ No cluster available');
        return [];
      }

      // ═══ D. Call getScoredRepos ═══
      const config = retryConfig ?? RETRY_CONFIGS[2]!;
      console.log(`🔍 Fetching repos (stars: ${config.minStars}-${config.maxStars})`);

      const raw = await clusterService.getScoredRepos({
        userId: this.userId,
        cluster,
        excludeIds: seenIds,
        limit: BATCH_SIZE * 3, // Fetch 3x for better dedup
        minStars: config.minStars,
        maxStars: config.maxStars,
      });

      console.log(`📦 Received ${raw.length} repos from database`);

      // ═══ E. Client-side dedup using in-memory Set ═══
      const fresh = raw
        .filter(r => !seenSet.has(r.id))
        .slice(0, BATCH_SIZE);

      console.log(`✅ ${fresh.length} fresh repos after dedup`);

      // ═══ F. Retry if empty and attempts remaining ═══
      if (fresh.length === 0 && opts.attempt < 3) {
        console.log(`🔄 No fresh repos, retrying with attempt ${opts.attempt + 1}`);
        return this.loadBatch({
          append: opts.append,
          attempt: opts.attempt + 1,
        });
      }

      // ═══ G. Track views for all fresh repos (fire-and-forget) ═══
      fresh.forEach(r => {
        interactionService
          .track(r, 'view', this.userId!, {
            source: 'discover',
            attempt: opts.attempt,
          })
          .catch(() => {});
      });

      // ═══ H. Return fresh repos ═══
      return fresh;
    } catch (error) {
      console.error('Error loading batch:', error);
      return [];
    } finally {
      this.loading = false;
    }
  }

  /**
   * Handle swipe action (left = skip, right = like)
   */
  async handleSwipe(repo: Repo, direction: 'left' | 'right'): Promise<void> {
    if (!this.userId) {
      await this.init();
    }

    if (!this.userId) {
      console.error('❌ Cannot handle swipe: no user ID');
      return;
    }

    const action = direction === 'right' ? 'like' : 'skip';
    console.log(`${action === 'like' ? '❤️' : '👎'} ${action.toUpperCase()}: ${repo.name}`);

    // Track the interaction
    await interactionService.track(repo, action, this.userId, {
      source: 'discover',
    });

    // If liked, also add to liked_repos table
    if (action === 'like') {
      await supabaseService.likeRepository(this.userId, repo);
    }
  }

  /**
   * Handle save/bookmark action
   */
  async handleSave(repo: Repo): Promise<void> {
    if (!this.userId) {
      await this.init();
    }

    if (!this.userId) {
      console.error('❌ Cannot handle save: no user ID');
      return;
    }

    console.log(`🔖 SAVE: ${repo.name}`);

    // Track the interaction
    await interactionService.track(repo, 'save', this.userId, {
      source: 'discover',
    });

    // Add to saved_repos table
    await supabaseService.saveRepository(this.userId, repo);
  }

  /**
   * Check if we need to preload more repos
   */
  needsPreload(cardCount: number): boolean {
    return cardCount < PRELOAD_THRESHOLD;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }
}

export const recommendationEngine = new RecommendationEngine();
