import { supabase } from '@/lib/supabase';

export interface VoteCounts {
  upvotes: number;
  downvotes: number;
  netScore: number;
}

export interface TrendingComment {
  id: string;
  repoFullName: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
}

export interface UserInfo {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
}

class TrendingCommunityService {
  async getCurrentUserInfo(): Promise<UserInfo> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta = user.user_metadata ?? {};
      return {
        userId: user.id,
        displayName: meta.full_name ?? meta.name ?? meta.user_name ?? 'GitHub User',
        avatarUrl: meta.avatar_url,
        isAuthenticated: true,
      };
    }
    let anonId = localStorage.getItem('anon_id');
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('anon_id', anonId);
    }
    return { userId: anonId, displayName: 'Anonymous', isAuthenticated: false };
  }

  async getVoteCounts(repoFullNames: string[]): Promise<Map<string, VoteCounts>> {
    if (repoFullNames.length === 0) return new Map();
    const { data } = await supabase
      .from('trending_votes')
      .select('repo_full_name, vote')
      .in('repo_full_name', repoFullNames);

    const map = new Map<string, VoteCounts>();
    repoFullNames.forEach(n => map.set(n, { upvotes: 0, downvotes: 0, netScore: 0 }));
    (data ?? []).forEach((row: any) => {
      const c = map.get(row.repo_full_name);
      if (!c) return;
      if (row.vote === 1) c.upvotes++;
      else c.downvotes++;
      c.netScore = c.upvotes - c.downvotes;
    });
    return map;
  }

  async getUserVotes(userId: string, repoFullNames: string[]): Promise<Map<string, 1 | -1>> {
    if (!userId || repoFullNames.length === 0) return new Map();
    const { data } = await supabase
      .from('trending_votes')
      .select('repo_full_name, vote')
      .eq('user_id', userId)
      .in('repo_full_name', repoFullNames);

    const map = new Map<string, 1 | -1>();
    (data ?? []).forEach((row: any) => map.set(row.repo_full_name, row.vote as 1 | -1));
    return map;
  }

  async getCommentCounts(repoFullNames: string[]): Promise<Map<string, number>> {
    if (repoFullNames.length === 0) return new Map();
    const { data } = await supabase
      .from('trending_comments')
      .select('repo_full_name')
      .in('repo_full_name', repoFullNames)
      .eq('is_deleted', false);

    const map = new Map<string, number>();
    (data ?? []).forEach((row: any) => {
      map.set(row.repo_full_name, (map.get(row.repo_full_name) ?? 0) + 1);
    });
    return map;
  }

  async castVote(userId: string, repoFullName: string, vote: 1 | -1): Promise<void> {
    const { data: existing } = await supabase
      .from('trending_votes')
      .select('vote')
      .eq('user_id', userId)
      .eq('repo_full_name', repoFullName)
      .maybeSingle();

    if (!existing) {
      await supabase.from('trending_votes').insert({ user_id: userId, repo_full_name: repoFullName, vote });
    } else if (existing.vote === vote) {
      await supabase.from('trending_votes').delete()
        .eq('user_id', userId).eq('repo_full_name', repoFullName);
    } else {
      await supabase.from('trending_votes').update({ vote })
        .eq('user_id', userId).eq('repo_full_name', repoFullName);
    }
  }

  async getComments(repoFullName: string): Promise<TrendingComment[]> {
    const { data } = await supabase
      .from('trending_comments')
      .select('*')
      .eq('repo_full_name', repoFullName)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    return (data ?? []).map((row: any) => ({
      id: row.id,
      repoFullName: row.repo_full_name,
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  async addComment(
    userId: string,
    repoFullName: string,
    displayName: string,
    avatarUrl: string | undefined,
    content: string,
  ): Promise<TrendingComment> {
    const { data, error } = await supabase
      .from('trending_comments')
      .insert({
        repo_full_name: repoFullName,
        user_id: userId,
        display_name: displayName,
        avatar_url: avatarUrl ?? null,
        content: content.trim(),
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to post comment');
    return {
      id: data.id,
      repoFullName: data.repo_full_name,
      userId: data.user_id,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      content: data.content,
      createdAt: data.created_at,
    };
  }

  async submitRepo(userId: string, displayName: string, repoUrl: string): Promise<void> {
    const match = repoUrl.match(/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i);
    const { error } = await supabase.from('trending_submissions').insert({
      repo_url: repoUrl.trim(),
      repo_full_name: match ? match[1] : null,
      submitted_by: userId,
      submitter_display_name: displayName,
    });
    if (error) {
      if (error.code === '23505') throw new Error('This repo has already been submitted.');
      throw new Error(error.message);
    }
  }
}

export const trendingCommunityService = new TrendingCommunityService();
