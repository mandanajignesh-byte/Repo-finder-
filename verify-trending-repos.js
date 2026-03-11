/**
 * Verify Trending Repos Update
 * 
 * This script verifies that the GitHub Actions workflow successfully
 * updated the trending_repos table in Supabase.
 * 
 * Usage:
 *   node verify-trending-repos.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyTrendingRepos() {
  console.log('🔍 Verifying Trending Repos Update');
  console.log('============================================================\n');

  try {
    // Get today's date key
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get this week's date key
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

    console.log(`📅 Today's date: ${todayKey}`);
    console.log(`📅 Week start: ${weekKey}\n`);

    // Check daily trending repos
    console.log('📊 Daily Trending Repos:');
    console.log('------------------------------------------------------------');
    const { data: dailyRepos, error: dailyError } = await supabase
      .from('trending_repos')
      .select('*')
      .eq('period_type', 'daily')
      .eq('period_date', todayKey)
      .order('rank', { ascending: true })
      .limit(20);

    if (dailyError) {
      console.error(`❌ Error fetching daily repos: ${dailyError.message}`);
    } else {
      console.log(`✅ Found ${dailyRepos?.length || 0} daily trending repos for today`);
      if (dailyRepos && dailyRepos.length > 0) {
        console.log('\n📋 Top 10 Daily Trending Repos:');
        dailyRepos.slice(0, 10).forEach((repo, idx) => {
          const repoInfo = repo.repo_id ? `Repo ID: ${repo.repo_id}` : 'N/A';
          console.log(`  ${idx + 1}. Rank ${repo.rank || 'N/A'} | ${repoInfo} | Score: ${repo.trending_score?.toFixed(2) || 'N/A'}`);
        });
      } else {
        console.log('⚠️  No daily trending repos found for today');
        console.log('   This could mean:');
        console.log('   - Workflow hasn\'t run yet');
        console.log('   - Workflow failed');
        console.log('   - No repos matched the criteria');
      }
    }

    console.log('\n');

    // Check weekly trending repos
    console.log('📊 Weekly Trending Repos:');
    console.log('------------------------------------------------------------');
    const { data: weeklyRepos, error: weeklyError } = await supabase
      .from('trending_repos')
      .select('*')
      .eq('period_type', 'weekly')
      .order('period_date', { ascending: false })
      .order('rank', { ascending: true })
      .limit(20);

    if (weeklyError) {
      console.error(`❌ Error fetching weekly repos: ${weeklyError.message}`);
    } else {
      const latestWeek = weeklyRepos && weeklyRepos.length > 0 ? weeklyRepos[0].period_date : null;
      const thisWeekRepos = latestWeek ? weeklyRepos.filter(r => r.period_date === latestWeek) : [];
      console.log(`✅ Found ${thisWeekRepos.length} weekly trending repos for latest week (${latestWeek || 'N/A'})`);
      if (thisWeekRepos.length > 0) {
        console.log('\n📋 Top 10 Weekly Trending Repos:');
        thisWeekRepos.slice(0, 10).forEach((repo, idx) => {
          const repoInfo = repo.repo_id ? `Repo ID: ${repo.repo_id}` : 'N/A';
          console.log(`  ${idx + 1}. Rank ${repo.rank || 'N/A'} | ${repoInfo} | Score: ${repo.trending_score?.toFixed(2) || 'N/A'}`);
        });
      } else {
        console.log('⚠️  No weekly trending repos found');
      }
    }

    console.log('\n');

    // Get detailed repo info for sample repos
    if (dailyRepos && dailyRepos.length > 0) {
      console.log('📦 Sample Repo Details:');
      console.log('------------------------------------------------------------');
      const sampleRepoId = dailyRepos[0].repo_id;
      
      const { data: repoDetails, error: repoError } = await supabase
        .from('repos_master')
        .select('repo_id, name, full_name, description, stars, language, owner_login')
        .eq('repo_id', sampleRepoId)
        .single();

      if (repoError) {
        console.log(`⚠️  Could not fetch repo details: ${repoError.message}`);
      } else if (repoDetails) {
        console.log(`  Name: ${repoDetails.name || repoDetails.full_name}`);
        console.log(`  Description: ${repoDetails.description || 'N/A'}`);
        console.log(`  Stars: ${repoDetails.stars || 0}`);
        console.log(`  Language: ${repoDetails.language || 'N/A'}`);
        console.log(`  Owner: ${repoDetails.owner_login || 'N/A'}`);
      }
    }

    console.log('\n');

    // Check total counts
    console.log('📈 Overall Statistics:');
    console.log('------------------------------------------------------------');
    
    const { count: totalDaily } = await supabase
      .from('trending_repos')
      .select('*', { count: 'exact', head: true })
      .eq('period_type', 'daily');
    
    const { count: totalWeekly } = await supabase
      .from('trending_repos')
      .select('*', { count: 'exact', head: true })
      .eq('period_type', 'weekly');

    const { count: totalRepos } = await supabase
      .from('repos_master')
      .select('*', { count: 'exact', head: true });

    console.log(`  Total daily trending entries: ${totalDaily || 0}`);
    console.log(`  Total weekly trending entries: ${totalWeekly || 0}`);
    console.log(`  Total repos in repos_master: ${totalRepos || 0}`);

    // Check most recent update
    const { data: recentUpdate } = await supabase
      .from('trending_repos')
      .select('created_at, period_type, period_date')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentUpdate) {
      const updateTime = new Date(recentUpdate.created_at);
      const timeAgo = Math.round((Date.now() - updateTime.getTime()) / 1000 / 60); // minutes ago
      console.log(`\n  Last update: ${updateTime.toLocaleString()} (${timeAgo} minutes ago)`);
      console.log(`  Period: ${recentUpdate.period_type} | Date: ${recentUpdate.period_date}`);
    }

    console.log('\n============================================================');
    console.log('✅ Verification Complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Check GitHub Actions logs if data is missing');
    console.log('   2. Verify secrets are set correctly in GitHub');
    console.log('   3. Run workflow manually to test');
    console.log('   4. Check Supabase logs for any errors');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run verification
verifyTrendingRepos();
