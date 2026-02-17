-- ============================================
-- Create repo_cluster_new Table
-- This table stores interest cluster assignments for repositories
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS repo_cluster_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  cluster_slug TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, cluster_slug)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_repo_cluster_new_repo_id 
ON repo_cluster_new(repo_id);

CREATE INDEX IF NOT EXISTS idx_repo_cluster_new_cluster_slug 
ON repo_cluster_new(cluster_slug);

CREATE INDEX IF NOT EXISTS idx_repo_cluster_new_weight 
ON repo_cluster_new(weight DESC);

-- ============================================
-- Verification
-- ============================================

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'repo_cluster_new' 
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'repo_cluster_new'
ORDER BY indexname;

-- Verify table was created
SELECT 
  'repo_cluster_new' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'repo_cluster_new';
