/**
 * Interaction Service - RepoVerse Recommendation System
 * Tracks user interactions and updates tag affinity + repo scores
 */

import { supabase } from '@/lib/supabase';
import type { Repo, RepoAction } from '@/types/recommendation';
import { supabaseService } from './supabase.service';

class InteractionService {
  /**
   * Track a user interaction with a repo
   * This is the core method that:
   * 1. Marks repo as seen (instant, prevents duplicates)
   * 2. Writes interaction to DB (fire-and-forget)
   * 3. Updates tag affinity for like/skip (fire-and-forget)
   * 4. Updates global repo score for like/skip (fire-and-forget)
   */
  async track(
    repo: Repo,
    action: RepoAction,
    userId: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    // ═══ STEP A: Mark seen IMMEDIATELY (synchronous) ═══
    supabaseService.markSeen(repo.id);

    // ═══ STEP B: Write interaction row (fire-and-forget) ═══
    supabase
      .from('user_interactions')
      .insert({
        user_id: userId,
        repo_id: repo.id,
        action,
        timestamp: new Date().toISOString(),
        metadata: meta ?? {},
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error tracking interaction:', error);
        }
      });

    // ═══ STEP C: Update tag affinity for like/skip ═══
    if ((action === 'like' || action === 'skip') && repo.tags.length > 0) {
      supabase
        .rpc('update_tag_affinity', {
          p_user_id: userId,
          p_tags: repo.tags,
          p_action: action,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error updating tag affinity:', error);
          }
        });
    }

    // ═══ STEP D: Update global repo score ═══
    if (action === 'like' || action === 'skip') {
      this.updateRepoScore(repo.id, action).catch(() => {});
    }
  }

  /**
   * Update global repo score (like rate and weighted score)
   * Called after every like or skip
   */
  private async updateRepoScore(
    repoId: number,
    action: 'like' | 'skip'
  ): Promise<void> {
    try {
      // Fetch current score
      const { data: existing, error: fetchError } = await supabase
        .from('repo_scores')
        .select('total_likes, total_skips')
        .eq('repo_id', repoId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching repo score:', fetchError);
        return;
      }

      // Compute new totals
      const likes = (existing?.total_likes ?? 0) + (action === 'like' ? 1 : 0);
      const skips = (existing?.total_skips ?? 0) + (action === 'skip' ? 1 : 0);
      const total = likes + skips;
      const likeRate = total > 0 ? likes / total : 0.5;

      // Upsert new score
      const { error: upsertError } = await supabase
        .from('repo_scores')
        .upsert({
          repo_id: repoId,
          total_likes: likes,
          total_skips: skips,
          like_rate: likeRate,
          weighted_score: likeRate * 100,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'repo_id',
        });

      if (upsertError) {
        console.error('Error upserting repo score:', upsertError);
      }
    } catch (error) {
      console.error('Error in updateRepoScore:', error);
    }
  }
}

export const interactionService = new InteractionService();
