-- ============================================
-- Example: How to populate repo_clusters table
-- ============================================

-- This is an EXAMPLE showing how to insert data
-- You'll need to adapt this based on your actual repo data

-- Example 1: Insert a single repo cluster mapping
INSERT INTO repo_clusters (repo_id, cluster_slug, weight, confidence_score)
VALUES 
  (123456789, 'ai_ml', 0.9, 0.95),
  (123456789, 'automation', 0.6, 0.75)
ON CONFLICT (repo_id, cluster_slug) DO UPDATE
SET 
  weight = EXCLUDED.weight,
  confidence_score = EXCLUDED.confidence_score;

-- Example 2: Bulk insert from existing repos (if you have repos_master populated)
-- This is a template - adjust based on your classification logic
/*
INSERT INTO repo_clusters (repo_id, cluster_slug, weight, confidence_score)
SELECT 
  r.repo_id,
  CASE 
    WHEN r.language = 'Python' AND r.topics::text LIKE '%machine-learning%' THEN 'ai_ml'
    WHEN r.language = 'JavaScript' THEN 'web_dev'
    WHEN r.language = 'Dart' OR r.language = 'Swift' OR r.language = 'Kotlin' THEN 'mobile'
    WHEN r.topics::text LIKE '%devops%' OR r.topics::text LIKE '%docker%' THEN 'devops'
    WHEN r.topics::text LIKE '%blockchain%' OR r.topics::text LIKE '%web3%' THEN 'blockchain'
    WHEN r.topics::text LIKE '%game%' THEN 'game_dev'
    WHEN r.topics::text LIKE '%database%' THEN 'database'
    ELSE 'open_source'
  END as cluster_slug,
  0.8 as weight,
  0.7 as confidence_score
FROM repos_master r
WHERE r.repo_id NOT IN (SELECT repo_id FROM repo_clusters)
LIMIT 1000;
*/

-- Example 3: Update existing cluster weights
/*
UPDATE repo_clusters
SET weight = 1.0, confidence_score = 0.95
WHERE cluster_slug = 'ai_ml' AND repo_id IN (
  SELECT repo_id FROM repos_master 
  WHERE stars > 1000 AND language = 'Python'
);
*/

-- Example 4: Check what clusters exist
SELECT 
  cluster_slug,
  COUNT(*) as repo_count,
  AVG(weight) as avg_weight,
  AVG(confidence_score) as avg_confidence
FROM repo_clusters
GROUP BY cluster_slug
ORDER BY repo_count DESC;

-- Example 5: Get repos for a specific cluster
SELECT 
  r.repo_id,
  r.name,
  r.full_name,
  r.stars,
  rc.cluster_slug,
  rc.weight,
  rc.confidence_score
FROM repos_master r
JOIN repo_clusters rc ON r.repo_id = rc.repo_id
WHERE rc.cluster_slug = 'ai_ml'
ORDER BY rc.weight DESC, r.stars DESC
LIMIT 20;
