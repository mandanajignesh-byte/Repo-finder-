-- ============================================
-- Add Repo Activity & Freshness Scoring System
-- This adds activity tracking, freshness scores, and related features
-- ============================================

-- ============================================
-- 1. Add last_commit_at to repos_master (denormalized for speed)
-- ============================================
ALTER TABLE repos_master 
ADD COLUMN IF NOT EXISTS last_commit_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_repos_master_last_commit_at 
ON repos_master(last_commit_at DESC NULLS LAST);

-- ============================================
-- 2. Create repo_activity table
-- ============================================
CREATE TABLE IF NOT EXISTS repo_activity (
  repo_id BIGINT PRIMARY KEY REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  last_commit_at TIMESTAMPTZ NOT NULL,
  commits_30_days INTEGER DEFAULT 0,
  commits_90_days INTEGER DEFAULT 0,
  commit_velocity DECIMAL(10,2) DEFAULT 0.0, -- commits per day
  freshness_score DECIMAL(3,2) DEFAULT 0.0 CHECK (freshness_score >= 0 AND freshness_score <= 1),
  activity_score DECIMAL(3,2) DEFAULT 0.0 CHECK (activity_score >= 0 AND activity_score <= 1),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_activity_last_commit_at 
ON repo_activity(last_commit_at DESC);

CREATE INDEX IF NOT EXISTS idx_repo_activity_freshness_score 
ON repo_activity(freshness_score DESC);

CREATE INDEX IF NOT EXISTS idx_repo_activity_activity_score 
ON repo_activity(activity_score DESC);

CREATE INDEX IF NOT EXISTS idx_repo_activity_computed_at 
ON repo_activity(computed_at DESC);

-- ============================================
-- 3. Add freshness_boost to repo_recommendations
-- ============================================
ALTER TABLE repo_recommendations 
ADD COLUMN IF NOT EXISTS freshness_boost DECIMAL(10,6) DEFAULT 0.0;

CREATE INDEX IF NOT EXISTS idx_repo_recommendations_freshness 
ON repo_recommendations(user_id, freshness_boost DESC);

-- ============================================
-- 4. Add activity badges to badge_definitions
-- ============================================
INSERT INTO badge_definitions (badge_slug, name, description, icon, color) VALUES
  ('actively_maintained', 'Actively Maintained', 'Updated within the last 30 days', 'activity', '#10b981'),
  ('recently_updated', 'Recently Updated', 'Updated within the last 90 days', 'clock', '#3b82f6'),
  ('maintained', 'Maintained', 'Updated within the last year', 'check-circle', '#8b5cf6'),
  ('needs_attention', 'Needs Attention', 'Not updated for 1-2 years', 'alert-triangle', '#f59e0b'),
  ('dormant', 'Dormant', 'Not updated for over 2 years', 'archive', '#6b7280')
ON CONFLICT (badge_slug) DO NOTHING;

-- ============================================
-- 5. Add exclude_inactive_repos to user_preferences
-- ============================================
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS exclude_inactive_repos BOOLEAN DEFAULT FALSE;

-- ============================================
-- 6. Function to calculate freshness_score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_freshness_score(last_commit_date TIMESTAMPTZ)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  days_inactive INTEGER;
  score DECIMAL(3,2);
BEGIN
  -- Calculate days since last commit
  days_inactive := EXTRACT(EPOCH FROM (CURRENT_DATE - last_commit_date::date)) / 86400;
  
  -- Map days inactive to freshness score
  CASE
    WHEN days_inactive <= 30 THEN score := 1.0;
    WHEN days_inactive <= 90 THEN score := 0.85;
    WHEN days_inactive <= 180 THEN score := 0.65;
    WHEN days_inactive <= 365 THEN score := 0.45;
    WHEN days_inactive <= 730 THEN score := 0.25; -- 1-2 years
    ELSE score := 0.05; -- >2 years
  END CASE;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 7. Function to update freshness_score for a repo
-- ============================================
CREATE OR REPLACE FUNCTION update_repo_freshness_score(p_repo_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_last_commit_at TIMESTAMPTZ;
  v_freshness_score DECIMAL(3,2);
  v_commits_30 INTEGER;
  v_commits_90 INTEGER;
  v_commit_velocity DECIMAL(10,2);
  v_activity_score DECIMAL(3,2);
BEGIN
  -- Get last commit date from repo_activity
  SELECT last_commit_at INTO v_last_commit_at
  FROM repo_activity
  WHERE repo_id = p_repo_id;
  
  IF v_last_commit_at IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate freshness score
  v_freshness_score := calculate_freshness_score(v_last_commit_at);
  
  -- Calculate commit velocity (commits per day over 90 days)
  SELECT commits_90_days INTO v_commits_90
  FROM repo_activity
  WHERE repo_id = p_repo_id;
  
  v_commit_velocity := CASE 
    WHEN v_commits_90 > 0 THEN v_commits_90::DECIMAL / 90.0
    ELSE 0.0
  END;
  
  -- Normalize commit velocity to 0-1 scale (assuming max 10 commits/day is very active)
  v_commit_velocity := LEAST(v_commit_velocity / 10.0, 1.0);
  
  -- Calculate activity_score: freshness (60%) + velocity (40%)
  v_activity_score := (v_freshness_score * 0.6) + (v_commit_velocity * 0.4);
  
  -- Update repo_activity
  UPDATE repo_activity
  SET 
    freshness_score = v_freshness_score,
    activity_score = v_activity_score,
    updated_at = NOW()
  WHERE repo_id = p_repo_id;
  
  -- Also update repos_master.last_commit_at (denormalized)
  UPDATE repos_master
  SET last_commit_at = v_last_commit_at
  WHERE repo_id = p_repo_id;
  
  -- Update repo_health.activity_score
  UPDATE repo_health
  SET 
    activity_score = v_activity_score,
    updated_at = NOW()
  WHERE repo_id = p_repo_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Function to assign activity badges
-- ============================================
CREATE OR REPLACE FUNCTION assign_activity_badges(p_repo_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_last_commit_at TIMESTAMPTZ;
  v_days_inactive INTEGER;
  v_badge_slug TEXT;
BEGIN
  -- Get last commit date
  SELECT last_commit_at INTO v_last_commit_at
  FROM repo_activity
  WHERE repo_id = p_repo_id;
  
  IF v_last_commit_at IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate days inactive
  v_days_inactive := EXTRACT(EPOCH FROM (CURRENT_DATE - v_last_commit_at::date)) / 86400;
  
  -- Remove existing activity badges
  DELETE FROM repo_badges
  WHERE repo_id = p_repo_id
    AND badge_slug IN ('actively_maintained', 'recently_updated', 'maintained', 'needs_attention', 'dormant');
  
  -- Assign appropriate badge
  CASE
    WHEN v_days_inactive <= 30 THEN
      v_badge_slug := 'actively_maintained';
    WHEN v_days_inactive <= 90 THEN
      v_badge_slug := 'recently_updated';
    WHEN v_days_inactive <= 365 THEN
      v_badge_slug := 'maintained';
    WHEN v_days_inactive <= 730 THEN
      v_badge_slug := 'needs_attention';
    ELSE
      v_badge_slug := 'dormant';
  END CASE;
  
  -- Insert badge
  INSERT INTO repo_badges (repo_id, badge_slug)
  VALUES (p_repo_id, v_badge_slug)
  ON CONFLICT (repo_id, badge_slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Trigger to update freshness when last_commit_at changes
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_freshness()
RETURNS TRIGGER AS $$
BEGIN
  -- Update freshness score when last_commit_at changes
  PERFORM update_repo_freshness_score(NEW.repo_id);
  PERFORM assign_activity_badges(NEW.repo_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER repo_activity_update_freshness
  AFTER INSERT OR UPDATE OF last_commit_at, commits_30_days, commits_90_days
  ON repo_activity
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_freshness();

-- ============================================
-- 10. Update trigger for repo_activity updated_at
-- ============================================
CREATE TRIGGER update_repo_activity_updated_at
  BEFORE UPDATE ON repo_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. View for repos with activity data
-- ============================================
CREATE OR REPLACE VIEW repo_activity_view AS
SELECT 
  r.repo_id,
  r.name,
  r.full_name,
  r.stars,
  r.language,
  ra.last_commit_at,
  ra.commits_30_days,
  ra.commits_90_days,
  ra.commit_velocity,
  ra.freshness_score,
  ra.activity_score,
  EXTRACT(EPOCH FROM (CURRENT_DATE - ra.last_commit_at::date)) / 86400 as days_inactive,
  CASE
    WHEN ra.last_commit_at IS NULL THEN 'Unknown'
    WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - ra.last_commit_at::date)) / 86400 <= 30 THEN '🟢 Active'
    WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - ra.last_commit_at::date)) / 86400 <= 90 THEN '🟡 Recent'
    WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - ra.last_commit_at::date)) / 86400 <= 365 THEN '🟠 Maintained'
    ELSE '🔴 Inactive'
  END as activity_status
FROM repos_master r
LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id;

-- ============================================
-- 12. Example: Update freshness for all repos (batch update)
-- ============================================
/*
-- This would be run by a cron job
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT repo_id FROM repo_activity WHERE last_commit_at IS NOT NULL
  LOOP
    PERFORM update_repo_freshness_score(r.repo_id);
    PERFORM assign_activity_badges(r.repo_id);
  END LOOP;
END $$;
*/

-- ============================================
-- 13. Example queries
-- ============================================

-- Get repos updated in last 30 days
/*
SELECT * FROM repo_activity_view
WHERE days_inactive <= 30
ORDER BY freshness_score DESC, stars DESC
LIMIT 50;
*/

-- Get repos filtered by user preference
/*
SELECT rr.*, r.name, r.stars, ra.freshness_score
FROM repo_recommendations rr
JOIN repos_master r ON rr.repo_id = r.repo_id
LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id
WHERE rr.user_id = 'user_123'
  AND (SELECT exclude_inactive_repos FROM user_preferences WHERE user_id = 'user_123') = FALSE
    OR ra.last_commit_at > NOW() - INTERVAL '1 year'
ORDER BY rr.score DESC
LIMIT 20;
*/

-- ============================================
-- END
-- ============================================
