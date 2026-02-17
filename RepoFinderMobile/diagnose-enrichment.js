/**
 * Diagnose enrichment issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
  console.log('🔍 Diagnosing Enrichment Issues\n');
  console.log('='.repeat(60));
  
  // Check table counts
  console.log('\n📊 Table Counts:');
  const tables = [
    'repos_master',
    'repo_health',
    'repo_activity',
    'repo_complexity',
    'repo_tech_stack',
    'repo_badges',
    'repo_gems',
    'repo_cluster_new'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: ERROR - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: ${count || 0} records`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: EXCEPTION - ${err.message}`);
    }
  }
  
  // Check for repos with enrichment data
  console.log('\n🔍 Checking enrichment coverage:');
  const { count: totalRepos } = await supabase
    .from('repos_master')
    .select('*', { count: 'exact', head: true });
  
  const { count: enrichedHealth } = await supabase
    .from('repo_health')
    .select('*', { count: 'exact', head: true });
  
  const { count: enrichedActivity } = await supabase
    .from('repo_activity')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  Total repos: ${totalRepos || 0}`);
  console.log(`  With health data: ${enrichedHealth || 0} (${((enrichedHealth || 0) / (totalRepos || 1) * 100).toFixed(1)}%)`);
  console.log(`  With activity data: ${enrichedActivity || 0} (${((enrichedActivity || 0) / (totalRepos || 1) * 100).toFixed(1)}%)`);
  
  // Check for recent errors - get a sample repo and try to enrich it
  console.log('\n🧪 Testing enrichment on a sample repo:');
  const { data: sampleRepo } = await supabase
    .from('repos_master')
    .select('*')
    .limit(1)
    .single();
  
  if (sampleRepo) {
    console.log(`  Testing with: ${sampleRepo.full_name} (ID: ${sampleRepo.repo_id})`);
    
    // Test each table
    const tests = [
      { table: 'repo_health', data: { repo_id: sampleRepo.repo_id, health_score: 0.5, activity_score: 0.5, maintenance_score: 0.5, community_score: 0.5, code_quality_score: 0.5, documentation_score: 0.5, stability_score: 0.5 } },
      { table: 'repo_activity', data: { repo_id: sampleRepo.repo_id, freshness_score: 0.5, activity_score: 0.5 } },
      { table: 'repo_complexity', data: { repo_id: sampleRepo.repo_id, complexity_slug: 'full_app', confidence: 0.8 } }
    ];
    
    for (const test of tests) {
      const { error } = await supabase
        .from(test.table)
        .upsert(test.data, { onConflict: 'repo_id' });
      
      if (error) {
        console.log(`    ❌ ${test.table}: ${error.message}`);
        if (error.details) console.log(`       Details: ${error.details}`);
        if (error.hint) console.log(`       Hint: ${error.hint}`);
        if (error.code) console.log(`       Code: ${error.code}`);
      } else {
        console.log(`    ✅ ${test.table}: OK`);
      }
    }
    
    // Test repo_tech_stack separately (composite unique constraint - can't use upsert)
    console.log(`    Testing repo_tech_stack...`);
    const insertResult = await supabase
      .from('repo_tech_stack')
      .insert({
        repo_id: sampleRepo.repo_id,
        tech_slug: 'javascript',
        weight: 1.0
      });
    
    if (insertResult.error && 
        (insertResult.error.code === '23505' || 
         insertResult.error.message.includes('duplicate') ||
         insertResult.error.message.includes('unique'))) {
      // Try update instead (this is how the actual enrichment handles it)
      const updateResult = await supabase
        .from('repo_tech_stack')
        .update({ weight: 1.0 })
        .eq('repo_id', sampleRepo.repo_id)
        .eq('tech_slug', 'javascript');
      
      if (updateResult.error) {
        console.log(`    ❌ repo_tech_stack: ${updateResult.error.message}`);
      } else {
        console.log(`    ✅ repo_tech_stack: OK (updated existing)`);
      }
    } else if (insertResult.error) {
      console.log(`    ❌ repo_tech_stack: ${insertResult.error.message}`);
    } else {
      console.log(`    ✅ repo_tech_stack: OK (inserted new)`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

diagnose().catch(console.error);
