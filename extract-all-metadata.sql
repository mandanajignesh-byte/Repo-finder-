-- ═══════════════════════════════════════════════════════════════════════════
-- EXTRACT ALL METADATA FROM REPO TABLES
-- This will show us what categories, clusters, tags, languages, etc. exist
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Get all clusters from cluster_metadata
SELECT 
  cluster_name,
  display_name,
  description,
  repo_count,
  is_active
FROM cluster_metadata
ORDER BY repo_count DESC;

-- 2. Get all unique cluster names from repo_clusters
SELECT 
  cluster_name,
  COUNT(*) as repo_count
FROM repo_clusters
GROUP BY cluster_name
ORDER BY repo_count DESC;

-- 3. Get all unique cluster slugs from repo_cluster_new
SELECT 
  cluster_slug,
  COUNT(DISTINCT repo_id) as repo_count
FROM repo_cluster_new
GROUP BY cluster_slug
ORDER BY repo_count DESC;

-- 4. Get top languages from repos_master
SELECT 
  language,
  COUNT(*) as repo_count
FROM repos_master
WHERE language IS NOT NULL
GROUP BY language
ORDER BY repo_count DESC
LIMIT 30;

-- 5. Get all unique topics/tags from repo_clusters
SELECT 
  DISTINCT unnest(tags) as tag,
  COUNT(*) as usage_count
FROM repo_clusters
WHERE tags IS NOT NULL
GROUP BY tag
ORDER BY usage_count DESC
LIMIT 50;

-- 6. Get top topics from repos_master
SELECT 
  DISTINCT unnest(topics) as topic,
  COUNT(*) as usage_count
FROM repos_master
WHERE topics IS NOT NULL AND array_length(topics, 1) > 0
GROUP BY topic
ORDER BY usage_count DESC
LIMIT 50;

-- 7. Get all badge types from badge_definitions
SELECT 
  slug,
  name,
  description,
  icon,
  color
FROM badge_definitions
ORDER BY name;

-- 8. Sample repos from each cluster to understand categorization
SELECT 
  cluster_name,
  (repo_data->>'name') as repo_name,
  (repo_data->>'language') as language,
  (repo_data->>'stars')::int as stars,
  tags
FROM repo_clusters
WHERE cluster_name IN (
  SELECT DISTINCT cluster_name 
  FROM repo_clusters 
  LIMIT 10
)
ORDER BY cluster_name, (repo_data->>'stars')::int DESC
LIMIT 100;
