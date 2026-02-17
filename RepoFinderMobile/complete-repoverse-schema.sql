-- ============================================
-- Repoverse Complete Database Schema
-- All tables in correct dependency order
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Repos Master Storage
-- ============================================
CREATE TABLE IF NOT EXISTS repos_master (
  repo_id BIGINT PRIMARY KEY,
  name TEXT,
  full_name TEXT UNIQUE,
  description TEXT,
  owner_login TEXT,
  avatar_url TEXT,
  html_url TEXT,
  language TEXT,
  stars INTEGER,
  forks INTEGER,
  watchers INTEGER,
  open_issues INTEGER,
  topics JSONB DEFAULT '[]'::jsonb,
  size_kb INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  last_commit_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT FALSE,
  license TEXT,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repos_master_language ON repos_master(language);
CREATE INDEX IF NOT EXISTS idx_repos_master_stars ON repos_master(stars DESC);
CREATE INDEX IF NOT EXISTS idx_repos_master_last_commit_at ON repos_master(last_commit_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_repos_master_topics ON repos_master USING GIN(topics);

-- ============================================
-- STEP 2: Repo Clustering (Interests)
-- ============================================
CREATE TABLE IF NOT EXISTS repo_cluster_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id BIGINT REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  cluster_slug TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, cluster_slug)
);

CREATE INDEX IF NOT EXISTS idx_repo_cluster_new_repo_id ON repo_cluster_new(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_cluster_new_cluster_slug ON repo_cluster_new(cluster_slug);
CREATE INDEX IF NOT EXISTS idx_repo_cluster_new_weight ON repo_cluster_new(weight DESC);

-- ============================================
-- STEP 3: Repo Tech Stack
-- ============================================
CREATE TABLE IF NOT EXISTS repo_tech_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id BIGINT REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  tech_slug TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  UNIQUE(repo_id, tech_slug)
);

