-- ============================================
-- Recommendations Feed Table
-- Precomputed recommendations for ultra-fast feed delivery
-- ============================================

-- User Vectors Table (stores computed user preference vectors)
CREATE TABLE IF NOT EXISTS user_vectors (
  user_id TEXT PRIMARY KEY,
  interest_vector JSONB DEFAULT '{}'::jsonb,
  tech_vector JSONB DEFAULT '{}'::jsonb,
  complexity_vector JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vectors_computed_at ON user_vectors(computed_at DESC);

-- Recommendations Feed Table (precomputed recommendations per user)
CREATE TABLE IF NOT EXISTS repo_recommendations_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  
  -- Precomputed scores (for fast sorting)
  final_score DECIMAL(5,4) NOT NULL CHECK (final_score >= 0 AND final_score <= 1),
  interest_match_score DECIMAL(5,4) DEFAULT 0,
  tech_match_score DECIMAL(5,4) DEFAULT 0,
  complexity_match_score DECIMAL(5,4) DEFAULT 0,
  popularity_score DECIMAL(5,4) DEFAULT 0,
  health_score DECIMAL(5,4) DEFAULT 0,
  freshness_score DECIMAL(5,4) DEFAULT 0,
  gem_boost DECIMAL(5,4) DEFAULT 0,
  
  -- Rank position (1 = best match)
  rank INTEGER NOT NULL,
  
  -- Denormalized repo data (for instant feed without joins)
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  stars INTEGER DEFAULT 0,
  language TEXT,
  health_score_denorm DECIMAL(3,2) DEFAULT 0,
  freshness_score_denorm DECIMAL(3,2) DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, repo_id)
);

-- Critical indexes for ultra-fast queries
CREATE INDEX IF NOT EXISTS idx_recommendations_feed_user_rank 
  ON repo_recommendations_feed(user_id, rank ASC);

CREATE INDEX IF NOT EXISTS idx_recommendations_feed_user_score 
  ON repo_recommendations_feed(user_id, final_score DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_feed_computed_at 
  ON repo_recommendations_feed(computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_feed_repo_id 
  ON repo_recommendations_feed(repo_id);

-- Function to clean old recommendations (keep only latest)
CREATE OR REPLACE FUNCTION cleanup_old_recommendations()
RETURNS void AS $$
BEGIN
  -- Delete recommendations older than 7 days
  DELETE FROM repo_recommendations_feed
  WHERE computed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get user feed (ultra-fast query)
CREATE OR REPLACE FUNCTION get_user_feed(
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
  stars INTEGER,
  language TEXT,
  health_score DECIMAL,
  freshness_score DECIMAL,
  badges JSONB,
  final_score DECIMAL,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rrf.repo_id,
    rrf.repo_name,
    rrf.repo_full_name,
    rrf.description,
    rrf.avatar_url,
    rrf.stars,
    rrf.language,
    rrf.health_score_denorm,
    rrf.freshness_score_denorm,
    rrf.badges,
    rrf.final_score,
    rrf.rank
  FROM repo_recommendations_feed rrf
  WHERE rrf.user_id = p_user_id
  ORDER BY rrf.rank ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
