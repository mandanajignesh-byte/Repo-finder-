-- ════════════════════════════════════════════════════════════════════════════
-- RepoVerse Recommendation System — Complete Database Setup
-- UPDATED: Fixed type casting for BIGINT id fields
-- ════════════════════════════════════════════════════════════════════════════
-- Run this entire script in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 1 — Create user_tag_affinity table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_tag_affinity (
  user_id     TEXT NOT NULL,
  tag         TEXT NOT NULL,
  affinity    DECIMAL DEFAULT 0.0,
  like_count  INTEGER DEFAULT 0,
  skip_count  INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tag)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_tag_affinity_user ON user_tag_affinity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_affinity_tag ON user_tag_affinity(tag);

-- RLS policies
ALTER TABLE user_tag_affinity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tag affinity" ON user_tag_affinity;
CREATE POLICY "Users can view their own tag affinity"
  ON user_tag_affinity FOR SELECT
  USING (auth.uid()::TEXT = user_id OR user_id LIKE 'anon_%');

DROP POLICY IF EXISTS "Users can update their own tag affinity" ON user_tag_affinity;
CREATE POLICY "Users can update their own tag affinity"
  ON user_tag_affinity FOR ALL
  USING (auth.uid()::TEXT = user_id OR user_id LIKE 'anon_%');

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 2 — Create repo_scores table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS repo_scores (
  repo_id       TEXT PRIMARY KEY,  -- Changed to TEXT to match repo_clusters
  total_likes   INTEGER DEFAULT 0,
  total_skips   INTEGER DEFAULT 0,
  like_rate     DECIMAL DEFAULT 0.5,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_repo_scores_rate ON repo_scores(like_rate DESC);

-- RLS policies
ALTER TABLE repo_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read repo scores" ON repo_scores;
CREATE POLICY "Anyone can read repo scores"
  ON repo_scores FOR SELECT
  USING (TRUE);

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 3 — Create get_scored_repos() function
-- ────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_scored_repos;

CREATE OR REPLACE FUNCTION get_scored_repos(
  p_user_id     TEXT,
  p_cluster     TEXT,
  p_exclude_ids BIGINT[],
  p_limit       INTEGER DEFAULT 30,
  p_min_stars   INTEGER DEFAULT 50,
  p_max_stars   INTEGER DEFAULT 100000
)
RETURNS TABLE(
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
    (rc.repo_data->>'id')::BIGINT AS id_bigint,
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
      like_count = user_tag_affinity.like_count +
                     CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
      skip_count = user_tag_affinity.skip_count +
                     CASE WHEN p_action = 'skip' THEN 1 ELSE 0 END,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 5 — Create update_repo_score() function (helper)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_repo_score(
  p_repo_id TEXT,
  p_action  TEXT    -- "like" | "skip"
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO repo_scores
    (repo_id, total_likes, total_skips, like_rate, updated_at)
  VALUES (
    p_repo_id,
    CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'skip' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'like' THEN 1.0 ELSE 0.0 END,
    NOW()
  )
  ON CONFLICT (repo_id) DO UPDATE SET
    total_likes = repo_scores.total_likes +
                    CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
    total_skips = repo_scores.total_skips +
                    CASE WHEN p_action = 'skip' THEN 1 ELSE 0 END,
    like_rate   = CASE
                    WHEN (repo_scores.total_likes + repo_scores.total_skips + 1) > 0
                    THEN (repo_scores.total_likes + CASE WHEN p_action = 'like' THEN 1 ELSE 0 END)::DECIMAL
                         / (repo_scores.total_likes + repo_scores.total_skips + 1)
                    ELSE 0.5
                  END,
    updated_at  = NOW();
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ SETUP COMPLETE!
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- Test with this query:
--
-- SELECT * FROM get_scored_repos(
--   'test_user',
--   'trending-daily-desktop',
--   ARRAY[]::BIGINT[],
--   5,
--   50,
--   100000
-- );
--
-- Expected: Should return 5 repositories with scores
-- ════════════════════════════════════════════════════════════════════════════
