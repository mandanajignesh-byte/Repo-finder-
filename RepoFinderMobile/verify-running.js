/**
 * Comprehensive verification script to check if ingestion is running properly
 */

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProcessRunning() {
  console.log('🔍 Checking if ingestion process is running...\n');
  
  try {
    const processes = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', { encoding: 'utf-8' });
    const nodeCount = (processes.match(/node\.exe/g) || []).length;
    
    if (nodeCount > 0) {
      console.log(`✅ Found ${nodeCount} Node.js process(es) running`);
      return true;
    } else {
      console.log('❌ No Node.js processes found');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Could not check processes:', error.message);
    return null;
  }
}

async function checkRecentActivity() {
  console.log('\n🕐 Checking recent activity (last 10 minutes)...\n');
  
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: recentRepos, count: recentCount } = await supabase
    .from('repos_master')
    .select('repo_id, full_name, ingested_at', { count: 'exact' })
    .gte('ingested_at', tenMinutesAgo)
    .order('ingested_at', { ascending: false })
    .limit(10);
  
  if (recentCount > 0) {
    console.log(`✅ Found ${recentCount} repos ingested in last 10 minutes`);
    console.log('   Recent repos:');
    recentRepos.slice(0, 5).forEach(repo => {
      const time = new Date(repo.ingested_at).toLocaleTimeString();
      console.log(`     - ${repo.full_name} (${time})`);
    });
    return true;
  } else {
    console.log('❌ No repos ingested in last 10 minutes');
    console.log('   This could mean:');
    console.log('     • Process is not running');
    console.log('     • Process is stuck');
    console.log('     • Rate limiting is blocking requests');
    return false;
  }
}

async function checkEnrichment() {
  console.log('\n🔧 Checking enrichment status...\n');
  
  const { count: reposCount } = await supabase
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
  
  const enrichmentRatio = reposCount > 0 ? ((healthCount / reposCount) * 100).toFixed(1) : 0;
  
  console.log(`  Repos in master: ${reposCount || 0}`);
  console.log(`  Enriched (health): ${healthCount || 0}`);
  console.log(`  Enriched (activity): ${activityCount || 0}`);
  console.log(`  Enriched (complexity): ${complexityCount || 0}`);
  console.log(`  Enrichment ratio: ${enrichmentRatio}%`);
  
  if (enrichmentRatio < 50 && reposCount > 100) {
    console.log('⚠️  WARNING: Low enrichment ratio!');
    return false;
  } else if (enrichmentRatio > 80) {
    console.log('✅ Enrichment is working well!');
    return true;
  }
  
  return enrichmentRatio > 0;
}

async function checkClusterProgress() {
  console.log('\n🎯 Checking cluster progress...\n');
  
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
  
  let totalCurrent = 0;
  let totalTarget = 0;
  
  for (const [cluster, target] of Object.entries(CLUSTER_TARGETS)) {
    const { count } = await supabase
      .from('repo_cluster_new')
      .select('*', { count: 'exact', head: true })
      .eq('cluster_slug', cluster);
    
    const current = count || 0;
    const progress = ((current / target) * 100).toFixed(1);
    const status = current >= target ? '✅' : current > 0 ? '⏳' : '⚪';
    
    console.log(`  ${status} ${cluster.padEnd(20)} ${current.toString().padStart(5)}/${target} (${progress}%)`);
    
    totalCurrent += current;
    totalTarget += target;
  }
  
  console.log(`\n  📊 Total: ${totalCurrent}/${totalTarget} repos (${((totalCurrent / totalTarget) * 100).toFixed(1)}%)`);
  
  return { totalCurrent, totalTarget };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  VERIFICATION: Is Ingestion Running Properly?');
  console.log('='.repeat(60));
  console.log();
  
  // 1. Check if process is running
  const processRunning = await checkProcessRunning();
  
  // 2. Check recent activity
  const hasRecentActivity = await checkRecentActivity();
  
  // 3. Check enrichment
  const enrichmentOk = await checkEnrichment();
  
  // 4. Check cluster progress
  const { totalCurrent, totalTarget } = await checkClusterProgress();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  
  const issues = [];
  const successes = [];
  
  if (processRunning) {
    successes.push('✅ Process is running');
  } else if (processRunning === false) {
    issues.push('❌ No Node.js process found');
  }
  
  if (hasRecentActivity) {
    successes.push('✅ Recent activity detected');
  } else {
    issues.push('❌ No recent activity (may be stuck or not running)');
  }
  
  if (enrichmentOk) {
    successes.push('✅ Enrichment is working');
  } else {
    issues.push('⚠️  Enrichment may have issues');
  }
  
  if (totalCurrent > 0) {
    successes.push(`✅ Progress: ${totalCurrent}/${totalTarget} repos`);
  } else {
    issues.push('❌ No repos ingested yet');
  }
  
  console.log('\n✅ Working:');
  successes.forEach(s => console.log(`  ${s}`));
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues:');
    issues.forEach(i => console.log(`  ${i}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (issues.length === 0) {
    console.log('🎉 Everything looks good! Ingestion is running properly.');
  } else if (hasRecentActivity && processRunning) {
    console.log('⚠️  Ingestion is running but has some issues. Check the ingestion window for errors.');
  } else {
    console.log('❌ Ingestion may not be running properly. Consider restarting.');
  }
  
  console.log('='.repeat(60));
}

main().catch(console.error);
