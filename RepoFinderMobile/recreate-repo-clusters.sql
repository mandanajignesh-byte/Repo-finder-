-- ============================================
-- Recreate repo_clusters table with new schema
-- This will drop the old table and create the new one
-- ============================================

-- WARNING: This will delete all existing data in repo_clusters
-- Only run this if you want to recreate the table structure

-- Step 1: Drop dependent objects first
DROP INDEX IF EXISTS idx_repo_clusters_repo_id;
DROP INDEX IF EXISTS idx_repo_clusters_cluster_slug;
DROP INDEX IF EXISTS idx_repo_clusters_weight;

-- Step 2: Drop the old table (if it exists)
DROP TABLE IF EXISTS repo_clusters CASCADE;

-- Step 3: Create the new repo_clusters table
CREATE TABLE repo_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  cluster_slug TEXT NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(repo_id, cluster_slug)
);

-- Step 4: Create indexes
CREATE INDEX idx_repo_clusters_repo_id ON repo_clusters(repo_id);
CREATE INDEX idx_repo_clusters_cluster_slug ON repo_clusters(cluster_slug);
CREATE INDEX idx_repo_clusters_weight ON repo_clusters(weight DESC);

-- Step 5: Verify the table was created
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'repo_clusters'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- repo_id (bigint)
-- cluster_slug (text)
-- weight (numeric)
-- confidence_score (numeric)
-- created_at (timestamp with time zone)
