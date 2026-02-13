/**
 * Calculate and populate repo scores for all repos in repo_clusters
 * 
 * Calculates:
 * - popularity_score (12% weight)
 * - activity_score (10% weight)
 * - freshness_score (5% weight)
 * - quality_score_new (5% weight)
 * - trending_score (15% weight) - will be updated daily
 * - base_score (combined precomputed score)
 * 
 * Usage: npx tsx scripts/calculate-repo-scores.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

interface RepoCluster {
  id: string;
  repo_id: string;
  cluster_name: string;
  repo_data: any;
  popularity_score?: number;
  activity_score?: number;
  freshness_score?: number;
  quality_score_new?: number;
  trending_score?: number;
  base_score?: number;
}

/**
 * Calculate popularity score (0-100)
 * Uses log scale to prevent huge repos from dominating
 */
function calculatePopularityScore(repo: any): number {
  const stars = repo.stars || repo.stargazers_count || 0;
  const forks = repo.forks || repo.forks_count || 0;
  
  // Log scale: log10(stars + 1) * 20, capped at 100
  const starsScore = Math.min(100, Math.log10(stars + 1) * 20);
  
  // Forks contribute less: log10(forks + 1) * 10, capped at 50
  const forksScore = Math.min(50, Math.log10(forks + 1) * 10);
  
  // Combined: 70% stars, 30% forks
  return Math.round(starsScore * 0.7 + forksScore * 0.3);
}

/**
 * Calculate activity score (0-100)
 * Based on last commit date and activity indicators
 */
function calculateActivityScore(repo: any): number {
  // Get last commit date (pushed_at is more accurate than updated_at)
  const lastCommitStr = repo.pushed_at || repo.updated_at || repo.lastUpdated;
  
  if (!lastCommitStr) {
    return 0; // No activity data
  }

  let lastCommitDate: Date;
  
  try {
    // Handle ISO date strings
    if (lastCommitStr.includes('T') || lastCommitStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      lastCommitDate = new Date(lastCommitStr);
    } else {
      // If it's a formatted string like "2mo ago", estimate conservatively
      return 50; // Medium activity
    }

    if (isNaN(lastCommitDate.getTime())) {
      return 50;
    }
  } catch (error) {
    return 50;
  }

  const now = new Date();
  const daysSinceCommit = (now.getTime() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);

  // Score based on recency:
  // - Last 7 days: 100
  // - Last 30 days: 90
  // - Last 90 days: 70
  // - Last 180 days: 50
  // - Last 365 days: 30
  // - Older: 10
  if (daysSinceCommit <= 7) return 100;
  if (daysSinceCommit <= 30) return 90;
  if (daysSinceCommit <= 90) return 70;
  if (daysSinceCommit <= 180) return 50;
  if (daysSinceCommit <= 365) return 30;
  return 10;
}

/**
 * Calculate freshness score (0-100)
 * Boosts newer repos, decays older ones
 */
function calculateFreshnessScore(repo: any): number {
  // Get repo creation date from repo data
  const createdAtStr = repo.created_at;
  
  if (!createdAtStr) {
    return 50; // Default if no creation date
  }

  let createdAt: Date;
  
  try {
    createdAt = new Date(createdAtStr);
    if (isNaN(createdAt.getTime())) {
      return 50;
    }
  } catch (error) {
    return 50;
  }

  const now = new Date();
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Boost newer repos:
  // - Last 30 days: 100
  // - Last 90 days: 90
  // - Last 180 days: 70
  // - Last 365 days: 50
  // - Last 2 years: 30
  // - Older: 10
  if (daysSinceCreation <= 30) return 100;
  if (daysSinceCreation <= 90) return 90;
  if (daysSinceCreation <= 180) return 70;
  if (daysSinceCreation <= 365) return 50;
  if (daysSinceCreation <= 730) return 30;
  return 10;
}

/**
 * Calculate quality score (0-100)
 * Based on repo completeness indicators
 */
