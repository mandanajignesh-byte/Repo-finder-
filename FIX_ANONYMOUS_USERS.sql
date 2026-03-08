-- ════════════════════════════════════════════════════════════════════════════
-- FIX: Allow anonymous users in user_preferences table
-- ════════════════════════════════════════════════════════════════════════════
-- Run this to fix the foreign key constraint error
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- Option 1: Drop and recreate user_preferences table without foreign key
-- ────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS user_preferences CASCADE;

CREATE TABLE user_preferences (
  user_id              TEXT PRIMARY KEY,  -- No foreign key! Allows anon users
  primary_cluster      TEXT,
  tech_stack           TEXT[] DEFAULT '{}',
  goals                TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_cluster ON user_preferences(primary_cluster);

-- RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (
    auth.uid()::TEXT = user_id 
    OR user_id LIKE 'anon_%'
  );

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (
    auth.uid()::TEXT = user_id 
    OR user_id LIKE 'anon_%'
  );

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (
    auth.uid()::TEXT = user_id 
    OR user_id LIKE 'anon_%'
  );

DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (
    auth.uid()::TEXT = user_id 
    OR user_id LIKE 'anon_%'
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Also fix user_interactions table (same issue)
-- ────────────────────────────────────────────────────────────────────────────

-- Check if user_interactions exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_interactions') THEN
    -- Drop foreign key constraint if it exists
    ALTER TABLE user_interactions DROP CONSTRAINT IF EXISTS user_interactions_user_id_fkey;
    
    -- Make sure user_id is TEXT
    ALTER TABLE user_interactions ALTER COLUMN user_id TYPE TEXT;
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE user_interactions (
      id         BIGSERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,  -- No foreign key
      repo_id    BIGINT NOT NULL,
      action     TEXT NOT NULL,  -- 'view' | 'like' | 'skip' | 'save' | 'share'
      timestamp  TIMESTAMPTZ DEFAULT NOW(),
      metadata   JSONB DEFAULT '{}'
    );
    
    CREATE INDEX idx_user_interactions_user ON user_interactions(user_id);
    CREATE INDEX idx_user_interactions_repo ON user_interactions(repo_id);
    CREATE INDEX idx_user_interactions_action ON user_interactions(action);
    
    -- RLS
    ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own interactions"
      ON user_interactions FOR SELECT
      USING (auth.uid()::TEXT = user_id OR user_id LIKE 'anon_%');
    
    CREATE POLICY "Users can insert own interactions"
      ON user_interactions FOR INSERT
      WITH CHECK (auth.uid()::TEXT = user_id OR user_id LIKE 'anon_%');
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Fix liked_repos table
-- ────────────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'liked_repos') THEN
    ALTER TABLE liked_repos DROP CONSTRAINT IF EXISTS liked_repos_user_id_fkey;
    ALTER TABLE liked_repos ALTER COLUMN user_id TYPE TEXT;
  ELSE
    CREATE TABLE liked_repos (
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
    
    CREATE INDEX idx_liked_repos_user ON liked_repos(user_id);
    
    ALTER TABLE liked_repos ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own liked repos"
      ON liked_repos FOR SELECT
      USING (auth.uid()::TEXT = user_id OR user_id LIKE 'anon_%');
    
    CREATE POLICY "Users can manage own liked repos"
      ON liked_repos FOR ALL
      USING (auth.uid()::TEXT = user_id OR user_id LIKE 'anon_%');
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Fix saved_repos table
-- ────────────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_repos') THEN
    ALTER TABLE saved_repos DROP CONSTRAINT IF EXISTS saved_repos_user_id_fkey;
    ALTER TABLE saved_repos ALTER COLUMN user_id TYPE TEXT;
  ELSE
    CREATE TABLE saved_repos (
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
    
    CREATE INDEX idx_saved_repos_user ON saved_repos(user_id);
    
    ALTER TABLE saved_repos ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own saved repos"
      ON saved_repos FOR SELECT
      USING (auth.uid()::TEXT = user_id OR user_id LIKE 'anon_%');
    
    CREATE POLICY "Users can manage own saved repos"
      ON saved_repos FOR ALL
      USING (auth.uid()::TEXT = user_id OR user_id LIKE 'anon_%');
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ DONE! Anonymous users can now use the system
-- ════════════════════════════════════════════════════════════════════════════
