-- ============================================
-- Add Repo Gems Table
-- For detecting underrated high-quality repos
-- ============================================

CREATE TABLE IF NOT EXISTS repo_gems (
  repo_id BIGINT PRIMARY KEY REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  gem_score FLOAT DEFAULT 0.0 CHECK (gem_score >= 0 AND gem_score <= 1),
  reason JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_gems_score ON repo_gems(gem_score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_gems_detected_at ON repo_gems(detected_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_repo_gems_updated_at
  BEFORE UPDATE ON repo_gems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for gems with repo details
CREATE OR REPLACE VIEW repo_gems_view AS
SELECT 
  g.repo_id,
  g.gem_score,
  g.reason,
  g.detected_at,
  r.name,
  r.full_name,
  r.description,
  r.stars,
  r.language,
  rh.health_score,
  ra.freshness_score,
  rh.documentation_score
FROM repo_gems g
JOIN repos_master r ON g.repo_id = r.repo_id
LEFT JOIN repo_health rh ON g.repo_id = rh.repo_id
LEFT JOIN repo_activity ra ON g.repo_id = ra.repo_id
ORDER BY g.gem_score DESC;
