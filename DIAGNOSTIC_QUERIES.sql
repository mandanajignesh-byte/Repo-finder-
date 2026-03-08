-- ════════════════════════════════════════════════════════════════════════════
-- Diagnostic Queries - Find out why get_scored_repos returns 0 rows
-- ════════════════════════════════════════════════════════════════════════════
-- Run these queries ONE BY ONE to find the issue
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 1: Check if repo_clusters table has data
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  cluster_name, 
  COUNT(*) as repo_count 
FROM repo_clusters 
GROUP BY cluster_name 
ORDER BY repo_count DESC;

-- Expected: You should see cluster names with counts
-- If this returns 0 rows → Your repo_clusters table is empty!


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 2: Check what clusters exist
-- ────────────────────────────────────────────────────────────────────────────
SELECT DISTINCT cluster_name 
FROM repo_clusters 
LIMIT 20;

-- Expected: List of cluster names like 'trending-daily-desktop', etc.
-- If you don't see 'trending-daily-desktop' → That's why the query failed!


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 3: Check repo_data structure in repo_clusters
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  cluster_name,
  repo_data->>'id' as repo_id,
  repo_data->>'name' as repo_name,
  repo_data->>'stars' as stars_text,
  (repo_data->>'stars')::INTEGER as stars_int,
  jsonb_typeof(repo_data) as data_type
FROM repo_clusters 
LIMIT 5;

-- Expected: Should show repo IDs, names, and star counts
-- Check if 'id' and 'stars' fields exist in repo_data


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 4: Check stars range in your data
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  MIN((repo_data->>'stars')::INTEGER) as min_stars,
  MAX((repo_data->>'stars')::INTEGER) as max_stars,
  AVG((repo_data->>'stars')::INTEGER) as avg_stars,
  COUNT(*) as total_repos
FROM repo_clusters 
WHERE repo_data->>'stars' IS NOT NULL;

-- Expected: Shows the star range in your database
-- If min_stars > 50 or max_stars < 50 → Your filter might be excluding everything!


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 5: Try a simpler query without filters
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  (repo_data->>'id')::BIGINT as id,
  repo_data->>'name' as name,
  repo_data->>'full_name' as full_name,
  (repo_data->>'stars')::INTEGER as stars
FROM repo_clusters 
WHERE cluster_name = 'trending-daily-desktop'
LIMIT 5;

-- Expected: Should return 5 repos from that cluster
-- If this returns 0 → The cluster name doesn't exist or has no data


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 6: Find which cluster has the most repos
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  cluster_name,
  COUNT(*) as repo_count,
  MIN((repo_data->>'stars')::INTEGER) as min_stars,
  MAX((repo_data->>'stars')::INTEGER) as max_stars
FROM repo_clusters 
WHERE repo_data->>'stars' IS NOT NULL
GROUP BY cluster_name 
ORDER BY repo_count DESC 
LIMIT 10;

-- Expected: Shows top 10 clusters with their repo counts and star ranges
-- Use one of these cluster names in your get_scored_repos() call


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 7: Test get_scored_repos with NO filters (wide open)
-- ────────────────────────────────────────────────────────────────────────────
-- Replace 'YOUR_CLUSTER_NAME' with a cluster from Query 6

SELECT * FROM get_scored_repos(
  'test_user',
  'YOUR_CLUSTER_NAME_HERE',  -- ← PUT ACTUAL CLUSTER NAME HERE
  ARRAY[]::BIGINT[],
  10,
  0,        -- Min stars = 0 (accept all)
  999999    -- Max stars = very high (accept all)
);

-- Expected: Should return 10 repos if the cluster has data
-- If this still returns 0 → Check the function itself


-- ════════════════════════════════════════════════════════════════════════════
-- QUICK DIAGNOSIS CHECKLIST
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- ❌ Query 1 returns 0 rows → repo_clusters table is EMPTY
--    → You need to populate repo_clusters with data first!
-- 
-- ❌ Query 2 doesn't show 'trending-daily-desktop' → Wrong cluster name
--    → Use a cluster name that actually exists from Query 2 or 6
-- 
-- ❌ Query 3 shows NULL for 'id' or 'stars' → Wrong JSONB structure
--    → Your repo_data format doesn't match what the function expects
-- 
-- ❌ Query 4 shows stars outside 50-100000 range → Filter too restrictive
--    → Adjust min_stars and max_stars in your function call
-- 
-- ❌ Query 5 returns data BUT get_scored_repos doesn't → Function issue
--    → Check the WHERE clause in the function
-- 
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- BONUS: Insert sample data if repo_clusters is empty
-- ────────────────────────────────────────────────────────────────────────────
-- ONLY RUN THIS IF Query 1 returned 0 rows!

/*
INSERT INTO repo_clusters (cluster_name, repo_data, tags, quality_score) VALUES
('trending-daily-desktop', 
 '{"id": "123456789", "name": "sample-repo", "full_name": "owner/sample-repo", "description": "A sample repository", "stars": 1500, "forks": 200, "language": "JavaScript", "topics": ["react", "nodejs"], "url": "https://github.com/owner/sample-repo", "owner_avatar": "https://avatars.githubusercontent.com/u/123456", "pushed_at": "2024-01-01T00:00:00Z"}'::jsonb,
 ARRAY['javascript', 'react', 'nodejs'],
 75.5
);

-- Verify it was inserted:
SELECT * FROM repo_clusters WHERE cluster_name = 'trending-daily-desktop';
*/
