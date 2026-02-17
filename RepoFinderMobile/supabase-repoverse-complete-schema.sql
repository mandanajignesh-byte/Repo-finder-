-- ============================================
-- Repoverse Complete Database Schema
-- Production-ready schema for repository discovery and recommendations
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- 1. REPOSITORIES - Master Table
-- ============================================
CREATE TABLE IF NOT EXISTS repos_master (
  repo_id BIGINT PRIMARY KEY, -- GitHub ID
  name TEXT NOT NULL,
  full_name TEXT NOT NULL UNIQUE,
  description TEXT,
  owner_login TEXT NOT NULL,
  avatar_url TEXT,
  html_url TEXT NOT NULL,
  language TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  topics JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  size_kb INTEGER,
  default_branch TEXT,
  license TEXT,
  archived BOOLEAN DEFAULT FALSE,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT repos_master_full_name_key UNIQUE (full_name)
);

CREATE INDEX IF NOT EXISTS idx_repos_master_language ON repos_master(language);
CREATE INDEX IF NOT EXISTS idx_repos_master_stars ON repos_master(stars DESC);
CREATE INDEX IF NOT EXISTS idx_repos_master_owner ON repos_master(owner_login);
CREATE INDEX IF NOT EXISTS idx_repos_master_topics ON repos_master USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_repos_master_ingested_at ON repos_master(ingested_at DESC);

-- ============================================
-- 2. REPO CLUSTERS (Interest Tagging)
-- ============================================
CREATE TABLE IF NOT EXISTS repo_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  cluster_slug TEXT NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(repo_id, cluster_slug)
);

CREATE INDEX IF NOT EXISTS idx_repo_clusters_repo_id ON repo_clusters(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_slug ON repo_clusters(cluster_slug);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_weight ON repo_clusters(weight DESC);

-- ============================================
-- 3. REPO TECH STACK
-- ============================================
CREATE TABLE IF NOT EXISTS repo_tech_stack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  tech_slug TEXT NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(repo_id, tech_slug)
);

