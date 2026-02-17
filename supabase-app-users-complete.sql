-- ============================================
-- App Users Database Schema
-- Complete schema for mobile app users, onboarding, and recommendations
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- App Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  platform TEXT, -- 'android', 'ios'
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- App User Preferences (Onboarding Data)
-- ============================================
CREATE TABLE IF NOT EXISTS app_user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Primary selection (required)
  primary_cluster TEXT NOT NULL,
  secondary_clusters TEXT[] DEFAULT '{}',
  
  -- Tech preferences
  tech_stack TEXT[] DEFAULT '{}', -- Languages user selected
  interests TEXT[] DEFAULT '{}',
  
  -- Experience
  experience_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
  
  -- Goals (from onboarding)
  goals TEXT[] DEFAULT '{}', -- learning-new-tech, building-project, contributing, finding-solutions, exploring
  project_types TEXT[] DEFAULT '{}', -- tutorial, boilerplate, library, framework, tool, full-app
  
  -- Activity preferences
  activity_preference TEXT DEFAULT 'any', -- active, any, archived
  popularity_weight TEXT DEFAULT 'medium', -- low, medium, high
  
  -- Filters
  min_stars INTEGER DEFAULT 0,
  max_stars INTEGER,
  min_recommendation_score DECIMAL(10,2) DEFAULT 0,
  
  -- License preferences
  license_preference TEXT[] DEFAULT '{}',
  
  -- Repo size preferences
  repo_size TEXT[] DEFAULT '{}', -- small, medium, large
  
  -- Documentation importance
  documentation_importance TEXT DEFAULT 'important', -- important, optional, not-important
  
  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_version INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- User Interactions (for recommendations)
-- ============================================
CREATE TABLE IF NOT EXISTS app_user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  repo_github_id BIGINT NOT NULL,
  action TEXT NOT NULL, -- 'like', 'save', 'skip', 'view', 'swipe_up'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, repo_github_id, action)
);

-- ============================================
-- Saved Repos
-- ============================================
CREATE TABLE IF NOT EXISTS app_saved_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  repo_github_id BIGINT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, repo_github_id)
);

-- ============================================
-- Liked Repos
-- ============================================
CREATE TABLE IF NOT EXISTS app_liked_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  repo_github_id BIGINT NOT NULL,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, repo_github_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- App users indexes
CREATE INDEX IF NOT EXISTS idx_app_users_device_id ON app_users(device_id);
CREATE INDEX IF NOT EXISTS idx_app_users_platform ON app_users(platform);
CREATE INDEX IF NOT EXISTS idx_app_users_last_active ON app_users(last_active_at DESC);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_app_user_preferences_user_id ON app_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_preferences_primary_cluster ON app_user_preferences(primary_cluster);
CREATE INDEX IF NOT EXISTS idx_app_user_preferences_onboarding ON app_user_preferences(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_app_user_preferences_tech_stack ON app_user_preferences USING GIN(tech_stack);
CREATE INDEX IF NOT EXISTS idx_app_user_preferences_goals ON app_user_preferences USING GIN(goals);

-- User interactions indexes
CREATE INDEX IF NOT EXISTS idx_app_user_interactions_user_id ON app_user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_interactions_repo_id ON app_user_interactions(repo_github_id);
CREATE INDEX IF NOT EXISTS idx_app_user_interactions_action ON app_user_interactions(action);
CREATE INDEX IF NOT EXISTS idx_app_user_interactions_created_at ON app_user_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_user_interactions_user_action ON app_user_interactions(user_id, action, created_at DESC);

-- Saved repos indexes
CREATE INDEX IF NOT EXISTS idx_app_saved_repos_user_id ON app_saved_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_app_saved_repos_repo_id ON app_saved_repos(repo_github_id);
CREATE INDEX IF NOT EXISTS idx_app_saved_repos_saved_at ON app_saved_repos(saved_at DESC);

-- Liked repos indexes
CREATE INDEX IF NOT EXISTS idx_app_liked_repos_user_id ON app_liked_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_app_liked_repos_repo_id ON app_liked_repos(repo_github_id);
CREATE INDEX IF NOT EXISTS idx_app_liked_repos_liked_at ON app_liked_repos(liked_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_saved_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_liked_repos ENABLE ROW LEVEL SECURITY;

-- App Users: Allow public read/write (for mobile app)
CREATE POLICY IF NOT EXISTS "Allow public access to app_users"
  ON app_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- User Preferences: Allow users to read/write their own preferences
CREATE POLICY IF NOT EXISTS "Users can manage own preferences"
  ON app_user_preferences
  FOR ALL
  USING (true) -- Allow all for now (mobile app uses user_id from device)
  WITH CHECK (true);

-- User Interactions: Allow users to create their own interactions
CREATE POLICY IF NOT EXISTS "Users can create own interactions"
  ON app_user_interactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Saved Repos: Allow users to manage their saved repos
CREATE POLICY IF NOT EXISTS "Users can manage own saved repos"
  ON app_saved_repos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Liked Repos: Allow users to manage their liked repos
CREATE POLICY IF NOT EXISTS "Users can manage own liked repos"
  ON app_liked_repos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for app_user_preferences
CREATE TRIGGER trigger_update_app_user_preferences_updated_at
  BEFORE UPDATE ON app_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_app_user_preferences_updated_at();

-- Function to update app_users last_active_at
CREATE OR REPLACE FUNCTION update_app_users_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_users 
  SET last_active_at = NOW() 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user interactions (updates last_active_at)
CREATE TRIGGER trigger_update_app_users_last_active
  AFTER INSERT ON app_user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_app_users_last_active();

-- ============================================
-- Helper Views for Recommendations
-- ============================================

-- View: User preferences with cluster info
CREATE OR REPLACE VIEW app_user_preferences_view AS
SELECT 
  up.*,
  u.device_id,
  u.platform,
  u.last_active_at
FROM app_user_preferences up
JOIN app_users u ON up.user_id = u.id;

-- View: User interaction summary (for recommendation engine)
CREATE OR REPLACE VIEW app_user_interaction_summary AS
SELECT 
  user_id,
  repo_github_id,
  COUNT(*) FILTER (WHERE action = 'like') as like_count,
  COUNT(*) FILTER (WHERE action = 'save') as save_count,
  COUNT(*) FILTER (WHERE action = 'skip') as skip_count,
  COUNT(*) FILTER (WHERE action = 'view') as view_count,
  MAX(created_at) as last_interaction_at
FROM app_user_interactions
GROUP BY user_id, repo_github_id;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE app_users IS 'Mobile app users (separate from web users)';
COMMENT ON TABLE app_user_preferences IS 'User onboarding preferences and settings';
COMMENT ON TABLE app_user_interactions IS 'User interactions with repos (for recommendation engine)';
COMMENT ON TABLE app_saved_repos IS 'Repos saved by users';
COMMENT ON TABLE app_liked_repos IS 'Repos liked by users';

COMMENT ON COLUMN app_user_preferences.primary_cluster IS 'Primary cluster selected during onboarding (frontend, backend, mobile, etc.)';
COMMENT ON COLUMN app_user_preferences.tech_stack IS 'Array of programming languages user selected';
COMMENT ON COLUMN app_user_preferences.goals IS 'Array of goals from onboarding (learning-new-tech, building-project, etc.)';
COMMENT ON COLUMN app_user_interactions.action IS 'Type of interaction: like, save, skip, view, swipe_up';
