/**
 * Get Trending Underrated Gems by Category
 * 
 * Usage:
 *   node get-trending-gems.js --period=daily --cluster=ai_ml
 *   node get-trending-gems.js --period=weekly --cluster=web_dev
 *   node get-trending-gems.js --period=daily (all categories)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Get arguments
const periodArg = process.argv.find(arg => arg.startsWith('--period='));
const clusterArg = process.argv.find(arg => arg.startsWith('--cluster='));
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));

const period = periodArg ? periodArg.split('=')[1] : 'daily';
const cluster = clusterArg ? clusterArg.split('=')[1] : null;
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;

async function getTrendingGems() {
  console.log(`\n🔥 Trending Underrated Gems (${period}${cluster ? ` - ${cluster}` : ' - All Categories'})\n`);
  console.log('='.repeat(60));
  
  // Use the database function
  const { data, error } = await supabase
    .rpc('get_trending_underrated_gems', {
      p_period_type: period,
      p_cluster_slug: cluster,
      p_limit: limit
    });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️  No trending gems found.');
    console.log('💡 Run: node calculate-trending-scores.js --period=' + period);
    return;
  }
  
  console.log(`\n📊 Found ${data.length} trending underrated gems:\n`);
  
  data.forEach((repo, index) => {
    console.log(`${(index + 1).toString().padStart(3)}. ${repo.full_name}`);
    console.log(`     ⭐ ${repo.stars} stars | 🔥 Trending: ${repo.trending_score.toFixed(2)} | 💎 Gem: ${repo.gem_score.toFixed(2)}`);
    console.log(`     📈 +${repo.star_velocity.toFixed(1)} stars/${period === 'daily' ? 'day' : 'week'} | 🏷️  ${repo.cluster_slug}`);
    if (repo.description) {
      console.log(`     ${repo.description.substring(0, 80)}${repo.description.length > 80 ? '...' : ''}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log(`\n✅ Total: ${data.length} trending underrated gems`);
}

getTrendingGems().catch(console.error);
