-- ════════════════════════════════════════════════════════════════════════════
-- ✅ CORRECT TEST QUERIES - Using Your Actual Cluster Names
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- Test 1: Get repos from 'ai-ml' cluster (largest cluster - 2115 repos)
-- ────────────────────────────────────────────────────────────────────────────
SELECT * FROM get_scored_repos(
  'test_user',
  'ai-ml',              -- ✅ This cluster exists!
  ARRAY[]::BIGINT[],
  10,
  0,                    -- Min stars = 0 (accept all)
  999999                -- Max stars = very high
);

-- Expected: Should return 10 AI/ML repositories


-- ────────────────────────────────────────────────────────────────────────────
-- Test 2: Get repos from 'frontend' cluster (2007 repos)
-- ────────────────────────────────────────────────────────────────────────────
SELECT * FROM get_scored_repos(
  'test_user',
  'frontend',           -- ✅ This cluster exists!
  ARRAY[]::BIGINT[],
  10,
  0,
  999999
);

-- Expected: Should return 10 frontend repositories


-- ────────────────────────────────────────────────────────────────────────────
-- Test 3: Get repos from 'backend' cluster (1902 repos)
-- ────────────────────────────────────────────────────────────────────────────
SELECT * FROM get_scored_repos(
  'test_user',
  'backend',            -- ✅ This cluster exists!
  ARRAY[]::BIGINT[],
  10,
  0,
  999999
);

-- Expected: Should return 10 backend repositories


-- ────────────────────────────────────────────────────────────────────────────
-- Test 4: Get repos from 'data-science' cluster (1872 repos)
-- ────────────────────────────────────────────────────────────────────────────
SELECT * FROM get_scored_repos(
  'test_user',
  'data-science',       -- ✅ This cluster exists!
  ARRAY[]::BIGINT[],
  10,
  0,
  999999
);


-- ════════════════════════════════════════════════════════════════════════════
-- YOUR AVAILABLE CLUSTERS:
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- ✅ ai-ml                    (2115 repos) - AI/ML repositories
-- ✅ frontend                 (2007 repos) - Frontend development
-- ✅ devops                   (1981 repos) - DevOps tools
-- ✅ mobile                   (1950 repos) - Mobile development
-- ✅ game-dev                 (1934 repos) - Game development
-- ✅ backend                  (1902 repos) - Backend development
-- ✅ data-science             (1872 repos) - Data science
-- ✅ desktop                  (1826 repos) - Desktop apps
-- ✅ open-source-alternatives (300 repos)  - OSS alternatives
-- ✅ ai-automation            (300 repos)  - AI automation
-- 
-- ❌ trending-daily-desktop   (DOES NOT EXIST)
-- 
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- Check sample data structure from ai-ml cluster
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  repo_data->>'id' as id,
  repo_data->>'name' as name,
  repo_data->>'full_name' as full_name,
  (repo_data->>'stars')::INTEGER as stars,
  repo_data->>'language' as language,
  tags,
  quality_score
FROM repo_clusters 
WHERE cluster_name = 'ai-ml'
LIMIT 5;

-- This shows you the actual data structure
