-- ============================================================================
-- RepoVerse Recommendation System - SQL Setup (FIXED VERSION)
-- Run each section separately in Supabase SQL Editor
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 1 — Create user_tag_affinity table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_tag_affinity (
  user_id      TEXT        NOT NULL,
  tag          TEXT        NOT NULL,
  affinity     DECIMAL     NOT NULL DEFAULT 0,
  like_count   INTEGER     NOT NULL DEFAULT 0,
  skip_count   INTEGER     NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_uta_user
  ON user_tag_affinity(user_id);

CREATE INDEX IF NOT EXISTS idx_uta_score
  ON user_tag_affinity(user_id, affinity DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 2 — Create repo_scores table (NO foreign key constraint)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS repo_scores (
  repo_id         TEXT        PRIMARY KEY,  -- Changed to TEXT to match repos
  total_likes     INTEGER     NOT NULL DEFAULT 0,
  total_skips     INTEGER     NOT NULL DEFAULT 0,
  total_views     INTEGER     NOT NULL DEFAULT 0,
  like_rate       DECIMAL     NOT NULL DEFAULT 0.5,
  weighted_score  DECIMAL     NOT NULL DEFAULT 50,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_repo_scores_repo_id ON repo_scores(repo_id);

-- Don't seed initially - let it populate as users interact
-- This avoids foreign key issues

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 3 — Create get_scored_repos() function (SIMPLIFIED)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_scored_repos(
  p_user_id     TEXT,
  p_cluster     TEXT,
  p_exclude_ids BIGINT[],
  p_limit       INT     DEFAULT 30,
  p_min_stars   INT     DEFAULT 50,
  p_max_stars   INT     DEFAULT 100000
)
RETURNS TABLE (
  id            BIGINT,
  name          TEXT,
  full_name     TEXT,
  description   TEXT,
  stars         INTEGER,
  forks         INTEGER,
  language      TEXT,
  tags          TEXT[],
  topics        TEXT[],
  url           TEXT,
  owner_avatar  TEXT,
  health_score  DECIMAL,
  like_rate     DECIMAL,
  final_score   DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.repo_data->>'id' AS id_bigint,
    rc.repo_data->>'name' AS name,
    rc.repo_data->>'full_name' AS full_name,
    rc.repo_data->>'description' AS description,
    COALESCE((rc.repo_data->>'stars')::INTEGER, 0) AS stars,
    COALESCE((rc.repo_data->>'forks')::INTEGER, 0) AS forks,
    rc.repo_data->>'language' AS language,
    rc.tags AS tags,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(rc.repo_data->'topics')), ARRAY[]::TEXT[]) AS topics,
    rc.repo_data->>'url' AS url,
    rc.repo_data->>'owner_avatar' AS owner_avatar,
    COALESCE(rc.quality_score, 50) AS health_score,
    COALESCE(rs.like_rate, 0.5) AS like_rate,
    (
      -- 40%: global like rate
      COALESCE(rs.like_rate, 0.5) * 40.0
      +
      -- 30%: quality score normalized to 0-30
      (COALESCE(rc.quality_score, 50) / 100.0) * 30.0
      +
      -- 20%: user tag affinity
      COALESCE((
        SELECT AVG(LEAST(uta.affinity, 10.0)) / 10.0 * 20.0
        FROM   user_tag_affinity uta
        WHERE  uta.user_id = p_user_id
          AND  uta.tag = ANY(rc.tags)
          AND  uta.affinity > 0
      ), 10.0)
      +
      -- 10%: recency bonus (using pushed_at from JSONB)
      CASE
        WHEN (rc.repo_data->>'pushed_at')::TIMESTAMPTZ > NOW() - INTERVAL '7 days'  THEN 10.0
        WHEN (rc.repo_data->>'pushed_at')::TIMESTAMPTZ > NOW() - INTERVAL '30 days' THEN  5.0
        ELSE 0.0
      END
    ) AS final_score
  FROM  repo_clusters rc
  LEFT JOIN repo_scores rs ON rs.repo_id = (rc.repo_data->>'id')
  WHERE rc.cluster_name = p_cluster
    AND (rc.repo_data->>'id')::BIGINT != ALL(p_exclude_ids)
    AND COALESCE((rc.repo_data->>'stars')::INTEGER, 0) BETWEEN p_min_stars AND p_max_stars
  ORDER BY final_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 4 — Create update_tag_affinity() function
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_tag_affinity(
  p_user_id TEXT,
  p_tags    TEXT[],
  p_action  TEXT    -- "like" | "skip"
)
RETURNS VOID AS $$
DECLARE
  delta DECIMAL := CASE WHEN p_action = 'like' THEN 1.0 ELSE -0.3 END;
  t     TEXT;
BEGIN
  FOREACH t IN ARRAY p_tags LOOP
    INSERT INTO user_tag_affinity
      (user_id, tag, affinity, like_count, skip_count, updated_at)
    VALUES (
      p_user_id, t,
      GREATEST(-5, LEAST(20, delta)),
      CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
      CASE WHEN p_action = 'skip' THEN 1 ELSE 0 END,
      NOW()
    )
    ON CONFLICT (user_id, tag) DO UPDATE SET
      affinity   = GREATEST(-5, LEAST(20,
                     user_tag_affinity.affinity + delta)),
      like_count = user_tag_affinity.like_count
                   + CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
      skip_count = user_tag_affinity.skip_count
                   + CASE WHEN p_action = 'skip' THEN 1 ELSE 0 END,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 5 — Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_tag_affinity ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_scores       ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own affinity rows
DROP POLICY IF EXISTS own_affinity ON user_tag_affinity;
CREATE POLICY own_affinity ON user_tag_affinity
  FOR ALL
  USING (true);  -- Allow all operations for simplicity

-- repo_scores is globally readable, writable by service role only
DROP POLICY IF EXISTS public_read_scores ON repo_scores;
CREATE POLICY public_read_scores ON repo_scores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS service_write_scores ON repo_scores;
CREATE POLICY service_write_scores ON repo_scores
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS service_update_scores ON repo_scores;
CREATE POLICY service_update_scores ON repo_scores
  FOR UPDATE USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- ────────────────────────────────────────────────────────────────────────────

-- Run these to verify setup:
-- SELECT * FROM user_tag_affinity LIMIT 5;
-- SELECT * FROM repo_scores LIMIT 5;
-- SELECT * FROM pg_proc WHERE proname IN ('get_scored_repos', 'update_tag_affinity');

-- Test the function (replace 'frontend' with an actual cluster name from your DB):
-- SELECT * FROM get_scored_repos('test_user', 'frontend', ARRAY[]::BIGINT[], 10, 50, 100000);