CREATE INDEX IF NOT EXISTS idx_repo_tech_stack_repo_id ON repo_tech_stack(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_tech_stack_tech_slug ON repo_tech_stack(tech_slug);
CREATE INDEX IF NOT EXISTS idx_repo_tech_stack_weight ON repo_tech_stack(weight DESC);

-- ============================================
-- 4. REPO COMPLEXITY CLASSIFICATION
-- ============================================
CREATE TABLE IF NOT EXISTS repo_complexity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  complexity_slug TEXT NOT NULL CHECK (complexity_slug IN ('tutorial', 'boilerplate', 'full_app', 'production_saas', 'infrastructure', 'framework')),
  confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  loc_bucket TEXT CHECK (loc_bucket IN ('small', 'medium', 'large', 'xlarge')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(repo_id, complexity_slug)
);

CREATE INDEX IF NOT EXISTS idx_repo_complexity_repo_id ON repo_complexity(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_complexity_slug ON repo_complexity(complexity_slug);
CREATE INDEX IF NOT EXISTS idx_repo_complexity_loc_bucket ON repo_complexity(loc_bucket);

-- ============================================
-- 5. REPO HEALTH SCORING
-- ============================================
CREATE TABLE IF NOT EXISTS repo_health (
  repo_id BIGINT PRIMARY KEY REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  activity_score DECIMAL(3,2) DEFAULT 0.0 CHECK (activity_score >= 0 AND activity_score <= 1),
  maintenance_score DECIMAL(3,2) DEFAULT 0.0 CHECK (maintenance_score >= 0 AND maintenance_score <= 1),
  community_score DECIMAL(3,2) DEFAULT 0.0 CHECK (community_score >= 0 AND community_score <= 1),
  code_quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (code_quality_score >= 0 AND code_quality_score <= 1),
  documentation_score DECIMAL(3,2) DEFAULT 0.0 CHECK (documentation_score >= 0 AND documentation_score <= 1),
  stability_score DECIMAL(3,2) DEFAULT 0.0 CHECK (stability_score >= 0 AND stability_score <= 1),
  health_score DECIMAL(3,2) DEFAULT 0.0 CHECK (health_score >= 0 AND health_score <= 1),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_health_score ON repo_health(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_health_computed_at ON repo_health(computed_at DESC);

-- ============================================
-- 6. REPO BADGES SYSTEM
-- ============================================
-- Badge Definitions
CREATE TABLE IF NOT EXISTS badge_definitions (
  badge_slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repo Badge Mapping
CREATE TABLE IF NOT EXISTS repo_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  badge_slug TEXT NOT NULL REFERENCES badge_definitions(badge_slug) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(repo_id, badge_slug)
);

CREATE INDEX IF NOT EXISTS idx_repo_badges_repo_id ON repo_badges(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_badges_badge_slug ON repo_badges(badge_slug);
CREATE INDEX IF NOT EXISTS idx_repo_badges_awarded_at ON repo_badges(awarded_at DESC);

-- Insert default badge definitions
INSERT INTO badge_definitions (badge_slug, name, description, icon, color) VALUES
  ('well_maintained', 'Well Maintained', 'Active development and regular updates', 'shield-check', '#10b981'),
  ('beginner_friendly', 'Beginner Friendly', 'Great for learning and tutorials', 'book-open', '#3b82f6'),
  ('trending', 'Trending', 'Rapidly gaining stars and attention', 'trending-up', '#f59e0b'),
  ('production_ready', 'Production Ready', 'Stable and ready for production use', 'check-circle', '#8b5cf6'),
  ('high_quality', 'High Quality', 'Excellent code quality and documentation', 'star', '#ec4899'),
  ('popular', 'Popular', 'Widely used and recognized', 'users', '#06b6d4')
ON CONFLICT (badge_slug) DO NOTHING;

-- ============================================
-- 7. USER ONBOARDING STORAGE
-- ============================================
-- User Profile
CREATE TABLE IF NOT EXISTS user_profile (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  email TEXT,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  complexity_vector JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_skill_level ON user_profile(skill_level);
CREATE INDEX IF NOT EXISTS idx_user_profile_onboarding ON user_profile(onboarding_completed);

-- User Interests
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  interest_slug TEXT NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  selected_rank INTEGER, -- 1 = first choice, 2 = second, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, interest_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_slug ON user_interests(interest_slug);
CREATE INDEX IF NOT EXISTS idx_user_interests_weight ON user_interests(weight DESC);

-- User Tech Stack
CREATE TABLE IF NOT EXISTS user_tech_stack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  tech_slug TEXT NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, tech_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_tech_stack_user_id ON user_tech_stack(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tech_stack_slug ON user_tech_stack(tech_slug);
CREATE INDEX IF NOT EXISTS idx_user_tech_stack_weight ON user_tech_stack(weight DESC);

-- User Goals
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  goal_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, goal_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_slug ON user_goals(goal_slug);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  repo_size_pref TEXT CHECK (repo_size_pref IN ('small', 'medium', 'large')),
  size_weight DECIMAL(3,2) DEFAULT 0.6 CHECK (size_weight >= 0 AND size_weight <= 1),
  trend_pref TEXT DEFAULT 'medium' CHECK (trend_pref IN ('low', 'medium', 'high')),
  time_availability TEXT DEFAULT 'medium' CHECK (time_availability IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. USER VECTORS (Recommendation Brain)
-- ============================================
CREATE TABLE IF NOT EXISTS user_vectors (
  user_id TEXT PRIMARY KEY,
  interest_vector JSONB DEFAULT '{}'::jsonb,
  tech_vector JSONB DEFAULT '{}'::jsonb,
  complexity_vector JSONB DEFAULT '{}'::jsonb,
  goal_vector JSONB DEFAULT '{}'::jsonb,
  behavior_vector JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vectors_updated_at ON user_vectors(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_vectors_interest ON user_vectors USING GIN(interest_vector);
CREATE INDEX IF NOT EXISTS idx_user_vectors_tech ON user_vectors USING GIN(tech_vector);

-- ============================================
-- 9. INTERACTION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS repo_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('click', 'star', 'bookmark', 'view_time', 'fork', 'like', 'skip', 'save', 'share')),
  interaction_value DECIMAL(10,2), -- For view_time (seconds), or 1.0 for binary actions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_interactions_user_id ON repo_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_interactions_repo_id ON repo_interactions(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_interactions_type ON repo_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_repo_interactions_created_at ON repo_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_interactions_user_repo ON repo_interactions(user_id, repo_id);

-- Unique constraint: One interaction per user/repo/type per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_repo_interactions_unique_daily 
ON repo_interactions(user_id, repo_id, interaction_type, DATE(created_at));

-- ============================================
-- 10. RECOMMENDATION STORAGE
-- ============================================
CREATE TABLE IF NOT EXISTS repo_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  score DECIMAL(10,6) NOT NULL,
  interest_match DECIMAL(10,6) DEFAULT 0.0,
  tech_match DECIMAL(10,6) DEFAULT 0.0,
  complexity_match DECIMAL(10,6) DEFAULT 0.0,
  health_boost DECIMAL(10,6) DEFAULT 0.0,
  freshness_boost DECIMAL(10,6) DEFAULT 0.0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  UNIQUE(user_id, repo_id, version)
);

CREATE INDEX IF NOT EXISTS idx_repo_recommendations_user_id ON repo_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_recommendations_score ON repo_recommendations(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_recommendations_computed_at ON repo_recommendations(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_recommendations_version ON repo_recommendations(version DESC);

-- ============================================
-- 11. USER CURRENT PROJECTS (Optional)
-- ============================================
CREATE TABLE IF NOT EXISTS user_current_projects (
  user_id TEXT PRIMARY KEY,
  text_input TEXT,
  extracted_clusters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. GITHUB DATA (Optional - for connected users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_github_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  repo_id BIGINT NOT NULL REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('starred', 'forked', 'contributed', 'watching')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, repo_id, interaction_type)
);

CREATE INDEX IF NOT EXISTS idx_user_github_data_user_id ON user_github_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_github_data_repo_id ON user_github_data(repo_id);
CREATE INDEX IF NOT EXISTS idx_user_github_data_type ON user_github_data(interaction_type);

-- ============================================
-- 13. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_repo_health_updated_at
  BEFORE UPDATE ON repo_health
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_vectors_updated_at
  BEFORE UPDATE ON user_vectors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_current_projects_updated_at
  BEFORE UPDATE ON user_current_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 14. VIEWS FOR COMMON QUERIES
-- ============================================

-- View: User Feed (recommendations with repo details)
CREATE OR REPLACE VIEW user_feed_view AS
SELECT 
  rr.user_id,
  rr.repo_id,
  rr.score,
  rr.interest_match,
  rr.tech_match,
  rr.complexity_match,
  rr.health_boost,
  r.name,
  r.full_name,
  r.description,
  r.owner_login,
  r.avatar_url,
  r.html_url,
  r.language,
  r.stars,
  r.forks,
  r.topics,
  rh.health_score,
  rr.computed_at
FROM repo_recommendations rr
JOIN repos_master r ON rr.repo_id = r.repo_id
LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id
WHERE rr.version = (SELECT MAX(version) FROM repo_recommendations WHERE user_id = rr.user_id);

-- View: Repo with all metadata
CREATE OR REPLACE VIEW repo_full_view AS
SELECT 
  r.*,
  rh.health_score,
  rh.activity_score,
  rh.maintenance_score,
  rh.community_score,
  rh.code_quality_score,
  rh.documentation_score,
  rh.stability_score,
  COALESCE(
    (SELECT array_agg(cluster_slug) FROM repo_clusters WHERE repo_id = r.repo_id),
    ARRAY[]::TEXT[]
  ) as clusters,
  COALESCE(
    (SELECT array_agg(tech_slug) FROM repo_tech_stack WHERE repo_id = r.repo_id),
    ARRAY[]::TEXT[]
  ) as tech_stack,
  COALESCE(
    (SELECT array_agg(complexity_slug) FROM repo_complexity WHERE repo_id = r.repo_id),
    ARRAY[]::TEXT[]
  ) as complexity_tags,
  COALESCE(
    (SELECT array_agg(badge_slug) FROM repo_badges WHERE repo_id = r.repo_id),
    ARRAY[]::TEXT[]
  ) as badges
FROM repos_master r
LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id;

-- ============================================
-- 15. EXAMPLE QUERIES (Commented)
-- ============================================

/*
-- Get user feed (top 20 recommendations)
SELECT * FROM user_feed_view
WHERE user_id = 'user_123'
ORDER BY score DESC
LIMIT 20;

-- Get repos matching user interests
SELECT DISTINCT r.*, rc.weight as interest_weight
FROM repos_master r
JOIN repo_clusters rc ON r.repo_id = rc.repo_id
JOIN user_interests ui ON rc.cluster_slug = ui.interest_slug
WHERE ui.user_id = 'user_123'
ORDER BY rc.weight DESC, r.stars DESC
LIMIT 50;

-- Get repos matching tech stack
SELECT DISTINCT r.*, rts.weight as tech_weight
FROM repos_master r
JOIN repo_tech_stack rts ON r.repo_id = rts.repo_id
JOIN user_tech_stack uts ON rts.tech_slug = uts.tech_slug
WHERE uts.user_id = 'user_123'
ORDER BY rts.weight DESC, r.stars DESC
LIMIT 50;

-- Get user interaction history
SELECT r.*, ri.interaction_type, ri.created_at
FROM repo_interactions ri
JOIN repos_master r ON ri.repo_id = r.repo_id
WHERE ri.user_id = 'user_123'
ORDER BY ri.created_at DESC
LIMIT 50;

-- Get repos by health score
SELECT * FROM repo_full_view
WHERE health_score >= 0.8
ORDER BY stars DESC
LIMIT 50;
*/

-- ============================================
-- END OF SCHEMA
-- ============================================
