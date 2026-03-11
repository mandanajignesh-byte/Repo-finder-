-- ============================================
-- Recommendation System Schema
-- Precomputed feed for ultra-fast recommendations
-- ============================================

-- ============================================
-- 1. Recommendation Feed Table (Precomputed)
-- ============================================
CREATE TABLE IF NOT EXISTS repo_recommendations_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  
  -- Precomputed repo metadata (denormalized for speed)
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  language TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  
  -- Precomputed scores
  health_score DECIMAL(3,2) DEFAULT 0.0,
  freshness_score DECIMAL(3,2) DEFAULT 0.0,
  activity_score DECIMAL(3,2) DEFAULT 0.0,
  
  -- Precomputed badges (JSONB array)
  badges JSONB DEFAULT '[]'::jsonb,
  
  -- Recommendation scores
  interest_match_score DECIMAL(5,4) DEFAULT 0.0,
  tech_match_score DECIMAL(5,4) DEFAULT 0.0,
  complexity_match_score DECIMAL(5,4) DEFAULT 0.0,
  popularity_score DECIMAL(5,4) DEFAULT 0.0,
  health_score_weighted DECIMAL(5,4) DEFAULT 0.0,
  freshness_score_weighted DECIMAL(5,4) DEFAULT 0.0,
  gem_boost DECIMAL(5,4) DEFAULT 0.0,
  final_score DECIMAL(5,4) DEFAULT 0.0,
  
  -- Ranking
  rank INTEGER NOT NULL,
  
  -- Metadata
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional: for cache invalidation
  
  -- Constraints
  UNIQUE(user_id, repo_id),
  CHECK (final_score >= 0 AND final_score <= 1),
  CHECK (rank > 0)
);

-- Indexes for ultra-fast queries
CREATE INDEX IF NOT EXISTS idx_recommendations_feed_user_rank 
  ON repo_recommendations_feed(user_id, rank ASC);

