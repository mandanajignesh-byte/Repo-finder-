-- ════════════════════════════════════════════════════════════════════════════
-- COMPLETE FIX - Run this ENTIRE script to fix all issues
-- ════════════════════════════════════════════════════════════════════════════
-- This will completely rebuild tables without foreign keys and with proper RLS
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- Step 1: Drop and recreate user_preferences (no foreign keys!)
-- ────────────────────────────────────────────────────────────────────────────

-- Drop existing table and all dependencies
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Create fresh table
CREATE TABLE user_preferences (
  user_id              TEXT PRIMARY KEY,
  primary_cluster      TEXT,
  tech_stack           TEXT[] DEFAULT '{}',
  goals                TEXT[] DEFAULT '{}',
  interests            TEXT[] DEFAULT '{}',
  experience_level     TEXT DEFAULT 'intermediate',
  name                 TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_cluster ON user_preferences(primary_cluster);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for anonymous users
CREATE POLICY "Allow all for anonymous users"
  ON user_preferences
  FOR ALL
  USING (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id)
  WITH CHECK (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Step 2: Ensure user_interactions table is set up correctly
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_interactions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  repo_id    BIGINT NOT NULL,
  action     TEXT NOT NULL,
  timestamp  TIMESTAMPTZ DEFAULT NOW(),
  metadata   JSONB DEFAULT '{}'
);

-- Remove any foreign key constraints
DO $$ 
BEGIN
  ALTER TABLE user_interactions DROP CONSTRAINT IF EXISTS user_interactions_user_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_repo ON user_interactions(repo_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_action ON user_interactions(action);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp);

-- Enable RLS
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON user_interactions;

-- Create new policies
CREATE POLICY "Allow all for anonymous users interactions"
  ON user_interactions
  FOR ALL
  USING (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id)
  WITH CHECK (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Step 3: Fix liked_repos table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS liked_repos (
  user_id           TEXT NOT NULL,
  repo_id           BIGINT NOT NULL,
  repo_name         TEXT,
  repo_full_name    TEXT,
  repo_description  TEXT,
  repo_stars        INTEGER,
  repo_language     TEXT,
  repo_url          TEXT,
  repo_tags         TEXT[],
  repo_topics       TEXT[],
  liked_at          TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, repo_id)
);

-- Remove foreign key
DO $$ 
BEGIN
  ALTER TABLE liked_repos DROP CONSTRAINT IF EXISTS liked_repos_user_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_liked_repos_user ON liked_repos(user_id);

-- RLS
ALTER TABLE liked_repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own liked repos" ON liked_repos;
DROP POLICY IF EXISTS "Users can manage own liked repos" ON liked_repos;

CREATE POLICY "Allow all for anonymous users liked"
  ON liked_repos
  FOR ALL
  USING (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id)
  WITH CHECK (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Step 4: Fix saved_repos table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_repos (
  user_id           TEXT NOT NULL,
  repo_id           BIGINT NOT NULL,
  repo_name         TEXT,
  repo_full_name    TEXT,
  repo_description  TEXT,
  repo_stars        INTEGER,
  repo_language     TEXT,
  repo_url          TEXT,
  repo_tags         TEXT[],
  repo_topics       TEXT[],
  saved_at          TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, repo_id)
);

-- Remove foreign key
DO $$ 
BEGIN
  ALTER TABLE saved_repos DROP CONSTRAINT IF EXISTS saved_repos_user_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_saved_repos_user ON saved_repos(user_id);

-- RLS
ALTER TABLE saved_repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved repos" ON saved_repos;
DROP POLICY IF EXISTS "Users can manage own saved repos" ON saved_repos;

CREATE POLICY "Allow all for anonymous users saved"
  ON saved_repos
  FOR ALL
  USING (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id)
  WITH CHECK (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Step 5: TEST - Insert a test anonymous user preference
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO user_preferences 
  (user_id, primary_cluster, tech_stack, onboarding_completed) 
VALUES 
  ('anon_test_verification', 'ai-ml', ARRAY['javascript', 'react'], true)
ON CONFLICT (user_id) DO UPDATE 
SET 
  primary_cluster = EXCLUDED.primary_cluster,
  tech_stack = EXCLUDED.tech_stack,
  updated_at = NOW();

-- Verify it worked
SELECT * FROM user_preferences WHERE user_id = 'anon_test_verification';

-- Clean up
DELETE FROM user_preferences WHERE user_id = 'anon_test_verification';

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ DONE!
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- If the test insert/select/delete worked, you're all set!
-- Now refresh your app at http://localhost:5173/
-- 
-- ════════════════════════════════════════════════════════════════════════════
