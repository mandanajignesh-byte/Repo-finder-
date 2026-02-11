/**
 * Cleanup Old Trending Repositories
 * 
 * This script deletes old trending repos that are no longer needed.
 * Run this script periodically (e.g., weekly) to keep the database clean.
 * 
 * Usage:
 *   npm run ts-node scripts/cleanup-old-trending.ts [days]
 * 
 * Default: Deletes trending repos older than 7 days
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Cleanup old trending repos
 */
async function cleanupOldTrending(daysToKeep: number = 7): Promise<void> {
  console.log(`🧹 Cleaning up trending repos older than ${daysToKeep} days...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffDateStr = cutoffDate.toISOString();

  // Delete old trending repos
  const { data, error } = await supabase
    .from('trending_repos')
    .delete()
    .lt('created_at', cutoffDateStr)
    .select();

  if (error) {
    console.error('❌ Error cleaning up old trending repos:', error);
    throw error;
  }

  const deletedCount = data?.length || 0;
  console.log(`✅ Deleted ${deletedCount} old trending repos`);
}

/**
 * Main function
 */
async function main() {
  const daysToKeep = parseInt(process.argv[2]) || 7;
  
  console.log(`🚀 Starting cleanup of trending repos...`);
  console.log(`📅 Keeping repos from the last ${daysToKeep} days`);

  try {
    await cleanupOldTrending(daysToKeep);
    console.log('\n✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
