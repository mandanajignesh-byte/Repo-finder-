-- ═══════════════════════════════════════════════════════════════════════════
-- ADD MISSING RLS POLICIES - FINAL FIX
-- Run this after confirming RLS is enabled
-- ═══════════════════════════════════════════════════════════════════════════

-- First, let's see what policies currently exist
SELECT 
  schemaname,
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

-- ─── Now add the policies (using IF NOT EXISTS pattern) ─────────────────────

-- USERS table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'anon_all_users'
  ) THEN
    CREATE POLICY anon_all_users ON public.users FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- USER_PREFERENCES table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' AND policyname = 'anon_all_user_preferences'
  ) THEN
    CREATE POLICY anon_all_user_preferences ON public.user_preferences FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- USER_INTERACTIONS table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_interactions' AND policyname = 'anon_all_user_interactions'
  ) THEN
    CREATE POLICY anon_all_user_interactions ON public.user_interactions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- GITHUB_CONNECTIONS table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'github_connections' AND policyname = 'anon_all_github_connections'
  ) THEN
    CREATE POLICY anon_all_github_connections ON public.github_connections FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- GITHUB_STARRED_REPOS table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'github_starred_repos' AND policyname = 'anon_all_github_starred_repos'
  ) THEN
    CREATE POLICY anon_all_github_starred_repos ON public.github_starred_repos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- SAVED_REPOS table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'saved_repos' AND policyname = 'anon_all_saved_repos'
  ) THEN
    CREATE POLICY anon_all_saved_repos ON public.saved_repos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- LIKED_REPOS table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'liked_repos' AND policyname = 'anon_all_liked_repos'
  ) THEN
    CREATE POLICY anon_all_liked_repos ON public.liked_repos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── Verify all policies were created ────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
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

-- ═══════════════════════════════════════════════════════════════════════════
-- After running this:
-- 1. You should see policies listed for each table
-- 2. Hard refresh your app (Ctrl+Shift+R)
-- 3. The 406 errors should be GONE
-- ═══════════════════════════════════════════════════════════════════════════
