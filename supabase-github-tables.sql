-- ═══════════════════════════════════════════════════════════════════════════
-- GITHUB OAUTH TABLES - Create github_connections & github_starred_repos
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. github_connections ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS github_connections (
  user_id              TEXT        PRIMARY KEY,
  github_id            BIGINT      NOT NULL,
  github_login         TEXT        NOT NULL,
  github_name          TEXT,
  github_avatar_url    TEXT,
  github_access_token  TEXT        NOT NULL,
  starred_repos_count  INTEGER     DEFAULT 0,
  connected_at         TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at       TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. github_starred_repos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS github_starred_repos (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT        NOT NULL,
  repo_id                 TEXT        NOT NULL,
  repo_full_name          TEXT        NOT NULL,
  repo_name               TEXT,
  repo_description        TEXT,
  repo_stars              INTEGER     DEFAULT 0,
  repo_forks              INTEGER     DEFAULT 0,
  repo_language           TEXT,
  repo_url                TEXT,
  repo_owner_login        TEXT,
  repo_owner_avatar_url   TEXT,
  repo_topics             TEXT[]      DEFAULT '{}',
  starred_at              TIMESTAMPTZ,
  synced_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, repo_id)
);

-- ─── 3. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_github_connections_github_login
  ON github_connections(github_login);

CREATE INDEX IF NOT EXISTS idx_github_starred_repos_user_id
  ON github_starred_repos(user_id);

CREATE INDEX IF NOT EXISTS idx_github_starred_repos_starred_at
  ON github_starred_repos(user_id, starred_at DESC);

CREATE INDEX IF NOT EXISTS idx_github_starred_repos_stars
  ON github_starred_repos(user_id, repo_stars DESC);

-- ─── 4. Enable RLS ──────────────────────────────────────────────────────────
ALTER TABLE github_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_starred_repos ENABLE ROW LEVEL SECURITY;

-- ─── 5. RLS policies — allow anon role (app uses custom user IDs) ───────────

-- Drop any old policies first to avoid conflicts
DROP POLICY IF EXISTS "anon_all_github_connections"   ON github_connections;
DROP POLICY IF EXISTS "anon_insert_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_update_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_select_github_connections" ON github_connections;
DROP POLICY IF EXISTS "anon_delete_github_connections" ON github_connections;

DROP POLICY IF EXISTS "anon_all_github_starred_repos"   ON github_starred_repos;
DROP POLICY IF EXISTS "anon_insert_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_update_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_select_github_starred_repos" ON github_starred_repos;
DROP POLICY IF EXISTS "anon_delete_github_starred_repos" ON github_starred_repos;

-- Create permissive policies for anon role (normal app usage after sign-out)
CREATE POLICY "anon_all_github_connections"
  ON github_connections FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_github_starred_repos"
  ON github_starred_repos FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Create permissive policies for authenticated role (during OAuth callback before sign-out)
DROP POLICY IF EXISTS "auth_all_github_connections"   ON github_connections;
DROP POLICY IF EXISTS "auth_all_github_starred_repos" ON github_starred_repos;

CREATE POLICY "auth_all_github_connections"
  ON github_connections FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_github_starred_repos"
  ON github_starred_repos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── 6. Verify ──────────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('github_connections', 'github_starred_repos')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- After running:
-- 1. Both tables should appear in your Supabase Table Editor
-- 2. Four policies should be listed above (2 per table)
-- 3. Try connecting GitHub again in the app
-- ═══════════════════════════════════════════════════════════════════════════
