-- ============================================================================
-- RepoVerse Recommendation System - SQL Setup
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
-- SQL 2 — Create repo_scores table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS repo_scores (
  repo_id         BIGINT      PRIMARY KEY
                              REFERENCES repos_master(id)
                              ON DELETE CASCADE,
  total_likes     INTEGER     NOT NULL DEFAULT 0,
  total_skips     INTEGER     NOT NULL DEFAULT 0,
  total_views     INTEGER     NOT NULL DEFAULT 0,
  like_rate       DECIMAL     NOT NULL DEFAULT 0.5,
  weighted_score  DECIMAL     NOT NULL DEFAULT 50,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with neutral score for all existing repos
INSERT INTO repo_scores (repo_id, like_rate, weighted_score)
  SELECT id, 0.5, 50 FROM repos_master
  ON CONFLICT (repo_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- SQL 3 — Create get_scored_repos() function
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
    rm.id, rm.name, rm.full_name, rm.description,
    rm.stars, rm.forks, rm.language,
    rm.tags, rm.topics, rm.url, rm.owner_avatar,
    COALESCE(rh.health_score, 50)    AS health_score,
    COALESCE(rs.like_rate,    0.5)   AS like_rate,
    (
      -- 40%: global like rate
      COALESCE(rs.like_rate, 0.5) * 40.0
      +
      -- 30%: health score normalised to 0-30
      (COALESCE(rh.health_score, 50) / 100.0) * 30.0
      +
      -- 20%: user tag affinity
      COALESCE((
        SELECT AVG(LEAST(uta.affinity, 10.0)) / 10.0 * 20.0
        FROM   user_tag_affinity uta
        WHERE  uta.user_id = p_user_id
          AND  uta.tag     = ANY(rm.tags)
          AND  uta.affinity > 0
      ), 10.0)
      +
      -- 10%: recency bonus
      CASE
        WHEN rm.updated_at > NOW() - INTERVAL '7 days'  THEN 10.0
        WHEN rm.updated_at > NOW() - INTERVAL '30 days' THEN  5.0
        ELSE 0.0
      END
    ) AS final_score
  FROM  repos_master   rm
  JOIN  repo_clusters  rc ON rc.repo_id     = rm.id
  LEFT JOIN repo_health    rh ON rh.repo_id = rm.id
  LEFT JOIN repo_scores    rs ON rs.repo_id = rm.id
  WHERE rc.cluster_name       = p_cluster
    AND rm.id                 != ALL(p_exclude_ids)
    AND rm.stars BETWEEN p_min_stars AND p_max_stars
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
  USING (
    user_id = auth.uid()::TEXT
    OR user_id = current_setting('request.jwt.claims',
                   true)::json ->> 'sub'
  );

-- repo_scores is globally readable, not writable from client
DROP POLICY IF EXISTS public_read_scores ON repo_scores;
CREATE POLICY public_read_scores ON repo_scores
  FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- ────────────────────────────────────────────────────────────────────────────

-- Run these to verify setup:
-- SELECT * FROM user_tag_affinity LIMIT 5;
-- SELECT * FROM repo_scores LIMIT 5;
-- SELECT * FROM pg_proc WHERE proname IN ('get_scored_repos', 'update_tag_affinity');
