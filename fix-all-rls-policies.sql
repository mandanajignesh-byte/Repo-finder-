-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE RLS FIX FOR ALL TABLES
-- This fixes ALL 406 and 409 errors by adding proper anon role permissions
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. USERS TABLE ─────────────────────────────────────────────────────────
-- Drop all existing policies
DROP POLICY IF EXISTS "anon_users_policy" ON users;
DROP POLICY IF EXISTS "anon_insert_users" ON users;
DROP POLICY IF EXISTS "anon_update_users" ON users;
DROP POLICY IF EXISTS "anon_select_users" ON users;
DROP POLICY IF EXISTS "anon_delete_users" ON users;

-- Create comprehensive policies
CREATE POLICY "anon_all_users"
ON users
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ─── 2. USER_PREFERENCES TABLE ──────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_user_preferences_policy" ON user_preferences;
DROP POLICY IF EXISTS "anon_insert_user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "anon_update_user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "anon_select_user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "anon_delete_user_preferences" ON user_preferences;

CREATE POLICY "anon_all_user_preferences"
ON user_preferences
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ─── 3. USER_INTERACTIONS TABLE ─────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_user_interactions_policy" ON user_interactions;
DROP POLICY IF EXISTS "anon_insert_user_interactions" ON user_interactions;
DROP POLICY IF EXISTS "anon_update_user_interactions" ON user_interactions;
DROP POLICY IF EXISTS "anon_select_user_interactions" ON user_interactions;
DROP POLICY IF EXISTS "anon_delete_user_interactions" ON user_interactions;

CREATE POLICY "anon_all_user_interactions"
ON user_interactions
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ─── 4. GITHUB_CONNECTIONS TABLE ────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_github_connections_policy" ON github_connections;
DROP POLICY IF EXISTS "anon_insert_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_update_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_select_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_delete_github_connections" ON github_connections;

CREATE POLICY "anon_all_github_connections"
ON github_connections
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ─── 5. GITHUB_STARRED_REPOS TABLE ──────────────────────────────────────────
DROP POLICY IF EXISTS "anon_github_starred_repos_policy" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_insert_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_update_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_select_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_delete_github_starred_repos" ON github_starred_repos;

CREATE POLICY "anon_all_github_starred_repos"
ON github_starred_repos
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ─── 6. SAVED_REPOS TABLE ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_saved_repos_policy" ON saved_repos;
DROP POLICY IF EXISTS "anon_insert_saved_repos" ON saved_repos;
DROP POLICY IF EXISTS "anon_update_saved_repos" ON saved_repos;
DROP POLICY IF EXISTS "anon_select_saved_repos" ON saved_repos;
DROP POLICY IF EXISTS "anon_delete_saved_repos" ON saved_repos;

CREATE POLICY "anon_all_saved_repos"
ON saved_repos
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ─── 7. LIKED_REPOS TABLE ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_liked_repos_policy" ON liked_repos;
DROP POLICY IF EXISTS "anon_insert_liked_repos" ON liked_repos;
DROP POLICY IF EXISTS "anon_update_liked_repos" ON liked_repos;
DROP POLICY IF EXISTS "anon_select_liked_repos" ON liked_repos;
DROP POLICY IF EXISTS "anon_delete_liked_repos" ON liked_repos;

CREATE POLICY "anon_all_liked_repos"
ON liked_repos
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ─── 8. VERIFY ALL POLICIES WERE CREATED ────────────────────────────────────
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN (
  'users',
  'user_preferences',
  'user_interactions',
  'github_connections',
  'github_starred_repos',
  'saved_repos',
  'liked_repos'
)
ORDER BY tablename, policyname;

-- ─── 9. CHECK RLS IS ENABLED ─────────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN (
  'users',
  'user_preferences',
  'user_interactions',
  'github_connections',
  'github_starred_repos',
  'saved_repos',
  'liked_repos'
)
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCTIONS:
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Copy this ENTIRE script
-- 2. Go to Supabase Dashboard → SQL Editor → New Query
-- 3. Paste and click "Run"
-- 4. Check the output at the bottom - you should see policies created
-- 5. Hard refresh your app (Ctrl+Shift+R)
-- 6. Check console - the 406 errors should be GONE
-- ═══════════════════════════════════════════════════════════════════════════
