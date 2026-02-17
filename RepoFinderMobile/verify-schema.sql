-- ============================================
-- Verify Schema Creation
-- Run this AFTER creating tables to check what exists
-- ============================================

-- 1. Check which tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_name = t.table_name 
   AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'repos_master',
    'repo_clusters',
    'repo_tech_stack',
    'repo_complexity',
    'repo_health',
    'badge_definitions',
    'repo_badges',
    'user_profile',
    'user_interests',
    'user_tech_stack',
    'user_goals',
    'user_preferences',
    'user_vectors',
    'repo_interactions',
    'repo_recommendations',
    'user_current_projects',
    'user_github_data'
  )
ORDER BY table_name;

-- 2. Check if repo_clusters table exists and has cluster_slug column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'repo_clusters'
  AND column_name = 'cluster_slug';

-- 3. Check all columns in repo_clusters (if table exists)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'repo_clusters'
ORDER BY ordinal_position;
