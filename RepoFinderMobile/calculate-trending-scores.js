/**
 * Calculate and Store Trending Scores for Underrated Gems
 * 
 * This script:
 * 1. Calculates star velocity (stars gained in last 24h/7 days)
 * 2. Calculates commit velocity
 * 3. Computes trending scores
 * 4. Stores in repo_trending_scores table
 * 5. Only includes repos that are in repo_gems (underrated)
 * 
 * Usage:
 *   node calculate-trending-scores.js --period=daily
 *   node calculate-trending-scores.js --period=weekly
 *   node calculate-trending-scores.js --period=both
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Get period from command line
const periodArg = process.argv.find(arg => arg.startsWith('--period='));
const period = periodArg ? periodArg.split('=')[1] : 'both'; // daily, weekly, or both

function getDateKey(periodType) {
  const now = new Date();
  if (periodType === 'daily') {
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (periodType === 'weekly') {
    // Get start of week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }
  return null;
}

function calculateTrendingScore(starVelocity, commitVelocity, healthScore, freshnessScore) {
  // Trending score formula:
  // - Star velocity: 50% weight
  // - Commit velocity: 20% weight
  // - Health score: 20% weight
  // - Freshness score: 10% weight
  
  const normalizedStarVel = Math.min(starVelocity / 100, 1.0); // Normalize to 0-1 (100 stars/day = max)
  const normalizedCommitVel = Math.min(commitVelocity / 10, 1.0); // Normalize to 0-1 (10 commits/day = max)
  
  return (
    normalizedStarVel * 0.5 +
    normalizedCommitVel * 0.2 +
    (healthScore || 0.5) * 0.2 +
    (freshnessScore || 0.5) * 0.1
  );
}

async function calculateTrendingForPeriod(periodType) {
  console.log(`\n📊 Calculating ${periodType} trending scores...\n`);
  
  const periodDate = getDateKey(periodType);
  const daysBack = periodType === 'daily' ? 1 : 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  console.log(`  Period: ${periodType}`);
  console.log(`  Date: ${periodDate}`);
  console.log(`  Looking back: ${daysBack} day(s)\n`);
  
  // Get all gems (underrated repos)
  const { data: gems, error: gemsError } = await supabase
    .from('repo_gems')
    .select('repo_id');
  
  if (gemsError) {
    console.error('❌ Error fetching gems:', gemsError);
    return;
  }
  
  if (!gems || gems.length === 0) {
    console.log('⚠️  No gems found. Run enrichment first to detect gems.');
    return;
  }
  
  console.log(`  Found ${gems.length} underrated gems to analyze\n`);
  
  const gemIds = gems.map(g => g.repo_id);
  const batchSize = 100;
  let processed = 0;
  const trendingScores = [];
  
  // Process gems in batches
  for (let i = 0; i < gemIds.length; i += batchSize) {
    const batch = gemIds.slice(i, i + batchSize);
    
    // Get repo data with activity and health
    const { data: repos, error: reposError } = await supabase
      .from('repos_master')
      .select(`
        repo_id,
        stars,
        updated_at,
        pushed_at,
        repo_activity (
          commits_30_days,
          commits_90_days,
          freshness_score,
          activity_score
        ),
        repo_health (
          health_score
        )
      `)
      .in('repo_id', batch);
    
    if (reposError) {
      console.error(`  ❌ Error fetching repos batch ${i / batchSize + 1}:`, reposError);
      continue;
    }
    
    for (const repo of repos || []) {
      // Calculate trending metrics from existing data
      const activity = repo.repo_activity?.[0];
      const health = repo.repo_health?.[0];
      
      // Use activity score and freshness as proxy for trending
      // Repos with high activity + freshness are likely gaining stars
      const activityScore = activity?.activity_score || 0;
      const freshnessScore = activity?.freshness_score || 0;
      
      // Estimate star velocity: combine activity and freshness
      // Active + fresh repos are more likely to be trending
      const estimatedStarVelocity = (activityScore * 0.6 + freshnessScore * 0.4) * 100; // Scale to stars/day
      
      // Commit velocity from activity data
      const commitVelocity = periodType === 'daily' 
        ? (activity?.commits_30_days || 0) / 30 
        : (activity?.commits_90_days || 0) / 90;
      
      const trendingScore = calculateTrendingScore(
        estimatedStarVelocity,
        commitVelocity,
        health?.health_score,
        activity?.freshness_score
      );
      
      if (trendingScore > 0) {
        trendingScores.push({
          repo_id: repo.repo_id,
          period_type: periodType,
          period_date: periodDate,
          star_velocity: estimatedStarVelocity,
          commit_velocity: commitVelocity,
          trending_score: trendingScore
        });
      }
      
      processed++;
      if (processed % 50 === 0) {
        process.stdout.write(`  Processed: ${processed}/${gemIds.length}\r`);
      }
    }
  }
  
  console.log(`\n  ✅ Processed ${processed} repos`);
  console.log(`  📊 Found ${trendingScores.length} repos with trending activity\n`);
  
  // Sort by trending score and assign ranks
  trendingScores.sort((a, b) => b.trending_score - a.trending_score);
  trendingScores.forEach((score, index) => {
    score.rank = index + 1;
  });
  
  // Store in database
  console.log(`  💾 Storing trending scores...`);
  const { error: insertError } = await supabase
    .from('repo_trending_scores')
    .upsert(trendingScores, { 
      onConflict: 'repo_id,period_type,period_date',
      ignoreDuplicates: false
    });
  
  if (insertError) {
    console.error('  ❌ Error storing trending scores:', insertError);
  } else {
    console.log(`  ✅ Stored ${trendingScores.length} trending scores for ${periodType} period\n`);
  }
  
  return trendingScores.length;
}

async function main() {
  console.log('🚀 Trending Scores Calculator\n');
  console.log('='.repeat(60));
  
  let dailyCount = 0;
  let weeklyCount = 0;
  
  if (period === 'daily' || period === 'both') {
    dailyCount = await calculateTrendingForPeriod('daily');
  }
  
  if (period === 'weekly' || period === 'both') {
    weeklyCount = await calculateTrendingForPeriod('weekly');
  }
  
  console.log('='.repeat(60));
  console.log('🎉 Trending Scores Calculation Complete!\n');
  console.log(`📊 Summary:`);
  if (period === 'daily' || period === 'both') {
    console.log(`  Daily: ${dailyCount} repos`);
  }
  if (period === 'weekly' || period === 'both') {
    console.log(`  Weekly: ${weeklyCount} repos`);
  }
  console.log('\n💡 Use get_trending_underrated_gems() function to query trending gems by category');
}

main().catch(console.error);
