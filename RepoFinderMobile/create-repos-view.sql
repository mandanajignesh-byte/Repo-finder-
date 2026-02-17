-- ============================================
-- Create repos View for App Compatibility
-- This view combines repos_master with cluster and enrichment data
-- to match what the Flutter app expects
-- ============================================

-- Drop view if exists
DROP VIEW IF EXISTS repos CASCADE;

-- Create view that matches app expectations
CREATE VIEW repos AS
SELECT 
  -- Identity
  r.repo_id::text as id,
  r.repo_id as github_id,
  r.name,
  r.full_name,
  r.description,
  r.owner_login,
  r.avatar_url,
  r.html_url as repo_url,
  NULL as homepage_url,
  
  -- Stats
  r.stars,
  r.forks,
  r.watchers,
  r.open_issues as open_issues,
  r.language,
  r.topics,
  r.license,
  
  -- Dates
  r.created_at,
  r.updated_at,
  r.pushed_at,
  
  -- Cluster (primary cluster from repo_cluster_new)
  COALESCE(
    (SELECT cluster_slug 
     FROM repo_cluster_new 
     WHERE repo_id = r.repo_id 
     ORDER BY weight DESC, confidence_score DESC 
     LIMIT 1),
    'general'
  ) as cluster,
  
  -- Scores from enrichment tables
  COALESCE(rh.health_score, 0.5) as recommendation_score,
  COALESCE((r.stars::float / NULLIF((SELECT MAX(stars) FROM repos_master), 0)), 0.0) as popularity_score,
  COALESCE(ra.activity_score, 0.5) as activity_score,
  COALESCE(ra.freshness_score, 0.5) as freshness_score,
  COALESCE(rh.health_score, 0.5) as quality_score,
  COALESCE(
    (SELECT trending_score 
     FROM repo_trending_scores 
     WHERE repo_id = r.repo_id 
       AND period_type = 'daily'
       AND period_date = (SELECT MAX(period_date) FROM repo_trending_scores WHERE period_type = 'daily')
     LIMIT 1),
    0.0
  ) as trending_score,
  
  -- Flags
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM repo_trending_scores 
      WHERE repo_id = r.repo_id 
        AND period_type = 'daily'
        AND period_date >= CURRENT_DATE - INTERVAL '1 day'
    ) THEN true 
    ELSE false 
  END as is_trending,
  
  -- README (if you have a readme_content column, add it here)
  NULL as readme_content

FROM repos_master r
LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id
LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id;

-- Create index on the view (via materialized view or indexes on underlying tables)
-- Note: Views can't have indexes, but we can create indexes on the underlying tables

-- Grant permissions
GRANT SELECT ON repos TO anon, authenticated;

-- Verify view
SELECT 
  'repos view created successfully' as status,
  COUNT(*) as total_repos
FROM repos;
