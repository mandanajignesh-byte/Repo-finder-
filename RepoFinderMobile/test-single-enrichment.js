/**
 * Test enrichment for a single unenriched repo
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSingleEnrichment() {
  console.log('🧪 Testing enrichment for a single unenriched repo\n');
  
  // Get a repo that's not enriched
  const { data: enriched } = await supabase
    .from('repo_health')
    .select('repo_id')
    .limit(1000);
  
  const enrichedIds = new Set((enriched || []).map(r => r.repo_id));
  
  // Get a repo not in the enriched list
  const { data: repos } = await supabase
    .from('repos_master')
    .select('*')
    .limit(100);
  
  const unenrichedRepo = repos?.find(r => !enrichedIds.has(r.repo_id));
  
  if (!unenrichedRepo) {
    console.log('✅ All repos appear to be enriched!');
    return;
  }
  
  console.log(`Testing with: ${unenrichedRepo.full_name} (ID: ${unenrichedRepo.repo_id})\n`);
  
  // Import the enrichment function
  const enrichAllRepos = require('./enrich-all-repos.js');
  
  // Test enrichment
  console.log('Running enrichment...');
  const result = await enrichAllRepos.enrichSingleRepo(unenrichedRepo);
  
  console.log('\nResult:', result);
  
  // Verify
  const { data: health } = await supabase
    .from('repo_health')
    .select('*')
    .eq('repo_id', unenrichedRepo.repo_id)
    .single();
  
  console.log('\nVerification:');
  console.log(`  Health data: ${health ? '✅' : '❌'}`);
}

testSingleEnrichment().catch(console.error);
