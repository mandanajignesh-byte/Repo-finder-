-- ============================================
-- Trending Repos Table (Auto-Updated Daily/Weekly)
-- Stores current trending underrated gems
-- Old entries are automatically deleted when new ones are added
-- ============================================

-- Main trending repos table
CREATE TABLE IF NOT EXISTS trending_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
  period_date DATE NOT NULL, -- YYYY-MM-DD for daily, start of week for weekly
  rank INTEGER NOT NULL, -- Rank in trending list (1 = most trending)
  trending_score FLOAT DEFAULT 0.0,
  star_velocity FLOAT DEFAULT 0.0,
  cluster_slug TEXT, -- Category/cluster
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, period_type, period_date, cluster_slug)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_trending_repos_period ON trending_repos(period_type, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_trending_repos_cluster ON trending_repos(cluster_slug);
CREATE INDEX IF NOT EXISTS idx_trending_repos_score ON trending_repos(period_type, period_date, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_repos_rank ON trending_repos(period_type, period_date, rank);

-- Function: Get Trending Underrated Gems (simplified)
CREATE OR REPLACE FUNCTION get_trending_gems(
  p_period_type TEXT DEFAULT 'daily',
  p_cluster_slug TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  repo_id BIGINT,
  name TEXT,
  full_name TEXT,
  description TEXT,
  stars INTEGER,
  forks INTEGER,
  language TEXT,
  owner_login TEXT,
  avatar_url TEXT,
  html_url TEXT,
  topics JSONB,
  gem_score FLOAT,
  trending_score FLOAT,
  star_velocity FLOAT,
  cluster_slug TEXT,
  health_score FLOAT,
  freshness_score FLOAT,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.repo_id,
    r.name,
    r.full_name,
    r.description,
    r.stars,
    r.forks,
    r.language,
    r.owner_login,
    r.avatar_url,
    r.html_url,
    r.topics,
    rg.gem_score,
    tr.trending_score,
    tr.star_velocity,
    tr.cluster_slug,
    rh.health_score,
    ra.freshness_score,
    tr.rank
  FROM trending_repos tr
  JOIN repos_master r ON tr.repo_id = r.repo_id
  JOIN repo_gems rg ON r.repo_id = rg.repo_id
  LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id
  LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id
  WHERE tr.period_type = p_period_type
    AND tr.period_date = (
      SELECT MAX(period_date) 
      FROM trending_repos 
      WHERE period_type = p_period_type
    )
    AND (p_cluster_slug IS NULL OR tr.cluster_slug = p_cluster_slug)
  ORDER BY tr.rank ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- View for easy querying
CREATE OR REPLACE VIEW trending_gems_view AS
SELECT 
  tr.*,
  r.name,
  r.full_name,
  r.description,
  r.stars,
  r.forks,
  r.language,
  r.owner_login,
  r.avatar_url,
  r.html_url,
  r.topics,
  rg.gem_score,
  rh.health_score,
  ra.freshness_score
FROM trending_repos tr
JOIN repos_master r ON tr.repo_id = r.repo_id
JOIN repo_gems rg ON r.repo_id = rg.repo_id
LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id
LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id
ORDER BY tr.period_type, tr.period_date DESC, tr.rank ASC;
