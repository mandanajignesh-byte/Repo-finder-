-- ═══════════════════════════════════════════════════════════════════════════
-- DEBUG & FIX GITHUB OAUTH ISSUE
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this script in Supabase SQL Editor to diagnose and fix the issue

-- ─── 1. Check if github_connections table exists ───────────────────────────
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_name = 'github_connections';

-- ─── 2. Check table structure ──────────────────────────────────────────────
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'github_connections'
ORDER BY ordinal_position;

-- ─── 3. Check existing data ────────────────────────────────────────────────
SELECT 
  user_id,
  github_id,
  github_login,
  github_name,
  starred_repos_count,
  connected_at,
  last_synced_at,
  updated_at
FROM github_connections
ORDER BY updated_at DESC
LIMIT 10;

-- ─── 4. Check RLS status ───────────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'github_connections';

-- ─── 5. Check existing RLS policies ────────────────────────────────────────
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
WHERE tablename = 'github_connections';

-- ─── 6. Drop existing policies (if any) ────────────────────────────────────
DROP POLICY IF EXISTS "anon_insert_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_update_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_select_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_delete_github_connections" ON github_connections;

-- ─── 7. Create permissive RLS policies for anon role ───────────────────────
-- These policies allow the anon (unauthenticated) role to perform all operations
-- since we're using custom localStorage-based user IDs, not Supabase Auth

CREATE POLICY "anon_insert_github_connections"
ON github_connections
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "anon_update_github_connections"
ON github_connections
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "anon_select_github_connections"
ON github_connections
FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_delete_github_connections"
ON github_connections
FOR DELETE
TO anon
USING (true);

-- ─── 8. Same for github_starred_repos ──────────────────────────────────────
DROP POLICY IF EXISTS "anon_insert_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_update_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_select_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_delete_github_starred_repos" ON github_starred_repos;

CREATE POLICY "anon_insert_github_starred_repos"
ON github_starred_repos
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "anon_update_github_starred_repos"
ON github_starred_repos
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "anon_select_github_starred_repos"
ON github_starred_repos
FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_delete_github_starred_repos"
ON github_starred_repos
FOR DELETE
TO anon
USING (true);

-- ─── 9. Verify policies were created ───────────────────────────────────────
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('github_connections', 'github_starred_repos')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCTIONS:
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run the script
-- 4. Check the output to see if policies were created successfully
-- 5. Try connecting GitHub again in the app
-- 6. Check browser console for the blue 🔵 debug logs
-- 7. Report back what you see in the console
-- ═══════════════════════════════════════════════════════════════════════════
