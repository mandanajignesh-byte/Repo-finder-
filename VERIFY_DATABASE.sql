-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES - Run these to check your database setup
-- ════════════════════════════════════════════════════════════════════════════
-- Run these queries ONE BY ONE and share the results with me
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 1: Check if user_preferences table exists and its structure
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Expected: Should show columns like user_id (text), primary_cluster, tech_stack, etc.
-- If this returns 0 rows → user_preferences table doesn't exist!


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 2: Check for foreign key constraints on user_preferences
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_preferences';

-- Expected: 0 rows (no foreign keys after fix)
-- If you see a row with foreign_table_name = 'users' → Foreign key still exists!


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 3: Check RLS policies on user_preferences
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_preferences';

-- Expected: Should show policies that allow 'anon_%' users


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 4: Test if you can insert an anonymous user preference
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO user_preferences 
  (user_id, primary_cluster, onboarding_completed) 
VALUES 
  ('anon_test_12345', 'ai-ml', true)
ON CONFLICT (user_id) DO UPDATE 
SET primary_cluster = EXCLUDED.primary_cluster;

-- Expected: Success (1 row inserted or updated)
-- If error → RLS policy issue or foreign key constraint


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 5: Verify the test insert worked
-- ────────────────────────────────────────────────────────────────────────────
SELECT * FROM user_preferences WHERE user_id = 'anon_test_12345';

-- Expected: 1 row with anon_test_12345


-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 6: Clean up test data
-- ────────────────────────────────────────────────────────────────────────────
DELETE FROM user_preferences WHERE user_id = 'anon_test_12345';


-- ════════════════════════════════════════════════════════════════════════════
-- SHARE RESULTS
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- Please run queries 1-5 and share:
-- 1. Screenshot or text of QUERY 1 results (table structure)
-- 2. Screenshot or text of QUERY 2 results (foreign keys)
-- 3. Result of QUERY 4 (Success or Error?)
-- 
-- This will tell me exactly what's wrong!
-- ════════════════════════════════════════════════════════════════════════════
