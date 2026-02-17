-- ============================================
-- Recommendation Engine Queries
-- Optimized feed queries with cursor pagination
-- ============================================

-- 1. Feed by Cluster (Cursor Pagination)
-- Parameters: cluster, min_score, cursor (github_id), limit
SELECT 
  github_id,
  name,
  full_name,
  description,
  owner_login,
  owner_avatar,
  stars,
  forks,
  language,
  topics,
  repo_url,
  pushed_at,
  recommendation_score,
  cluster
FROM repos
WHERE cluster = $1
  AND recommendation_score >= $2
  AND github_id > $3  -- cursor for pagination
ORDER BY recommendation_score DESC, github_id ASC
LIMIT $4;

-- 2. Trending Feed
SELECT 
  github_id,
  name,
  full_name,
  description,
  owner_login,
  owner_avatar,
  stars,
  forks,
  language,
  topics,
  repo_url,
  pushed_at,
  trending_score,
  recommendation_score
FROM repos
WHERE is_trending = true
ORDER BY trending_score DESC, recommendation_score DESC
LIMIT 50;

-- 3. Featured Feed
SELECT 
  github_id,
  name,
  full_name,
  description,
  owner_login,
  owner_avatar,
  stars,
  forks,
  language,
  topics,
  repo_url,
  pushed_at,
  recommendation_score
FROM repos
WHERE is_featured = true
ORDER BY recommendation_score DESC
LIMIT 50;

-- 4. Feed by Language
SELECT 
  github_id,
  name,
  full_name,
  description,
  owner_login,
  owner_avatar,
  stars,
  forks,
  language,
  topics,
  repo_url,
  pushed_at,
  recommendation_score
FROM repos
WHERE language = $1
  AND recommendation_score >= $2
  AND github_id > $3
ORDER BY recommendation_score DESC, github_id ASC
LIMIT $4;

-- 5. Feed by Topics (using GIN index)
SELECT 
  github_id,
  name,
  full_name,
  description,
  owner_login,
  owner_avatar,
  stars,
  forks,
  language,
  topics,
  repo_url,
  pushed_at,
  recommendation_score
FROM repos
WHERE topics @> ARRAY[$1]::text[]
  AND recommendation_score >= $2
  AND github_id > $3
ORDER BY recommendation_score DESC, github_id ASC
LIMIT $4;

-- 6. High Quality Repos (Quality Score)
SELECT 
  github_id,
  name,
  full_name,
  description,
  owner_login,
  owner_avatar,
  stars,
  forks,
  language,
  topics,
  repo_url,
  pushed_at,
  quality_score,
  recommendation_score
FROM repos
WHERE quality_score >= 70
  AND recommendation_score >= 60
ORDER BY quality_score DESC, recommendation_score DESC
LIMIT 50;

-- 7. Fresh Repos (Recently Updated)
SELECT 
  github_id,
  name,
  full_name,
  description,
  owner_login,
  owner_avatar,
  stars,
  forks,
  language,
  topics,
  repo_url,
  pushed_at,
  freshness_score,
  recommendation_score
FROM repos
WHERE pushed_at > NOW() - INTERVAL '30 days'
  AND recommendation_score >= 50
ORDER BY pushed_at DESC, recommendation_score DESC
LIMIT 50;

-- 8. Popular Repos (Stars)
SELECT 
  github_id,
  name,
  full_name,
  description,
  owner_login,
  owner_avatar,
  stars,
  forks,
  language,
  topics,
  repo_url,
  pushed_at,
  popularity_score,
  recommendation_score
FROM repos
WHERE stars >= 1000
  AND recommendation_score >= 60
ORDER BY stars DESC, recommendation_score DESC
LIMIT 50;
