/**
 * Check repo counts and remove duplicates
 * Usage: npx tsx scripts/check-counts-and-dedupe.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
  console.log('📊 Checking current repo counts...\n');

  // Get total count
  const { count: totalCount, error: totalError } = await supabase
    .from('repo_clusters')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Error getting total count:', totalError);
    return;
  }

  console.log(`Total repos in repo_clusters: ${totalCount}\n`);

  // Get count per cluster
  const { data: clusterCounts, error: clusterError } = await supabase
    .from('repo_clusters')
    .select('cluster_name')
    .then(result => {
      if (result.error) return result;
      
      // Count by cluster
      const counts: Record<string, number> = {};
      result.data?.forEach(row => {
        counts[row.cluster_name] = (counts[row.cluster_name] || 0) + 1;
      });
      
      return { data: counts, error: null };
    });

  if (clusterError) {
    console.error('❌ Error getting cluster counts:', clusterError);
  } else {
    console.log('Repos per cluster:');
    Object.entries(clusterCounts || {}).forEach(([cluster, count]) => {
      console.log(`  ${cluster}: ${count}`);
    });
    console.log('');
  }

  // Check for duplicates (same repo_id across clusters)
  const { data: duplicates, error: dupError } = await supabase
    .from('repo_clusters')
    .select('repo_id, cluster_name, quality_score, updated_at')
    .then(async result => {
      if (result.error) return result;
      
      // Find duplicates
      const repoIdMap = new Map<string, any[]>();
      result.data?.forEach(row => {
        if (!repoIdMap.has(row.repo_id)) {
          repoIdMap.set(row.repo_id, []);
        }
        repoIdMap.get(row.repo_id)!.push(row);
      });
      
      const duplicates: Array<{ repo_id: string; clusters: string[]; count: number }> = [];
      repoIdMap.forEach((entries, repoId) => {
        if (entries.length > 1) {
          duplicates.push({
            repo_id: repoId,
            clusters: entries.map(e => e.cluster_name),
            count: entries.length,
          });
        }
      });
      
      return { data: duplicates, error: null };
    });

  if (dupError) {
    console.error('❌ Error checking duplicates:', dupError);
  } else {
    const dupCount = duplicates?.length || 0;
    const totalDupEntries = duplicates?.reduce((sum, d) => sum + d.count - 1, 0) || 0;
    
    console.log(`🔍 Duplicate check:`);
    console.log(`  Unique repos with duplicates: ${dupCount}`);
    console.log(`  Total duplicate entries to remove: ${totalDupEntries}`);
    
    if (dupCount > 0) {
      console.log(`\n  Top 10 duplicated repos:`);
      duplicates?.slice(0, 10).forEach(dup => {
        console.log(`    ${dup.repo_id}: appears in ${dup.count} clusters (${dup.clusters.join(', ')})`);
      });
    }
    console.log('');
  }

  return {
    totalCount,
    clusterCounts,
    duplicateCount: duplicates?.length || 0,
    totalDupEntries: duplicates?.reduce((sum, d) => sum + d.count - 1, 0) || 0,
  };
}

async function removeDuplicates() {
  console.log('🧹 Removing duplicates...\n');

  // Use the SQL from remove-duplicates.sql
  // We'll use RPC or direct SQL execution
  // Since Supabase client doesn't support DELETE directly, we'll use a different approach
  
  // First, get all duplicates
  const { data: allRepos, error: fetchError } = await supabase
    .from('repo_clusters')
    .select('id, repo_id, cluster_name, quality_score, updated_at')
    .order('quality_score', { ascending: false })
    .order('updated_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching repos:', fetchError);
    return;
  }

  // Group by repo_id and keep only the best one
  const repoMap = new Map<string, any>();
  const idsToDelete: string[] = [];

  allRepos?.forEach(repo => {
    const existing = repoMap.get(repo.repo_id);
    if (!existing) {
      repoMap.set(repo.repo_id, repo);
    } else {
      // Compare quality_score and updated_at
      if (
        repo.quality_score > existing.quality_score ||
        (repo.quality_score === existing.quality_score && 
         new Date(repo.updated_at) > new Date(existing.updated_at))
      ) {
        idsToDelete.push(existing.id);
        repoMap.set(repo.repo_id, repo);
      } else {
        idsToDelete.push(repo.id);
      }
    }
  });

  console.log(`  Found ${idsToDelete.length} duplicate entries to remove`);

  if (idsToDelete.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  // Delete in batches of 100
  const batchSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    
    const { error: deleteError } = await supabase
      .from('repo_clusters')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError);
    } else {
      deletedCount += batch.length;
      console.log(`  Deleted ${deletedCount}/${idsToDelete.length} duplicates...`);
    }
  }

  console.log(`✅ Removed ${deletedCount} duplicate entries\n`);

  // Update cluster metadata
  console.log('📝 Updating cluster metadata...');
  const { data: clusters } = await supabase
    .from('cluster_metadata')
    .select('cluster_name');

  if (clusters) {
    for (const cluster of clusters) {
      const { count } = await supabase
        .from('repo_clusters')
        .select('*', { count: 'exact', head: true })
        .eq('cluster_name', cluster.cluster_name);

      await supabase
        .from('cluster_metadata')
        .update({ repo_count: count || 0 })
        .eq('cluster_name', cluster.cluster_name);
    }
    console.log('✅ Cluster metadata updated\n');
  }
}

async function main() {
  console.log('🔍 Checking repo counts and removing duplicates...\n');
  
  const stats = await checkCounts();
  
  if (stats && stats.duplicateCount > 0) {
    console.log('⚠️  Duplicates found. Removing them...\n');
    await removeDuplicates();
    
    console.log('📊 Final counts after deduplication:\n');
    await checkCounts();
  } else {
    console.log('✅ No duplicates found!');
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
