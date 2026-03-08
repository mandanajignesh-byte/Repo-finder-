-- ════════════════════════════════════════════════════════════════════════════
-- 🔥 COMPLETE FIX FOR repo_scores 406 ERRORS
-- ════════════════════════════════════════════════════════════════════════════
-- The 406 errors mean RLS is still blocking access
-- This script will completely reset RLS policies
-- ════════════════════════════════════════════════════════════════════════════

-- Step 1: DISABLE RLS temporarily to clean up
ALTER TABLE repo_scores DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (in case there are conflicts)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'repo_scores'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON repo_scores', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE repo_scores ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, permissive policies
CREATE POLICY "repo_scores_select_all"
  ON repo_scores
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "repo_scores_insert_all"
  ON repo_scores
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "repo_scores_update_all"
  ON repo_scores
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- Verify policies are created
-- ════════════════════════════════════════════════════════════════════════════

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
WHERE tablename = 'repo_scores'
ORDER BY policyname;

-- Expected: 3 policies (SELECT, INSERT, UPDATE) with roles = {public}

-- ════════════════════════════════════════════════════════════════════════════
-- Test if we can query repo_scores now
-- ════════════════════════════════════════════════════════════════════════════

SELECT 
  repo_id,
  total_likes,
  total_skips,
  like_rate
FROM repo_scores
LIMIT 5;

-- Expected: Should return results without 406 error