CREATE INDEX IF NOT EXISTS idx_recommendations_feed_user_score 
  ON repo_recommendations_feed(user_id, final_score DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_feed_computed_at 
  ON repo_recommendations_feed(computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_feed_repo_id 
  ON repo_recommendations_feed(repo_id);

-- ============================================
-- 2. User Vector Generation Function
-- ============================================
CREATE OR REPLACE FUNCTION generate_user_vectors(p_user_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_interest_vector JSONB := '{}'::jsonb;
  v_tech_vector JSONB := '{}'::jsonb;
  v_complexity_vector JSONB := '{}'::jsonb;
  v_goal_vector JSONB := '{}'::jsonb;
  v_primary_cluster TEXT;
  v_experience_level TEXT;
BEGIN
  -- Get user preferences
  SELECT 
    primary_cluster,
    experience_level
  INTO v_primary_cluster, v_experience_level
  FROM app_user_preferences
  WHERE user_id = p_user_id;
  
  -- Build interest vector from clusters
  WITH cluster_weights AS (
    SELECT 
      primary_cluster as cluster,
      1.0 as weight
    FROM app_user_preferences
    WHERE user_id = p_user_id AND primary_cluster IS NOT NULL
    
    UNION ALL
    
    SELECT 
      unnest(secondary_clusters) as cluster,
      0.7 as weight
    FROM app_user_preferences
    WHERE user_id = p_user_id AND secondary_clusters IS NOT NULL
  )
  SELECT jsonb_object_agg(cluster, weight)
  INTO v_interest_vector
  FROM cluster_weights;
  
  -- Build tech vector from tech_stack
  WITH tech_weights AS (
    SELECT 
      unnest(tech_stack) as tech,
      1.0 as weight
    FROM app_user_preferences
    WHERE user_id = p_user_id AND tech_stack IS NOT NULL
  )
  SELECT jsonb_object_agg(tech, weight)
  INTO v_tech_vector
  FROM tech_weights;
  
  -- Build complexity vector from experience level
  CASE v_experience_level
    WHEN 'beginner' THEN
      v_complexity_vector := '{"tutorial": 1.0, "boilerplate": 0.8, "full_app": 0.3}'::jsonb;
    WHEN 'intermediate' THEN
      v_complexity_vector := '{"full_app": 1.0, "boilerplate": 0.7, "production_saas": 0.5}'::jsonb;
    WHEN 'advanced' THEN
      v_complexity_vector := '{"production_saas": 1.0, "infrastructure": 0.9, "framework": 0.8}'::jsonb;
    ELSE
      v_complexity_vector := '{"full_app": 1.0}'::jsonb;
  END CASE;
  
  -- Build goal vector
  WITH goal_list AS (
    SELECT unnest(goals) as goal
    FROM app_user_preferences
    WHERE user_id = p_user_id AND goals IS NOT NULL
  )
  SELECT jsonb_object_agg(goal, 1.0)
  INTO v_goal_vector
  FROM goal_list;
  
  -- Upsert user vectors
  INSERT INTO user_vectors (
    user_id,
    interest_vector,
    tech_vector,
    complexity_vector,
    goal_vector,
    updated_at
  ) VALUES (
    p_user_id,
    COALESCE(v_interest_vector, '{}'::jsonb),
    COALESCE(v_tech_vector, '{}'::jsonb),
    COALESCE(v_complexity_vector, '{}'::jsonb),
    COALESCE(v_goal_vector, '{}'::jsonb),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    interest_vector = EXCLUDED.interest_vector,
    tech_vector = EXCLUDED.tech_vector,
    complexity_vector = EXCLUDED.complexity_vector,
    goal_vector = EXCLUDED.goal_vector,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Recommendation Scoring Function
-- ============================================
CREATE OR REPLACE FUNCTION compute_repo_score(
  p_user_id TEXT,
  p_repo_id BIGINT
) RETURNS DECIMAL(5,4) AS $$
DECLARE
  v_interest_match DECIMAL(5,4) := 0.0;
  v_tech_match DECIMAL(5,4) := 0.0;
  v_complexity_match DECIMAL(5,4) := 0.0;
  v_popularity DECIMAL(5,4) := 0.0;
  v_health_weighted DECIMAL(5,4) := 0.0;
  v_freshness_weighted DECIMAL(5,4) := 0.0;
  v_gem_boost DECIMAL(5,4) := 0.0;
  v_final_score DECIMAL(5,4) := 0.0;
  
  v_user_vectors RECORD;
  v_repo_data RECORD;
  v_cluster_match DECIMAL(5,4);
  v_tech_overlap INTEGER;
  v_total_user_tech INTEGER;
  v_stars_normalized DECIMAL(5,4);
BEGIN
  -- Get user vectors
  SELECT * INTO v_user_vectors
  FROM user_vectors
  WHERE user_id = p_user_id;
  
  IF v_user_vectors IS NULL THEN
    RETURN 0.0;
  END IF;
  
  -- Get repo data (clusters, tech, complexity, health, activity, gems)
  SELECT 
    r.repo_id,
    r.stars,
    r.forks,
    COALESCE(h.health_score, 0.0) as health_score,
    COALESCE(a.freshness_score, 0.0) as freshness_score,
    COALESCE(a.activity_score, 0.0) as activity_score,
    CASE WHEN g.repo_id IS NOT NULL THEN true ELSE false END as is_gem
  INTO v_repo_data
  FROM repos_master r
  LEFT JOIN repo_health h ON r.repo_id = h.repo_id
  LEFT JOIN repo_activity a ON r.repo_id = a.repo_id
  LEFT JOIN repo_gems g ON r.repo_id = g.repo_id
  WHERE r.repo_id = p_repo_id
    AND r.archived = false; -- Exclude archived repos
  
  IF v_repo_data IS NULL THEN
    RETURN 0.0;
  END IF;
  
  -- Step 1: Interest Match Score (35%)
  WITH repo_clusters AS (
    SELECT cluster_slug, weight
    FROM repo_cluster_new
    WHERE repo_id = p_repo_id
    UNION ALL
    SELECT cluster_slug, weight
    FROM repo_clusters
    WHERE repo_id = p_repo_id
      AND NOT EXISTS (SELECT 1 FROM repo_cluster_new WHERE repo_id = p_repo_id)
  ),
  user_clusters AS (
    SELECT key as cluster, value::text::DECIMAL as weight
    FROM jsonb_each(v_user_vectors.interest_vector)
  )
  SELECT COALESCE(SUM(rc.weight * uc.weight), 0.0)
  INTO v_cluster_match
  FROM repo_clusters rc
  INNER JOIN user_clusters uc ON rc.cluster_slug = uc.cluster;
  
  v_interest_match := LEAST(v_cluster_match / 1.0, 1.0) * 0.35;
  
  -- Step 2: Tech Match Score (15%)
  SELECT COUNT(*) INTO v_tech_overlap
  FROM repo_tech_stack rts
  WHERE rts.repo_id = p_repo_id
    AND EXISTS (
      SELECT 1 FROM jsonb_each_text(v_user_vectors.tech_vector) 
      WHERE key = rts.tech_slug
    );
  
  SELECT COUNT(*) INTO v_total_user_tech
  FROM jsonb_each_text(v_user_vectors.tech_vector);
  
  IF v_total_user_tech > 0 THEN
    v_tech_match := (v_tech_overlap::DECIMAL / v_total_user_tech::DECIMAL) * 0.15;
  END IF;
  
  -- Step 3: Complexity Match Score (10%)
  WITH repo_complexity_data AS (
    SELECT complexity_slug
    FROM repo_complexity
    WHERE repo_id = p_repo_id
    LIMIT 1
  ),
  user_complexity_weights AS (
    SELECT value::text::DECIMAL as weight
    FROM jsonb_each(v_user_vectors.complexity_vector)
    WHERE key = (SELECT complexity_slug FROM repo_complexity_data)
  )
  SELECT COALESCE(MAX(weight), 0.0) INTO v_complexity_match
  FROM user_complexity_weights;
  
  v_complexity_match := v_complexity_match * 0.10;
  
  -- Step 4: Popularity Score (10%)
  -- Normalize stars (log scale: 0-100k stars -> 0-1 score)
  v_stars_normalized := LEAST(LOG(GREATEST(v_repo_data.stars, 1)) / LOG(100000), 1.0);
  v_popularity := v_stars_normalized * 0.10;
  
  -- Step 5: Health Score Weighted (20%)
  v_health_weighted := v_repo_data.health_score * 0.20;
  
  -- Step 6: Freshness Score Weighted (10%)
  v_freshness_weighted := v_repo_data.freshness_score * 0.10;
  
  -- Step 7: Gem Boost (0.05-0.10)
  IF v_repo_data.is_gem THEN
    v_gem_boost := 0.08; -- Boost for hidden gems
  END IF;
  
  -- Final Score
  v_final_score := 
    v_interest_match +
    v_tech_match +
    v_complexity_match +
    v_popularity +
    v_health_weighted +
    v_freshness_weighted +
    v_gem_boost;
  
  -- Clamp to 0-1
  RETURN LEAST(GREATEST(v_final_score, 0.0), 1.0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Precompute Recommendations Function
-- ============================================
CREATE OR REPLACE FUNCTION precompute_user_recommendations(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 500
) RETURNS INTEGER AS $$
DECLARE
  v_repo RECORD;
  v_score DECIMAL(5,4);
  v_rank INTEGER := 1;
  v_count INTEGER := 0;
  v_repo_metadata RECORD;
BEGIN
  -- Generate user vectors first
  PERFORM generate_user_vectors(p_user_id);
  
  -- Delete old recommendations
  DELETE FROM repo_recommendations_feed WHERE user_id = p_user_id;
  
  -- Get candidate repos (filtered pool)
  -- Filter by cluster AND language/tech_stack for better relevance
  FOR v_repo IN
    SELECT DISTINCT r.repo_id
    FROM repos_master r
    WHERE r.archived = false
      AND EXISTS (
        SELECT 1 FROM app_user_preferences up
        WHERE up.user_id = p_user_id
          AND (
            -- Match primary cluster
            EXISTS (
              SELECT 1 FROM repo_cluster_new rcn
              WHERE rcn.repo_id = r.repo_id 
                AND rcn.cluster_slug = up.primary_cluster
            )
            OR
            -- Match secondary clusters
            EXISTS (
              SELECT 1 FROM repo_cluster_new rcn
              WHERE rcn.repo_id = r.repo_id 
                AND rcn.cluster_slug = ANY(up.secondary_clusters)
            )
          )
          -- NEW: Also filter by language/tech_stack
          AND (
            -- Match user's tech_stack (languages)
            r.language = ANY(up.tech_stack)
            OR
            -- Match via repo_tech_stack table
            EXISTS (
              SELECT 1 FROM repo_tech_stack rts
              WHERE rts.repo_id = r.repo_id
                AND rts.tech_slug = ANY(up.tech_stack)
            )
            -- Allow if user has no tech preferences (show all)
            OR array_length(up.tech_stack, 1) IS NULL
          )
      )
    LIMIT 10000 -- Candidate pool limit
  LOOP
    -- Compute score
    v_score := compute_repo_score(p_user_id, v_repo.repo_id);
    
    -- Only include repos with meaningful scores (increased threshold for better relevance)
    IF v_score > 0.2 THEN
      -- Get repo metadata
      SELECT 
        r.repo_id,
        r.name,
        r.full_name,
        r.description,
        r.avatar_url,
        r.language,
        r.stars,
        r.forks,
        COALESCE(h.health_score, 0.0) as health_score,
        COALESCE(a.freshness_score, 0.0) as freshness_score,
        COALESCE(a.activity_score, 0.0) as activity_score,
        COALESCE(
          (SELECT jsonb_agg(badge_slug) FROM repo_badges WHERE repo_id = r.repo_id),
          '[]'::jsonb
        ) as badges
      INTO v_repo_metadata
      FROM repos_master r
      LEFT JOIN repo_health h ON r.repo_id = h.repo_id
      LEFT JOIN repo_activity a ON r.repo_id = a.repo_id
      WHERE r.repo_id = v_repo.repo_id;
      
      -- Insert into feed
      INSERT INTO repo_recommendations_feed (
        user_id,
        repo_id,
        repo_name,
        repo_full_name,
        description,
        avatar_url,
        language,
        stars,
        forks,
        health_score,
        freshness_score,
        activity_score,
        badges,
        final_score,
        rank,
        computed_at
      ) VALUES (
        p_user_id,
        v_repo_metadata.repo_id,
        v_repo_metadata.name,
        v_repo_metadata.full_name,
        v_repo_metadata.description,
        v_repo_metadata.avatar_url,
        v_repo_metadata.language,
        v_repo_metadata.stars,
        v_repo_metadata.forks,
        v_repo_metadata.health_score,
        v_repo_metadata.freshness_score,
        v_repo_metadata.activity_score,
        v_repo_metadata.badges,
        v_score,
        v_rank,
        NOW()
      );
      
      v_rank := v_rank + 1;
      v_count := v_count + 1;
      
      -- Stop at limit
      IF v_count >= p_limit THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Trigger: Auto-recompute on preference change
-- ============================================
CREATE OR REPLACE FUNCTION trigger_recompute_recommendations()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically recompute recommendations when preferences change
  -- This runs synchronously but can be optimized later with async workers
  -- For now, we trigger it directly to ensure recommendations are updated
  PERFORM precompute_user_recommendations(NEW.user_id, 500);
  
  -- Also send notification for any external workers/listeners
  PERFORM pg_notify('user_preferences_changed', NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_preferences_change
  AFTER INSERT OR UPDATE ON app_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_recommendations();

-- ============================================
-- 6. Helper: Get recommendations (ultra-fast query)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_recommendations(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  repo_id BIGINT,
  repo_name TEXT,
  repo_full_name TEXT,
  description TEXT,
  avatar_url TEXT,
  language TEXT,
  stars INTEGER,
  forks INTEGER,
  health_score DECIMAL(3,2),
  freshness_score DECIMAL(3,2),
  badges JSONB,
  final_score DECIMAL(5,4),
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf.repo_id,
    rf.repo_name,
    rf.repo_full_name,
    rf.description,
    rf.avatar_url,
    rf.language,
    rf.stars,
    rf.forks,
    rf.health_score,
    rf.freshness_score,
    rf.badges,
    rf.final_score,
    rf.rank
  FROM repo_recommendations_feed rf
  WHERE rf.user_id = p_user_id
  ORDER BY rf.rank ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
