-- ═══════════════════════════════════════════════════════════════════════════
-- FIX RLS POLICIES FOR REPO TABLES
-- This allows anonymous users to READ repository data
-- ═══════════════════════════════════════════════════════════════════════════

-- First, check current policies on repo tables
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN (
  'repo_clusters',
  'cluster_metadata',
  'repos_master',
  'repo_health',
  'repo_activity',
  'repo_badges',
  'badge_definitions',
  'repo_cluster_new',
  'repo_recommendations_feed'
)
ORDER BY tablename, policyname;

-- ─── Add READ policies for anonymous users ────────────────────────────────

-- REPO_CLUSTERS table (main source of repos for first-time users)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'repo_clusters' AND policyname = 'anon_read_repo_clusters'
  ) THEN
    CREATE POLICY anon_read_repo_clusters ON public.repo_clusters 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- CLUSTER_METADATA table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cluster_metadata' AND policyname = 'anon_read_cluster_metadata'
  ) THEN
    CREATE POLICY anon_read_cluster_metadata ON public.cluster_metadata 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- REPOS_MASTER table (new backend like mobile app)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'repos_master' AND policyname = 'anon_read_repos_master'
  ) THEN
    CREATE POLICY anon_read_repos_master ON public.repos_master 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- REPO_HEALTH table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'repo_health' AND policyname = 'anon_read_repo_health'
  ) THEN
    CREATE POLICY anon_read_repo_health ON public.repo_health 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- REPO_ACTIVITY table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'repo_activity' AND policyname = 'anon_read_repo_activity'
  ) THEN
    CREATE POLICY anon_read_repo_activity ON public.repo_activity 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- REPO_BADGES table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'repo_badges' AND policyname = 'anon_read_repo_badges'
  ) THEN
    CREATE POLICY anon_read_repo_badges ON public.repo_badges 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- BADGE_DEFINITIONS table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'badge_definitions' AND policyname = 'anon_read_badge_definitions'
  ) THEN
    CREATE POLICY anon_read_badge_definitions ON public.badge_definitions 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- REPO_CLUSTER_NEW table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'repo_cluster_new' AND policyname = 'anon_read_repo_cluster_new'
  ) THEN
    CREATE POLICY anon_read_repo_cluster_new ON public.repo_cluster_new 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- REPO_RECOMMENDATIONS_FEED table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'repo_recommendations_feed' AND policyname = 'anon_read_repo_recommendations_feed'
  ) THEN
    CREATE POLICY anon_read_repo_recommendations_feed ON public.repo_recommendations_feed 
    FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ─── Verify all policies were created ────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN (
  'repo_clusters',
  'cluster_metadata',
  'repos_master',
  'repo_health',
  'repo_activity',
  'repo_badges',
  'badge_definitions',
  'repo_cluster_new',
  'repo_recommendations_feed'
)
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- 4. You should see policies created for all repo tables
-- 5. Redeploy your Vercel app (or wait for auto-deploy)
-- 6. Hard refresh browser (Ctrl+Shift+R)
-- 7. Repos should now load successfully!
-- ═══════════════════════════════════════════════════════════════════════════
