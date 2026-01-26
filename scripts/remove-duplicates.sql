-- ============================================
-- Remove Duplicate Repos from repo_clusters
-- Run this AFTER curation script completes
-- ============================================

-- IMPORTANT: This removes EXACT duplicates (same repo_id AND same cluster_name)
-- It does NOT remove repos that appear in multiple clusters (that's a feature!)
-- Each repo can belong to multiple clusters, but should only appear once per cluster

-- Step 1: Check for exact duplicates before removal
SELECT 
  'Before cleanup' as status,
  COUNT(*) as total_entries,
  COUNT(DISTINCT (cluster_name, repo_id)) as unique_entries,
  COUNT(*) - COUNT(DISTINCT (cluster_name, repo_id)) as exact_duplicates
FROM repo_clusters;

-- Step 2: Show exact duplicates (if any)
SELECT 
  cluster_name,
  repo_id,
  COUNT(*) as duplicate_count
FROM repo_clusters
GROUP BY cluster_name, repo_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, cluster_name;

-- Step 3: Remove exact duplicates
-- Keep the entry with highest quality_score, or most recent if scores are equal
DELETE FROM repo_clusters
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY cluster_name, repo_id 
        ORDER BY quality_score DESC, updated_at DESC
      ) as rn
    FROM repo_clusters
  ) ranked
  WHERE rn > 1
);

-- Step 4: Verify after cleanup
SELECT 
  'After cleanup' as status,
  COUNT(*) as total_entries,
  COUNT(DISTINCT (cluster_name, repo_id)) as unique_entries,
  COUNT(*) - COUNT(DISTINCT (cluster_name, repo_id)) as exact_duplicates
FROM repo_clusters;

-- Step 5: Update cluster metadata
UPDATE cluster_metadata cm
SET repo_count = (
  SELECT COUNT(*) 
  FROM repo_clusters rc 
  WHERE rc.cluster_name = cm.cluster_name
);

-- Step 6: Final counts by cluster
SELECT 
  cluster_name,
  COUNT(*) as repo_count
FROM repo_clusters 
GROUP BY cluster_name 
ORDER BY cluster_name;

-- ============================================
-- Done! 
-- Note: Repos appearing in multiple clusters is EXPECTED and CORRECT.
-- This script only removes exact duplicates (same repo in same cluster twice).
-- ============================================
