-- ONE SIMPLE QUERY TO GET ALL THE DATA WE NEED

-- Get cluster names and counts
SELECT 
  cluster_name,
  COUNT(*) as repo_count
FROM repo_clusters
GROUP BY cluster_name
ORDER BY repo_count DESC;
