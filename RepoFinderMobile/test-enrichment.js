/**
 * Test enrichment for a single repo to debug issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEnrichment() {
  console.log('🧪 Testing enrichment for a single repo...\n');
  
  // Get one repo
  const { data: repos, error: fetchError } = await supabase
    .from('repos_master')
    .select('*')
    .limit(1)
    .single();
  
  if (fetchError) {
    console.error('❌ Error fetching repo:', fetchError);
    return;
  }
  
  if (!repos) {
    console.log('⚠️  No repos found');
    return;
  }
  
  console.log(`📦 Testing with repo: ${repos.full_name} (ID: ${repos.repo_id})\n`);
  
  const repoId = repos.repo_id;
  
  // Test 1: repo_health
  console.log('1️⃣ Testing repo_health insert...');
  const healthData = {
    repo_id: repoId,
    activity_score: 0.5,
    maintenance_score: 0.6,
    community_score: 0.7,
    code_quality_score: 0.8,
    documentation_score: 0.9,
    stability_score: 0.75,
    health_score: 0.72
  };
  
  const { data: healthResult, error: healthError } = await supabase
    .from('repo_health')
    .upsert(healthData, { onConflict: 'repo_id' });
  
  if (healthError) {
    console.error('  ❌ repo_health error:', healthError);
  } else {
    console.log('  ✅ repo_health success');
  }
  
  // Test 2: repo_activity
  console.log('\n2️⃣ Testing repo_activity insert...');
  const activityData = {
    repo_id: repoId,
    last_commit_at: repos.pushed_at || repos.updated_at,
    commits_30_days: 0,
    commits_90_days: 0,
    commit_velocity: 0,
    freshness_score: 0.85,
    activity_score: 0.51
  };
  
  const { data: activityResult, error: activityError } = await supabase
    .from('repo_activity')
    .upsert(activityData, { onConflict: 'repo_id' });
  
  if (activityError) {
    console.error('  ❌ repo_activity error:', activityError);
  } else {
    console.log('  ✅ repo_activity success');
  }
  
  // Test 3: repo_complexity
  console.log('\n3️⃣ Testing repo_complexity insert...');
  const complexityData = {
    repo_id: repoId,
    complexity_slug: 'full_app',
    confidence: 0.8,
    loc_bucket: 'medium'
  };
  
  const { data: complexityResult, error: complexityError } = await supabase
    .from('repo_complexity')
    .upsert(complexityData, { onConflict: 'repo_id' });
  
  if (complexityError) {
    console.error('  ❌ repo_complexity error:', complexityError);
  } else {
    console.log('  ✅ repo_complexity success');
  }
  
  // Test 4: repo_tech_stack
  console.log('\n4️⃣ Testing repo_tech_stack insert...');
  const techStackData = {
    repo_id: repoId,
    tech_slug: repos.language?.toLowerCase() || 'other',
    weight: 1.0
  };
  
  const { data: techStackResult, error: techStackError } = await supabase
    .from('repo_tech_stack')
    .upsert(techStackData, { onConflict: 'repo_id,tech_slug' });
  
  if (techStackError) {
    console.error('  ❌ repo_tech_stack error:', techStackError);
  } else {
    console.log('  ✅ repo_tech_stack success');
  }
  
  // Test 5: repo_badges
  console.log('\n5️⃣ Testing repo_badges insert...');
  const badgeData = {
    repo_id: repoId,
    badge_slug: 'well_maintained'
  };
  
  const { data: badgeResult, error: badgeError } = await supabase
    .from('repo_badges')
    .upsert(badgeData, { onConflict: 'repo_id,badge_slug' });
  
  if (badgeError) {
    console.error('  ❌ repo_badges error:', badgeError);
  } else {
    console.log('  ✅ repo_badges success');
  }
  
  // Verify data was inserted
  console.log('\n🔍 Verifying inserted data...');
  const { count: healthCount } = await supabase
    .from('repo_health')
    .select('*', { count: 'exact', head: true })
    .eq('repo_id', repoId);
  
  const { count: activityCount } = await supabase
    .from('repo_activity')
    .select('*', { count: 'exact', head: true })
    .eq('repo_id', repoId);
  
  console.log(`  repo_health count: ${healthCount || 0}`);
  console.log(`  repo_activity count: ${activityCount || 0}`);
}

testEnrichment().catch(console.error);
