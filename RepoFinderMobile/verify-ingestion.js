/**
 * Verification Script - Check if ingestion is working correctly
 * 
 * Usage: node verify-ingestion.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cluster targets
const CLUSTER_TARGETS = {
  'ai_ml': 3000,
  'web_dev': 3000,
  'devops': 2500,
  'data_science': 2000,
  'mobile': 2000,
  'automation': 1500,
  'cybersecurity': 1500,
  'blockchain': 1500,
  'game_dev': 1200,
  'open_source_tools': 1300
};

async function checkTable(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return { exists: false, count: 0, error: error.message };
    }
    
    return { exists: true, count: count || 0, error: null };
  } catch (error) {
    return { exists: false, count: 0, error: error.message };
  }
}

async function checkClusterProgress() {
  const { data, error } = await supabase
    .from('repo_cluster_new')
    .select('cluster_slug');
  
  if (error) {
    return { error: error.message, clusters: {} };
  }
  
  const clusters = {};
  for (const row of data || []) {
    clusters[row.cluster_slug] = (clusters[row.cluster_slug] || 0) + 1;
  }
  
  return { error: null, clusters };
}

async function main() {
  console.log('🔍 Verifying Ingestion Status...\n');
  
  // Check all tables
  console.log('📊 Checking Tables:\n');
  
  const tables = [
    'repos_master',
    'repo_cluster_new',
    'repo_tech_stack',
    'repo_complexity',
    'repo_activity',
    'repo_health',
    'repo_badges',
    'repo_gems'
  ];
  
  let allTablesExist = true;
  for (const table of tables) {
    const result = await checkTable(table);
    const status = result.exists ? '✅' : '❌';
    const count = result.exists ? result.count : 0;
    
    console.log(`  ${status} ${table}: ${count} rows`);
    
    if (!result.exists && result.error) {
      console.log(`     Error: ${result.error}`);
      allTablesExist = false;
    }
  }
  
  console.log('\n');
  
  // Check cluster progress
  console.log('🎯 Cluster Progress:\n');
  
  const { clusters, error: clusterError } = await checkClusterProgress();
  
  if (clusterError) {
    console.log(`  ❌ Error checking clusters: ${clusterError}\n`);
  } else {
    let totalCurrent = 0;
    let totalTarget = 0;
    
    for (const [slug, target] of Object.entries(CLUSTER_TARGETS)) {
      const current = clusters[slug] || 0;
      const progress = ((current / target) * 100).toFixed(1);
      const status = current >= target ? '✅' : '⏳';
      const needed = Math.max(0, target - current);
      
      console.log(`  ${status} ${slug}: ${current}/${target} (${progress}%) ${needed > 0 ? `- Need ${needed} more` : ''}`);
      
      totalCurrent += current;
      totalTarget += target;
    }
    
    console.log(`\n  📊 Total: ${totalCurrent}/${totalTarget} repos (${((totalCurrent / totalTarget) * 100).toFixed(1)}%)`);
  }
  
  // Check enrichment status
  console.log('\n🔧 Enrichment Status:\n');
  
  const { count: reposCount } = await supabase
    .from('repos_master')
    .select('*', { count: 'exact', head: true });
  
  const { count: techStackCount } = await supabase
    .from('repo_tech_stack')
    .select('*', { count: 'exact', head: true });
  
  const { count: complexityCount } = await supabase
    .from('repo_complexity')
    .select('*', { count: 'exact', head: true });
  
  const { count: activityCount } = await supabase
    .from('repo_activity')
    .select('*', { count: 'exact', head: true });
  
  const { count: healthCount } = await supabase
    .from('repo_health')
    .select('*', { count: 'exact', head: true });
  
  const { count: badgesCount } = await supabase
    .from('repo_badges')
    .select('*', { count: 'exact', head: true });
  
  const { count: gemsCount } = await supabase
    .from('repo_gems')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  Repos: ${reposCount || 0}`);
  console.log(`  Tech Stack: ${techStackCount || 0} (${reposCount ? ((techStackCount / reposCount) * 100).toFixed(1) : 0}% enriched)`);
  console.log(`  Complexity: ${complexityCount || 0} (${reposCount ? ((complexityCount / reposCount) * 100).toFixed(1) : 0}% enriched)`);
  console.log(`  Activity: ${activityCount || 0} (${reposCount ? ((activityCount / reposCount) * 100).toFixed(1) : 0}% enriched)`);
  console.log(`  Health: ${healthCount || 0} (${reposCount ? ((healthCount / reposCount) * 100).toFixed(1) : 0}% enriched)`);
  console.log(`  Badges: ${badgesCount || 0}`);
  console.log(`  Gems: ${gemsCount || 0}`);
  
  // Recommendations
  console.log('\n💡 Recommendations:\n');
  
  if (!allTablesExist) {
    console.log('  ⚠️  Some tables are missing. Run the schema SQL files first.');
  }
  
  if (reposCount === 0) {
    console.log('  ⚠️  No repos found. Run: node ingest-by-cluster-targets.js --cluster=all');
  }
  
  if (reposCount > 0 && techStackCount === 0) {
    console.log('  ⚠️  Repos not enriched. Run: node ingest-pipeline.js --step=3-7');
  }
  
  if (reposCount > 0 && activityCount === 0) {
    console.log('  ⚠️  Activity not computed. Run: node ingest-pipeline.js --step=4');
  }
  
  if (reposCount > 0 && healthCount === 0) {
    console.log('  ⚠️  Health not computed. Run: node ingest-pipeline.js --step=5');
  }
  
  if (gemsCount === 0 && reposCount > 100) {
    console.log('  ⚠️  No gems detected. Run: node ingest-pipeline.js --step=7');
  }
  
  // Check if clusters need more repos
  const { clusters: clusterData } = await checkClusterProgress();
  const incompleteClusters = [];
  
  for (const [slug, target] of Object.entries(CLUSTER_TARGETS)) {
    const current = clusterData[slug] || 0;
    if (current < target) {
      incompleteClusters.push({ slug, current, target, needed: target - current });
    }
  }
  
  if (incompleteClusters.length > 0) {
    console.log(`\n  ⚠️  ${incompleteClusters.length} clusters below target:`);
    for (const cluster of incompleteClusters.slice(0, 5)) {
      console.log(`     - ${cluster.slug}: Need ${cluster.needed} more repos`);
    }
    if (incompleteClusters.length > 5) {
      console.log(`     ... and ${incompleteClusters.length - 5} more`);
    }
    console.log(`\n  Run: node ingest-by-cluster-targets.js --cluster=all`);
  }
  
  console.log('\n✨ Verification complete!\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkTable, checkClusterProgress };
