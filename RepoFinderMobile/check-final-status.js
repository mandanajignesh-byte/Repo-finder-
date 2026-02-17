/**
 * Check final enrichment status
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFinalStatus() {
  console.log('📊 Final Enrichment Status\n');
  console.log('='.repeat(60));
  
  const { count: totalRepos } = await supabase
    .from('repos_master')
    .select('*', { count: 'exact', head: true });
  
  const { count: healthCount } = await supabase
    .from('repo_health')
    .select('*', { count: 'exact', head: true });
  
  const { count: activityCount } = await supabase
    .from('repo_activity')
    .select('*', { count: 'exact', head: true });
  
  const { count: complexityCount } = await supabase
    .from('repo_complexity')
    .select('*', { count: 'exact', head: true });
  
  const { count: techStackCount } = await supabase
    .from('repo_tech_stack')
    .select('*', { count: 'exact', head: true });
  
  const { count: badgesCount } = await supabase
    .from('repo_badges')
    .select('*', { count: 'exact', head: true });
  
  const { count: gemsCount } = await supabase
    .from('repo_gems')
    .select('*', { count: 'exact', head: true });
  
  const { count: clustersCount } = await supabase
    .from('repo_cluster_new')
    .select('*', { count: 'exact', head: true });
  
  const progress = ((healthCount || 0) / (totalRepos || 1) * 100).toFixed(1);
  const remaining = (totalRepos || 0) - (healthCount || 0);
  
  console.log(`📊 Total Repos: ${totalRepos || 0}`);
  console.log(`✅ Enriched: ${healthCount || 0} (${progress}%)`);
  console.log(`⏳ Remaining: ${remaining}`);
  console.log('');
  console.log('📋 Table Status:');
  console.log(`  🏥 repo_health: ${healthCount || 0}`);
  console.log(`  ⚡ repo_activity: ${activityCount || 0}`);
  console.log(`  📦 repo_complexity: ${complexityCount || 0}`);
  console.log(`  🔧 repo_tech_stack: ${techStackCount || 0}`);
  console.log(`  🏅 repo_badges: ${badgesCount || 0}`);
  console.log(`  💎 repo_gems: ${gemsCount || 0}`);
  console.log(`  🏷️  repo_cluster_new: ${clustersCount || 0}`);
  console.log('');
  
  if (remaining === 0) {
    console.log('🎉 ALL REPOS ENRICHED!');
  } else {
    console.log(`⏳ ${remaining} repos still need enrichment`);
    console.log('💡 Run: node enrich-all-repos.js to continue');
  }
  
  console.log('='.repeat(60));
}

checkFinalStatus().catch(console.error);
