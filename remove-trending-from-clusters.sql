-- ═══════════════════════════════════════════════════════════════════════════
-- REMOVE TRENDING REPOS FROM REPO_CLUSTERS TABLE
-- Trending repos should be in their own table, not mixed with curated clusters
-- ═══════════════════════════════════════════════════════════════════════════

-- First, check how many trending repos will be deleted
SELECT 
  cluster_name,
  COUNT(*) as repo_count
FROM repo_clusters
WHERE cluster_name LIKE 'trending-%'
GROUP BY cluster_name;

-- Now DELETE all trending repos from repo_clusters
DELETE FROM repo_clusters
WHERE cluster_name LIKE 'trending-%';

-- Verify they're gone
SELECT 
  cluster_name,
  COUNT(*) as repo_count
FROM repo_clusters
GROUP BY cluster_name
ORDER BY repo_count DESC;
