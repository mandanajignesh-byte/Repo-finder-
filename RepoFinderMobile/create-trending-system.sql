-- ============================================
-- Trending Underrated Gems System
-- Daily and Weekly trending repos that are underrated gems
-- ============================================

-- Table to track trending scores over time
CREATE TABLE IF NOT EXISTS repo_trending_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id BIGINT REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
  period_date DATE NOT NULL, -- YYYY-MM-DD for daily, start of week for weekly
  star_velocity FLOAT DEFAULT 0.0, -- Stars gained in this period
  commit_velocity FLOAT DEFAULT 0.0, -- Commits in this period
  trending_score FLOAT DEFAULT 0.0, -- Combined trending score
  rank INTEGER, -- Rank within period and category
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, period_type, period_date)
);

CREATE INDEX IF NOT EXISTS idx_repo_trending_scores_period ON repo_trending_scores(period_type, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_repo_trending_scores_score ON repo_trending_scores(period_type, period_date, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_trending_scores_repo_id ON repo_trending_scores(repo_id);

-- View: Trending Underrated Gems by Category
CREATE OR REPLACE VIEW trending_underrated_gems AS
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
  r.created_at,
  r.updated_at,
  r.pushed_at,
  rg.gem_score,
  rg.reason as gem_reason,
  rts.period_type,
  rts.period_date,
  rts.star_velocity,
  rts.commit_velocity,
  rts.trending_score,
  rts.rank,
  rc.cluster_slug,
  rc.weight as cluster_weight,
  rh.health_score,
  ra.freshness_score,
  ra.activity_score
FROM repo_gems rg
JOIN repos_master r ON rg.repo_id = r.repo_id
JOIN repo_trending_scores rts ON r.repo_id = rts.repo_id
JOIN repo_cluster_new rc ON r.repo_id = rc.repo_id
LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id
LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id
WHERE rts.trending_score > 0
ORDER BY rts.period_type, rts.period_date DESC, rts.trending_score DESC, rg.gem_score DESC;

-- Function: Get Trending Underrated Gems by Category
CREATE OR REPLACE FUNCTION get_trending_underrated_gems(
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
    rts.trending_score,
    rts.star_velocity,
    rc.cluster_slug,
    rh.health_score,
    ra.freshness_score,
    rts.rank
  FROM repo_gems rg
  JOIN repos_master r ON rg.repo_id = r.repo_id
  JOIN repo_trending_scores rts ON r.repo_id = rts.repo_id
  JOIN repo_cluster_new rc ON r.repo_id = rc.repo_id
  LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id
  LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id
  WHERE rts.period_type = p_period_type
    AND rts.period_date = (
      SELECT MAX(period_date) 
      FROM repo_trending_scores 
      WHERE period_type = p_period_type
    )
    AND (p_cluster_slug IS NULL OR rc.cluster_slug = p_cluster_slug)
  ORDER BY rts.trending_score DESC, rg.gem_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_repo_trending_scores_lookup 
ON repo_trending_scores(period_type, period_date DESC, trending_score DESC);
