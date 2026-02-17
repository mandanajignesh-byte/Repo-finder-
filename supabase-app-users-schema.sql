-- ============================================
-- App Users Database Schema
-- Separate schema for mobile app users
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- App Users table (separate from web users)
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT,
  device_id TEXT,
  platform TEXT, -- 'android', 'ios'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- App User Preferences (matches repos structure)
CREATE TABLE IF NOT EXISTS app_user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Primary selection
  primary_cluster TEXT NOT NULL,
  secondary_clusters TEXT[] DEFAULT '{}',
  
  -- Tech preferences
  preferred_languages TEXT[] DEFAULT '{}',
  preferred_topics TEXT[] DEFAULT '{}',
  
  -- Experience
  experience_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
  activity_preference TEXT DEFAULT 'any', -- active, any, archived
  
  -- Goals
  goals TEXT[] DEFAULT '{}', -- learning, building, contributing, exploring
  
  -- Filters
  min_stars INTEGER DEFAULT 0,
  max_stars INTEGER,
  min_recommendation_score DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_version INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_users_device_id ON app_users(device_id);
CREATE INDEX IF NOT EXISTS idx_app_user_preferences_user_id ON app_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_preferences_primary_cluster ON app_user_preferences(primary_cluster);
CREATE INDEX IF NOT EXISTS idx_app_user_preferences_onboarding ON app_user_preferences(onboarding_completed);

-- RLS Policies (public read for repos, user-specific for preferences)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_preferences ENABLE ROW LEVEL SECURITY;

-- Allow public read for repos (already done, but ensure it exists)
-- Allow users to read/write their own preferences
CREATE POLICY IF NOT EXISTS "Users can read own preferences" 
  ON app_user_preferences FOR SELECT 
  USING (auth.uid()::text = user_id OR true); -- Allow all for now

CREATE POLICY IF NOT EXISTS "Users can insert own preferences" 
  ON app_user_preferences FOR INSERT 
  WITH CHECK (true); -- Allow all for now

CREATE POLICY IF NOT EXISTS "Users can update own preferences" 
  ON app_user_preferences FOR UPDATE 
  USING (true) -- Allow all for now
  WITH CHECK (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_app_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_app_user_preferences_updated_at
  BEFORE UPDATE ON app_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_app_user_preferences_updated_at();
