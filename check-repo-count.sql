-- Check how many repos are in each table
-- Run this in Supabase SQL Editor to see if tables are populated

SELECT 'repo_clusters' as table_name, COUNT(*) as repo_count FROM repo_clusters
UNION ALL
SELECT 'repos_master' as table_name, COUNT(*) as repo_count FROM repos_master
UNION ALL
SELECT 'repo_cluster_new' as table_name, COUNT(*) as repo_count FROM repo_cluster_new
UNION ALL
SELECT 'cluster_metadata' as table_name, COUNT(*) as repo_count FROM cluster_metadata;

-- Check repos per cluster
SELECT 
  cluster_name,
  COUNT(*) as repo_count
FROM repo_clusters
GROUP BY cluster_name
ORDER BY repo_count DESC;

-- Check if repos_master has data
SELECT COUNT(*) as total_repos FROM repos_master;
SELECT COUNT(*) as repos_with_health FROM repos_master 
WHERE EXISTS (
  SELECT 1 FROM repo_health WHERE repo_health.repo_id = repos_master.repo_id
);
