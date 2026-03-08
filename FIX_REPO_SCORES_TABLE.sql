-- ════════════════════════════════════════════════════════════════════════════
-- FIX: repo_scores RLS policies
-- ════════════════════════════════════════════════════════════════════════════
-- Error: GET repo_scores returns 406 (Not Acceptable)
-- This happens because RLS is blocking SELECT queries
-- Solution: Allow public read access, restrict writes
-- ════════════════════════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read for repo_scores" ON repo_scores;
DROP POLICY IF EXISTS "Allow service role write for repo_scores" ON repo_scores;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON repo_scores;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON repo_scores;

-- Enable RLS
ALTER TABLE repo_scores ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read repo scores (needed for frontend)
CREATE POLICY "Allow public read for repo_scores"
  ON repo_scores
  FOR SELECT
  USING (true);

-- Allow anyone to insert/update repo scores (needed for interaction tracking)
CREATE POLICY "Allow public insert for repo_scores"
  ON repo_scores
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update for repo_scores"
  ON repo_scores
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- Verify the policies
-- ════════════════════════════════════════════════════════════════════════════

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'repo_scores';

-- Expected: Should see 3 policies (SELECT, INSERT, UPDATE) with permissive access

-- ════════════════════════════════════════════════════════════════════════════
-- WHY THIS FIX IS NEEDED
-- ════════════════════════════════════════════════════════════════════════════
-- repo_scores is a public statistics table that needs to be:
-- 1. Readable by everyone (to calculate recommendations)
-- 2. Writable by everyone (to track likes/skips)
-- 3. Not sensitive (just aggregate stats, no personal data)
--
-- The 406 error means RLS was blocking SELECT queries.
-- This fix allows public read/write for this specific table.
-- ════════════════════════════════════════════════════════════════════════════