CREATE INDEX IF NOT EXISTS idx_repo_tech_stack_repo_id ON repo_tech_stack(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_tech_stack_tech_slug ON repo_tech_stack(tech_slug);
CREATE INDEX IF NOT EXISTS idx_repo_tech_stack_weight ON repo_tech_stack(weight DESC);

-- ============================================
-- STEP 4: Repo Complexity Classification
-- ============================================
CREATE TABLE IF NOT EXISTS repo_complexity (
  repo_id BIGINT PRIMARY KEY REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  complexity_slug TEXT NOT NULL CHECK (complexity_slug IN ('tutorial', 'boilerplate', 'full_app', 'production_saas', 'infrastructure', 'framework')),
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  loc_bucket TEXT CHECK (loc_bucket IN ('small', 'medium', 'large', 'xlarge')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_complexity_slug ON repo_complexity(complexity_slug);
CREATE INDEX IF NOT EXISTS idx_repo_complexity_loc_bucket ON repo_complexity(loc_bucket);

-- ============================================
-- STEP 5: Repo Activity & Freshness
-- ============================================
CREATE TABLE IF NOT EXISTS repo_activity (
  repo_id BIGINT PRIMARY KEY REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  last_commit_at TIMESTAMPTZ,
  commits_30_days INTEGER DEFAULT 0,
  commits_90_days INTEGER DEFAULT 0,
  commit_velocity FLOAT DEFAULT 0.0,
  freshness_score FLOAT DEFAULT 0.0 CHECK (freshness_score >= 0 AND freshness_score <= 1),
  activity_score FLOAT DEFAULT 0.0 CHECK (activity_score >= 0 AND activity_score <= 1),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_activity_last_commit_at ON repo_activity(last_commit_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_activity_freshness_score ON repo_activity(freshness_score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_activity_activity_score ON repo_activity(activity_score DESC);

-- ============================================
-- STEP 6: Repo Health Scoring
-- ============================================
CREATE TABLE IF NOT EXISTS repo_health (
  repo_id BIGINT PRIMARY KEY REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  activity_score FLOAT DEFAULT 0.0 CHECK (activity_score >= 0 AND activity_score <= 1),
  maintenance_score FLOAT DEFAULT 0.0 CHECK (maintenance_score >= 0 AND maintenance_score <= 1),
  community_score FLOAT DEFAULT 0.0 CHECK (community_score >= 0 AND community_score <= 1),
  code_quality_score FLOAT DEFAULT 0.0 CHECK (code_quality_score >= 0 AND code_quality_score <= 1),
  documentation_score FLOAT DEFAULT 0.0 CHECK (documentation_score >= 0 AND documentation_score <= 1),
  stability_score FLOAT DEFAULT 0.0 CHECK (stability_score >= 0 AND stability_score <= 1),
  health_score FLOAT DEFAULT 0.0 CHECK (health_score >= 0 AND health_score <= 1),
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_health_score ON repo_health(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_health_computed_at ON repo_health(computed_at DESC);

-- ============================================
-- STEP 7: Repo Badges
-- ============================================
-- Badge Definitions
CREATE TABLE IF NOT EXISTS badge_definitions (
  badge_slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT
);

-- Repo Badge Mapping
CREATE TABLE IF NOT EXISTS repo_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id BIGINT REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  badge_slug TEXT REFERENCES badge_definitions(badge_slug) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, badge_slug)
);

CREATE INDEX IF NOT EXISTS idx_repo_badges_repo_id ON repo_badges(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_badges_badge_slug ON repo_badges(badge_slug);

-- Insert default badge definitions
INSERT INTO badge_definitions (badge_slug, name, description, icon, color) VALUES
  ('well_maintained', 'Well Maintained', 'Active development and regular updates', 'shield-check', '#10b981'),
  ('actively_updated', 'Actively Updated', 'Recently updated within last 30 days', 'activity', '#3b82f6'),
  ('beginner_friendly', 'Beginner Friendly', 'Great for learning and tutorials', 'book-open', '#8b5cf6'),
  ('production_ready', 'Production Ready', 'Stable and ready for production use', 'check-circle', '#10b981'),
  ('trending_now', 'Trending Now', 'Rapidly gaining stars and attention', 'trending-up', '#f59e0b')
ON CONFLICT (badge_slug) DO NOTHING;

-- ============================================
-- STEP 8: User Onboarding Tables
-- ============================================
-- User Profile
CREATE TABLE IF NOT EXISTS user_profile (
  user_id UUID PRIMARY KEY,
  username TEXT,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  repo_complexity_pref TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_skill_level ON user_profile(skill_level);
CREATE INDEX IF NOT EXISTS idx_user_profile_onboarding ON user_profile(onboarding_completed);

-- User Interests
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  interest_slug TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  selected_rank INTEGER,
  UNIQUE(user_id, interest_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_slug ON user_interests(interest_slug);
CREATE INDEX IF NOT EXISTS idx_user_interests_weight ON user_interests(weight DESC);

-- User Tech Stack
CREATE TABLE IF NOT EXISTS user_tech_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  tech_slug TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  UNIQUE(user_id, tech_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_tech_stack_user_id ON user_tech_stack(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tech_stack_slug ON user_tech_stack(tech_slug);
CREATE INDEX IF NOT EXISTS idx_user_tech_stack_weight ON user_tech_stack(weight DESC);

-- User Goals
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  goal_slug TEXT NOT NULL,
  UNIQUE(user_id, goal_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_slug ON user_goals(goal_slug);

-- ============================================
-- STEP 9: User Vectors
-- ============================================
CREATE TABLE IF NOT EXISTS user_vectors (
  user_id UUID PRIMARY KEY REFERENCES user_profile(user_id) ON DELETE CASCADE,
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
-- STEP 10: Interaction Tracking
-- ============================================
-- First, create the immutable function needed for the index
CREATE OR REPLACE FUNCTION date_only(timestamp_value TIMESTAMPTZ)
RETURNS DATE AS $$
BEGIN
  RETURN timestamp_value::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE IF NOT EXISTS repo_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  repo_id BIGINT REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('click', 'bookmark', 'star', 'view_time', 'fork', 'like', 'skip', 'save', 'share')),
  interaction_value FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_interactions_user_id ON repo_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_interactions_repo_id ON repo_interactions(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_interactions_type ON repo_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_repo_interactions_created_at ON repo_interactions(created_at DESC);

-- Unique constraint: One interaction per user/repo/type per day
-- Using immutable function for index compatibility
CREATE UNIQUE INDEX IF NOT EXISTS idx_repo_interactions_unique_daily 
ON repo_interactions(user_id, repo_id, interaction_type, date_only(created_at));

-- ============================================
-- STEP 11: Recommendation Storage
-- ============================================
CREATE TABLE IF NOT EXISTS repo_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  repo_id BIGINT REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  score FLOAT NOT NULL,
  interest_match FLOAT DEFAULT 0.0,
  tech_match FLOAT DEFAULT 0.0,
  complexity_match FLOAT DEFAULT 0.0,
  health_boost FLOAT DEFAULT 0.0,
  freshness_boost FLOAT DEFAULT 0.0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, repo_id, version)
);

CREATE INDEX IF NOT EXISTS idx_repo_recommendations_user_id ON repo_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_recommendations_score ON repo_recommendations(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_recommendations_computed_at ON repo_recommendations(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_recommendations_version ON repo_recommendations(version DESC);

-- ============================================
-- Helper Functions
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
CREATE TRIGGER update_repo_activity_updated_at
  BEFORE UPDATE ON repo_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Verification Query
-- ============================================
-- Run this after creating tables to verify:
/*
SELECT 
  table_name,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_name = t.table_name 
   AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'repos_master',
    'repo_cluster_new',
    'repo_tech_stack',
    'repo_complexity',
    'repo_activity',
    'repo_health',
    'badge_definitions',
    'repo_badges',
    'user_profile',
    'user_interests',
    'user_tech_stack',
    'user_goals',
    'user_vectors',
    'repo_interactions',
    'repo_recommendations'
  )
ORDER BY table_name;
*/

-- ============================================
-- Example Feed Query (from STEP 14)
-- ============================================
/*
SELECT
  r.name,
  r.description,
  rr.score,
  rh.health_score,
  ra.freshness_score
FROM repo_recommendations rr
JOIN repos_master r ON rr.repo_id = r.repo_id
LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id
LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id
WHERE rr.user_id = 'USER_ID'
ORDER BY rr.score DESC
LIMIT 20;
*/

-- ============================================
-- END OF SCHEMA
-- ============================================
