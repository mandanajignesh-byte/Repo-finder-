-- ============================================
-- Add Missing Columns to repos_master
-- Run this migration to add recommended columns
-- ============================================

-- 1. Contributor count (for community score, gem detection, enterprise badge)
ALTER TABLE repos_master 
ADD COLUMN IF NOT EXISTS contributors_count INTEGER DEFAULT 0;

COMMENT ON COLUMN repos_master.contributors_count IS 'Number of contributors - used for community score, gem detection, enterprise badge';

-- 2. Default branch (needed for commit API calls, activity pipelines)
-- Note: This might already exist, but adding IF NOT EXISTS is safe
ALTER TABLE repos_master 
ADD COLUMN IF NOT EXISTS default_branch TEXT;

COMMENT ON COLUMN repos_master.default_branch IS 'Default branch name - needed for commit API calls and activity pipelines';

-- 3. Repo visibility (public / private / internal)
ALTER TABLE repos_master 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'internal'));

COMMENT ON COLUMN repos_master.visibility IS 'Repository visibility: public, private, or internal';

-- 4. Primary topic (denormalized shortcut to avoid parsing JSON each query)
ALTER TABLE repos_master 
ADD COLUMN IF NOT EXISTS primary_topic TEXT;

COMMENT ON COLUMN repos_master.primary_topic IS 'Primary topic (denormalized from topics JSONB for faster queries)';

-- 5. Star velocity (for trending ranking)
ALTER TABLE repos_master 
ADD COLUMN IF NOT EXISTS stars_30_days INTEGER DEFAULT 0;

ALTER TABLE repos_master 
ADD COLUMN IF NOT EXISTS stars_90_days INTEGER DEFAULT 0;

COMMENT ON COLUMN repos_master.stars_30_days IS 'Star count 30 days ago - used for trending ranking';
COMMENT ON COLUMN repos_master.stars_90_days IS 'Star count 90 days ago - used for trending ranking';

-- ============================================
-- Performance Indexes (Critical for Speed)
-- ============================================

-- Index on stars (descending) - for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_repos_stars 
ON repos_master(stars DESC);

-- Index on last_commit_at (descending) - for freshness filtering
CREATE INDEX IF NOT EXISTS idx_repos_last_commit 
ON repos_master(last_commit_at DESC NULLS LAST);

-- Index on language - for language-based filtering
CREATE INDEX IF NOT EXISTS idx_repos_language 
ON repos_master(language) 
WHERE language IS NOT NULL;

-- Index on archived - for filtering out archived repos
CREATE INDEX IF NOT EXISTS idx_repos_archived 
ON repos_master(archived) 
WHERE archived = FALSE;

-- Index on visibility - for filtering public repos
CREATE INDEX IF NOT EXISTS idx_repos_visibility 
ON repos_master(visibility) 
WHERE visibility = 'public';

-- Index on primary_topic - for topic-based queries
CREATE INDEX IF NOT EXISTS idx_repos_primary_topic 
ON repos_master(primary_topic) 
WHERE primary_topic IS NOT NULL;

-- Composite index for common query pattern: active, public repos sorted by stars
CREATE INDEX IF NOT EXISTS idx_repos_active_public_stars 
ON repos_master(stars DESC) 
WHERE archived = FALSE AND visibility = 'public';

-- Composite index for trending queries: recent commits + star velocity
CREATE INDEX IF NOT EXISTS idx_repos_trending 
ON repos_master(last_commit_at DESC, stars DESC) 
WHERE archived = FALSE AND visibility = 'public' AND last_commit_at > NOW() - INTERVAL '90 days';

-- ============================================
-- Verification Queries
-- ============================================

-- Check if columns were added successfully
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'repos_master' 
  AND column_name IN (
    'contributors_count', 
    'default_branch', 
    'visibility', 
    'primary_topic', 
    'stars_30_days', 
    'stars_90_days'
  )
ORDER BY column_name;

-- Check if indexes were created
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'repos_master' 
  AND indexname LIKE 'idx_repos%'
ORDER BY indexname;