function calculateQualityScore(repo: any): number {
  let score = 0;
  let maxScore = 0;

  // Description (20 points)
  const description = repo.description || '';
  if (description.length >= 50) score += 20;
  else if (description.length >= 20) score += 15;
  else if (description.length >= 10) score += 10;
  maxScore += 20;

  // Topics (20 points)
  const topics = repo.topics || [];
  if (topics.length >= 5) score += 20;
  else if (topics.length >= 3) score += 15;
  else if (topics.length >= 1) score += 10;
  maxScore += 20;

  // License (15 points)
  if (repo.license) score += 15;
  maxScore += 15;

  // README indicator (from description/tags) (15 points)
  const fullText = `${description} ${(repo.tags || []).join(' ')}`.toLowerCase();
  if (fullText.includes('readme') || repo.has_readme) score += 15;
  maxScore += 15;

  // Documentation indicators (15 points)
  if (fullText.includes('documentation') || fullText.includes('docs') || fullText.includes('wiki')) {
    score += 15;
  }
  maxScore += 15;

  // Tests indicator (10 points)
  if (fullText.includes('test') || fullText.includes('testing') || fullText.includes('ci')) {
    score += 10;
  }
  maxScore += 10;

  // Demo/live link (5 points)
  if (fullText.includes('demo') || fullText.includes('live') || fullText.includes('example')) {
    score += 5;
  }
  maxScore += 5;

  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate trending score (0-100)
 * Based on recent growth (stars/forks in last 7 days)
 * This will be updated daily via cron job
 * For now, use a placeholder based on current popularity
 */
function calculateTrendingScore(repo: any): number {
  // Placeholder: Use popularity as proxy until we have daily growth data
  // In production, this should be updated daily with actual growth metrics
  const popularity = calculatePopularityScore(repo);
  
  // Boost repos that are popular AND recent
  const activity = calculateActivityScore(repo);
  
  // Trending = combination of popularity and recent activity
  return Math.round((popularity * 0.6 + activity * 0.4));
}

/**
 * Calculate base score (combined precomputed score)
 * base_score = popularity * 0.12 + activity * 0.10 + freshness * 0.05 + quality * 0.05
 */
function calculateBaseScore(
  popularity: number,
  activity: number,
  freshness: number,
  quality: number
): number {
  return Math.round(
    popularity * 0.12 +
    activity * 0.10 +
    freshness * 0.05 +
    quality * 0.05
  );
}

async function calculateAllScores() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  console.log('🚀 Starting score calculation for all repos...\n');

  // Fetch all repos in batches
  let totalProcessed = 0;
  let totalUpdated = 0;
  const batchSize = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: repos, error: fetchError } = await supabaseClient
      .from('repo_clusters')
      .select('id, repo_id, cluster_name, repo_data')
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      console.error('❌ Error fetching repos:', fetchError);
      break;
    }

    if (!repos || repos.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`📦 Processing batch ${Math.floor(offset / batchSize) + 1} (${repos.length} repos)...`);

    const updates = repos.map((repo: RepoCluster) => {
      const repoData = repo.repo_data || {};
      
      // Calculate all scores using repo_data
      const popularity = calculatePopularityScore(repoData);
      const activity = calculateActivityScore(repoData);
      const freshness = calculateFreshnessScore(repoData);
      const quality = calculateQualityScore(repoData);
      const trending = calculateTrendingScore(repoData);
      const baseScore = calculateBaseScore(popularity, activity, freshness, quality);

      return {
        id: repo.id,
        popularity_score: popularity,
        activity_score: activity,
        freshness_score: freshness,
        quality_score_new: quality,
        trending_score: trending,
        base_score: baseScore,
      };
    });

    // Update in batches
    for (const update of updates) {
      const { error: updateError } = await supabaseClient
        .from('repo_clusters')
        .update({
          popularity_score: update.popularity_score,
          activity_score: update.activity_score,
          freshness_score: update.freshness_score,
          quality_score_new: update.quality_score_new,
          trending_score: update.trending_score,
          base_score: update.base_score,
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`  ❌ Error updating repo ${update.id}:`, updateError.message);
      } else {
        totalUpdated++;
      }
    }

    totalProcessed += repos.length;
    offset += batchSize;

    // Progress update
    if (totalProcessed % 500 === 0) {
      console.log(`  ✅ Processed ${totalProcessed} repos, updated ${totalUpdated}\n`);
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Final Summary:');
  console.log(`  Total repos processed: ${totalProcessed}`);
  console.log(`  Successfully updated: ${totalUpdated}`);
  console.log(`  Failed: ${totalProcessed - totalUpdated}`);
  console.log('\n✅ Score calculation complete!');
}

// Run calculation
calculateAllScores().catch(console.error);
