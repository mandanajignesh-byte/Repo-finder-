-- ════════════════════════════════════════════════════════════════════════════
-- FIX: Extract owner_avatar correctly from repo_data JSONB
-- ════════════════════════════════════════════════════════════════════════════
-- The repo_data likely has structure: { owner: { avatar_url: "..." } }
-- We need to extract it properly
-- ════════════════════════════════════════════════════════════════════════════

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
    -- Try multiple possible avatar locations
    COALESCE(
      rc.repo_data->>'owner_avatar',           -- Direct field
      rc.repo_data->'owner'->>'avatar_url',    -- Nested in owner object
      rc.repo_data->'owner'->>'avatarUrl',     -- camelCase variant
      'https://github.com/identicons/' || COALESCE(rc.repo_data->'owner'->>'login', 'default') || '.png'  -- Fallback
    ) AS owner_avatar,
    COALESCE(rc.quality_score, 50)::DECIMAL AS health_score,
    COALESCE(rs.like_rate, 0.5)::DECIMAL AS like_rate,
    (
      -- 40%: global like rate
      COALESCE(rs.like_rate, 0.5)::DECIMAL * 40.0
      +
      -- 30%: quality score normalized to 0-30
      (COALESCE(rc.quality_score, 50)::DECIMAL / 100.0) * 30.0
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
    )::DECIMAL AS final_score
  FROM  repo_clusters rc
  LEFT JOIN repo_scores rs ON rs.repo_id = (rc.repo_data->>'id')
  WHERE rc.cluster_name = p_cluster
    AND (rc.repo_data->>'id')::BIGINT != ALL(p_exclude_ids)
    AND COALESCE((rc.repo_data->>'stars')::INTEGER, 0) BETWEEN p_min_stars AND p_max_stars
  ORDER BY final_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ════════════════════════════════════════════════════════════════════════════
-- Test it
-- ════════════════════════════════════════════════════════════════════════════
SELECT 
  name,
  full_name,
  owner_avatar
FROM get_scored_repos(
  'test_user',
  'ai-ml',
  ARRAY[]::BIGINT[],
  5,
  0,
  999999
);

-- Expected: owner_avatar should have values now!
-- ════════════════════════════════════════════════════════════════════════════
