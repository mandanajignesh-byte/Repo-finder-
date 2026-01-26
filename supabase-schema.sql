-- Supabase Database Schema for GitHub Repository Discovery App
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tech_stack TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  project_types TEXT[] DEFAULT '{}',
  experience_level TEXT DEFAULT 'intermediate',
  activity_preference TEXT DEFAULT 'any',
  popularity_weight TEXT DEFAULT 'medium',
  documentation_importance TEXT DEFAULT 'important',
  license_preference TEXT[] DEFAULT '{}',
  repo_size TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved repositories table
CREATE TABLE IF NOT EXISTS saved_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_id TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_description TEXT,
  repo_stars INTEGER DEFAULT 0,
  repo_language TEXT,
  repo_url TEXT,
  repo_tags TEXT[] DEFAULT '{}',
  repo_topics TEXT[] DEFAULT '{}',
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, repo_id)
);

-- Liked repositories table
CREATE TABLE IF NOT EXISTS liked_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_id TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_description TEXT,
  repo_stars INTEGER DEFAULT 0,
  repo_language TEXT,
  repo_url TEXT,
  repo_tags TEXT[] DEFAULT '{}',
  repo_topics TEXT[] DEFAULT '{}',
  liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, repo_id)
);

-- User interactions table
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('save', 'like', 'skip', 'view', 'click-through', 'fork')),
  session_id TEXT,
  time_spent INTEGER, -- milliseconds
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_repos_user_id ON saved_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_repos_repo_id ON saved_repos(repo_id);
CREATE INDEX IF NOT EXISTS idx_liked_repos_user_id ON liked_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_repos_repo_id ON liked_repos(repo_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_repo_id ON user_interactions(repo_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_action ON user_interactions(action);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow users to read/write their own data
-- For now, we'll use service role key, but these policies allow public access
-- In production, you should implement proper authentication

-- Users: Allow all operations (we're using anonymous users with user_id)
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

-- User preferences: Allow users to read/write their own preferences
CREATE POLICY "Users can read own preferences" ON user_preferences
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (true);

-- Saved repos: Allow users to read/write their own saved repos
CREATE POLICY "Users can read own saved repos" ON saved_repos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own saved repos" ON saved_repos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own saved repos" ON saved_repos
  FOR DELETE USING (true);

-- Liked repos: Allow users to read/write their own liked repos
CREATE POLICY "Users can read own liked repos" ON liked_repos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own liked repos" ON liked_repos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own liked repos" ON liked_repos
  FOR DELETE USING (true);

-- User interactions: Allow users to read/write their own interactions
CREATE POLICY "Users can read own interactions" ON user_interactions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own interactions" ON user_interactions
  FOR INSERT WITH CHECK (true);

-- For collaborative filtering, we need to allow reading other users' interactions
-- (but not their personal data)
CREATE POLICY "Users can read interactions for recommendations" ON user_interactions
  FOR SELECT USING (true);

-- Repository pools table (stores pre-fetched repos for each user)
CREATE TABLE IF NOT EXISTS repo_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repos JSONB NOT NULL DEFAULT '[]',
  preferences_hash TEXT, -- Hash of preferences to detect changes
  pool_size INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for repo pools
CREATE INDEX IF NOT EXISTS idx_repo_pools_user_id ON repo_pools(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_pools_updated_at ON repo_pools(updated_at DESC);

-- Enable RLS for repo pools
ALTER TABLE repo_pools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for repo pools
CREATE POLICY "Users can read own repo pool" ON repo_pools
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own repo pool" ON repo_pools
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own repo pool" ON repo_pools
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own repo pool" ON repo_pools
  FOR DELETE USING (true);
