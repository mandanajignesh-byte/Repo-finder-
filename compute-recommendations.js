/**
 * Recommendation System Worker
 * 
 * Precomputes recommendations for users using vector matching
 * Runs offline to generate fast feed
 * 
 * Usage:
 *   node compute-recommendations.js --user-id=<userId>
 *   node compute-recommendations.js --all-users
 *   node compute-recommendations.js --batch-size=50
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50');
const MAX_RECOMMENDATIONS = 500;

async function computeRecommendationsForUser(userId) {
  console.log(`\n🔄 Computing recommendations for user: ${userId}`);
  
  try {
    const { data, error } = await supabase.rpc('precompute_user_recommendations', {
      p_user_id: userId,
      p_limit: MAX_RECOMMENDATIONS
    });
    
    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      return false;
    }
    
    console.log(`  ✅ Generated ${data} recommendations`);
    return true;
  } catch (e) {
    console.error(`  ❌ Exception: ${e.message}`);
    return false;
  }
}

async function computeForAllUsers() {
  console.log('\n🚀 Computing recommendations for all users...\n');
  
  // Get all users with completed onboarding
  const { data: users, error } = await supabase
    .from('app_user_preferences')
    .select('user_id')
    .eq('onboarding_completed', true);
  
  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log('⚠️  No users with completed onboarding found');
    return;
  }
  
  console.log(`📊 Found ${users.length} users\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  // Process in batches
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} users)...`);
    
    const promises = batch.map(user => computeRecommendationsForUser(user.user_id));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successCount++;
      } else {
        failCount++;
        console.error(`  ❌ Failed for user: ${batch[index].user_id}`);
      }
    });
    
    // Rate limiting
    if (i + BATCH_SIZE < users.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n\n✅ Complete!`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📊 Total: ${users.length}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const userIdArg = args.find(arg => arg.startsWith('--user-id='));
  const allUsersArg = args.find(arg => arg === '--all-users');
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  
  if (batchSizeArg) {
    const size = parseInt(batchSizeArg.split('=')[1]);
    if (size > 0) {
      BATCH_SIZE = size;
    }
  }
  
  if (userIdArg) {
    const userId = userIdArg.split('=')[1];
    await computeRecommendationsForUser(userId);
  } else if (allUsersArg) {
    await computeForAllUsers();
  } else {
    console.log('Usage:');
    console.log('  node compute-recommendations.js --user-id=<userId>');
    console.log('  node compute-recommendations.js --all-users');
    console.log('  node compute-recommendations.js --batch-size=50');
  }
}

main().catch(console.error);
