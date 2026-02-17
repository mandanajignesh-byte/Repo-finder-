/**
 * Quick status checker for ingestion progress
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLUSTER_TARGETS = {
  'ai_ml': 2000,
  'web_dev': 2000,
  'devops': 2000,
  'data_science': 2000,
  'mobile': 2000,
  'automation': 2000,
  'cybersecurity': 2000,
  'blockchain': 2000,
  'game_dev': 2000,
  'open_source_tools': 2000
};

async function checkStatus() {
  console.log('📊 Ingestion Status Check\n');
  console.log('='.repeat(60));
  
  let totalCurrent = 0;
  let totalTarget = 0;
  
  for (const [cluster, target] of Object.entries(CLUSTER_TARGETS)) {
    const { data, error } = await supabase
      .from('repo_cluster_new')
      .select('repo_id', { count: 'exact' })
      .eq('cluster_slug', cluster);
    
    const current = data?.length || 0;
    const progress = ((current / target) * 100).toFixed(1);
    const status = current >= target ? '✅' : '⏳';
    
    console.log(`${status} ${cluster.padEnd(20)} ${current.toString().padStart(5)}/${target} (${progress}%)`);
    
    totalCurrent += current;
    totalTarget += target;
  }
  
  console.log('='.repeat(60));
  const overallProgress = ((totalCurrent / totalTarget) * 100).toFixed(1);
  console.log(`\n📈 Overall: ${totalCurrent}/${totalTarget} repos (${overallProgress}%)`);
  
  if (totalCurrent >= totalTarget) {
    console.log('\n🎉 All targets reached! Ingestion complete!');
  } else {
    const remaining = totalTarget - totalCurrent;
    console.log(`\n⏳ Remaining: ${remaining} repos`);
    const estimatedTime = Math.ceil(remaining / 10); // Rough estimate: 10 repos/min
    console.log(`⏰ Estimated time: ~${Math.ceil(estimatedTime / 60)} hours`);
  }
  
  // Check enrichment status
  console.log('\n🔍 Enrichment Status:');
  const { data: repos } = await supabase
    .from('repos_master')
    .select('repo_id', { count: 'exact' });
  
  const { data: enrichedHealth } = await supabase
    .from('repo_health')
    .select('repo_id', { count: 'exact' });
  
  const { data: enrichedActivity } = await supabase
    .from('repo_activity')
    .select('repo_id', { count: 'exact' });
  
  const { data: enrichedComplexity } = await supabase
    .from('repo_complexity')
    .select('repo_id', { count: 'exact' });
  
  const { data: enrichedTechStack } = await supabase
    .from('repo_tech_stack')
    .select('repo_id', { count: 'exact' });
  
  const { data: enrichedBadges } = await supabase
    .from('repo_badges')
    .select('repo_id', { count: 'exact' });
  
  const { data: enrichedClusters } = await supabase
    .from('repo_cluster_new')
    .select('repo_id', { count: 'exact' });
  
  const { data: gems } = await supabase
    .from('repo_gems')
    .select('repo_id', { count: 'exact' });
  
  const totalRepos = repos?.length || 0;
  const enrichedCount = enrichedHealth?.length || 0;
  const enrichmentProgress = totalRepos > 0 ? ((enrichedCount / totalRepos) * 100).toFixed(1) : 0;
  
  console.log(`  📊 repos_master: ${totalRepos}`);
  console.log(`  🏥 repo_health: ${enrichedHealth?.length || 0} (${enrichmentProgress}%)`);
  console.log(`  ⚡ repo_activity: ${enrichedActivity?.length || 0}`);
  console.log(`  📦 repo_complexity: ${enrichedComplexity?.length || 0}`);
  console.log(`  🔧 repo_tech_stack: ${enrichedTechStack?.length || 0}`);
  console.log(`  🏅 repo_badges: ${enrichedBadges?.length || 0}`);
  console.log(`  🏷️  repo_cluster_new: ${enrichedClusters?.length || 0}`);
  console.log(`  💎 repo_gems: ${gems?.length || 0}`);
}

checkStatus().catch(console.error);
