-- Check available clusters and repo counts
SELECT 
  cluster,
  COUNT(*) as repo_count,
  AVG(recommendation_score) as avg_score,
  MIN(stars) as min_stars,
  MAX(stars) as max_stars,
  AVG(stars) as avg_stars
FROM repos
WHERE cluster IS NOT NULL
GROUP BY cluster
ORDER BY repo_count DESC;
