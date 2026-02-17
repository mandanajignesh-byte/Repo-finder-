-- ============================================
-- Create repos_master Table (Fresh Start)
-- This will create the table with exact schema
-- ============================================

-- ============================================
-- STEP 1: Drop Old repos_master Table
-- ============================================
-- WARNING: This will delete ALL existing data in repos_master!
-- It will also drop dependent objects (foreign keys, indexes, etc.)

-- Drop dependent tables first (if they exist and have foreign keys)
DROP TABLE IF EXISTS repo_cluster_new CASCADE;
DROP TABLE IF EXISTS repo_tech_stack CASCADE;
DROP TABLE IF EXISTS repo_complexity CASCADE;
DROP TABLE IF EXISTS repo_activity CASCADE;
DROP TABLE IF EXISTS repo_health CASCADE;
DROP TABLE IF EXISTS repo_badges CASCADE;
DROP TABLE IF EXISTS repo_gems CASCADE;
DROP TABLE IF EXISTS repo_interactions CASCADE;
DROP TABLE IF EXISTS repo_recommendations CASCADE;

-- Drop the main table (CASCADE will handle any remaining dependencies)
DROP TABLE IF EXISTS repos_master CASCADE;

-- Verify table is dropped
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'repos_master') THEN
        RAISE EXCEPTION 'repos_master table still exists after DROP';
    ELSE
        RAISE NOTICE '✅ Old repos_master table successfully dropped';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create New repos_master Table
-- ============================================

-- Create table with exact schema
CREATE TABLE repos_master (
  -- 🪪 Identity
  repo_id BIGINT PRIMARY KEY,
  name TEXT,
  full_name TEXT,
  html_url TEXT,
  owner_login TEXT,
  avatar_url TEXT,

  -- 📝 Metadata
  description TEXT,
  topics JSONB DEFAULT '[]'::jsonb,
  primary_topic TEXT,
  language TEXT,
  license TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'internal')),

  -- ⭐ Popularity
  stars BIGINT DEFAULT 0,
  forks BIGINT DEFAULT 0,
  watchers BIGINT DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  contributors_count INTEGER DEFAULT 0,

  -- 📦 Size / Structure
  size_kb BIGINT,
  default_branch TEXT,

  -- ⏱️ Activity
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  last_commit_at TIMESTAMPTZ,

  -- 🚦 Status
  archived BOOLEAN DEFAULT FALSE,

  -- 📈 Trending
  stars_30_days INTEGER DEFAULT 0,
  stars_90_days INTEGER DEFAULT 0,

  -- 🛠️ Ingestion tracking
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT repos_master_full_name_unique UNIQUE (full_name)
);

-- ============================================
-- STEP 3: Drop Old Indexes (if they exist)
-- ============================================

-- Drop indexes that might exist from old schema
DROP INDEX IF EXISTS idx_repos_stars;
DROP INDEX IF EXISTS idx_repos_last_commit;
DROP INDEX IF EXISTS idx_repos_language;
DROP INDEX IF EXISTS idx_repos_archived;
DROP INDEX IF EXISTS idx_repos_master_stars;
DROP INDEX IF EXISTS idx_repos_master_last_commit_at;
DROP INDEX IF EXISTS idx_repos_master_language;
DROP INDEX IF EXISTS idx_repos_master_archived;
DROP INDEX IF EXISTS idx_repos_master_topics;
DROP INDEX IF EXISTS idx_repos_master_owner;
DROP INDEX IF EXISTS idx_repos_master_ingested_at;
DROP INDEX IF EXISTS idx_repos_master_full_name;
DROP INDEX IF EXISTS idx_repos_master_primary_topic;

-- ============================================
-- STEP 4: Create Indexes (Exact as specified)
-- ============================================

CREATE INDEX idx_repos_stars 
ON repos_master(stars DESC);

CREATE INDEX idx_repos_last_commit 
ON repos_master(last_commit_at DESC NULLS LAST);

CREATE INDEX idx_repos_language 
ON repos_master(language) 
WHERE language IS NOT NULL;

CREATE INDEX idx_repos_archived 
ON repos_master(archived) 
WHERE archived = FALSE;

-- ============================================
-- STEP 5: Additional Useful Indexes (Optional but Recommended)
-- ============================================

-- For full_name lookups
CREATE INDEX IF NOT EXISTS idx_repos_master_full_name 
ON repos_master(full_name);

-- For topics JSONB queries
CREATE INDEX IF NOT EXISTS idx_repos_master_topics 
ON repos_master USING GIN(topics);

-- For owner lookups
CREATE INDEX IF NOT EXISTS idx_repos_master_owner 
ON repos_master(owner_login);

-- For ingestion tracking
CREATE INDEX IF NOT EXISTS idx_repos_master_ingested_at 
ON repos_master(ingested_at DESC);

-- For primary topic queries
CREATE INDEX IF NOT EXISTS idx_repos_master_primary_topic 
ON repos_master(primary_topic) 
WHERE primary_topic IS NOT NULL;

-- ============================================
-- Verification Queries
-- ============================================

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'repos_master' 
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'repos_master'
ORDER BY indexname;

-- Verify table was created
SELECT 
  'repos_master' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'repos_master';
