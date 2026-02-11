-- ============================================
-- Performance Indexes for repo_clusters Table
-- Ensures fast queries when fetching repos by cluster, tags, or quality
-- ============================================

-- Primary cluster index (most common query)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_name 
  ON repo_clusters(cluster_name);

-- Composite index for cluster + quality (for sorting)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_quality 
  ON repo_clusters(cluster_name, quality_score DESC);

-- Composite index for cluster + rotation (for rotation-based fetching)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_rotation 
  ON repo_clusters(cluster_name, rotation_priority DESC);

-- GIN index for tags (for tag-based searches)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_tags_gin 
  ON repo_clusters USING GIN(tags);

-- Index for updated_at (for freshness checks)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_updated_at 
  ON repo_clusters(updated_at DESC);

-- Composite index for cluster + tags (for tag filtering within cluster)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_tags 
  ON repo_clusters(cluster_name) 
  INCLUDE (tags);

-- Index for repo_id (for deduplication checks)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_repo_id 
  ON repo_clusters(repo_id);

-- Composite index for cluster + repo_id (for existence checks)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_repo 
  ON repo_clusters(cluster_name, repo_id);
