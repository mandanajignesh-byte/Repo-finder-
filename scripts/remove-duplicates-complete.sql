-- ============================================
-- Complete Duplicate Removal Script
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check current counts
SELECT 
  'Before cleanup' as status,
  COUNT(*) as total_repos,
  COUNT(DISTINCT repo_id) as unique_repos,
  COUNT(*) - COUNT(DISTINCT repo_id) as duplicate_entries
FROM repo_clusters;

-- Step 2: Show duplicates by cluster
SELECT 
  cluster_name,
  COUNT(*) as repo_count
FROM repo_clusters
GROUP BY cluster_name
ORDER BY cluster_name;

-- Step 3: Remove duplicates
-- Keep the entry with highest quality_score, or most recent if scores are equal
WITH ranked_repos AS (
  SELECT 
    id,
    repo_id,
    cluster_name,
    quality_score,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY repo_id 
      ORDER BY quality_score DESC, updated_at DESC
    ) as rn
  FROM repo_clusters
)
DELETE FROM repo_clusters
WHERE id IN (
  SELECT id 
  FROM ranked_repos 
  WHERE rn > 1
);

-- Step 4: Update cluster metadata
UPDATE cluster_metadata cm
SET repo_count = (
  SELECT COUNT(*) 
  FROM repo_clusters rc 
  WHERE rc.cluster_name = cm.cluster_name
);

-- Step 5: Verify final counts
SELECT 
  'After cleanup' as status,
  COUNT(*) as total_repos,
  COUNT(DISTINCT repo_id) as unique_repos,
  COUNT(*) - COUNT(DISTINCT repo_id) as duplicate_entries
FROM repo_clusters;

-- Step 6: Show final counts by cluster
SELECT 
  cluster_name,
  COUNT(*) as repo_count
FROM repo_clusters
GROUP BY cluster_name
ORDER BY cluster_name;
