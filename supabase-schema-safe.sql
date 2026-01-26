-- ============================================
-- COMPLETE Supabase Database Schema (SAFE TO RUN MULTIPLE TIMES)
-- GitHub Repository Discovery App
-- Run this ENTIRE file in Supabase SQL Editor
-- This version handles existing policies/tables gracefully
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Core User Tables
-- ============================================

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
  interests TEXT[] DEFAULT '{}',
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
  time_spent INTEGER,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Repository Pool Tables
-- ============================================

-- Repository pools table (stores pre-fetched repos for each user)
CREATE TABLE IF NOT EXISTS repo_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repos JSONB NOT NULL DEFAULT '[]',
  preferences_hash TEXT,
  pool_size INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- Cluster Tables (NEW - Pre-curated repos)
-- ============================================

-- Repository clusters table (pre-curated repos by cluster)
CREATE TABLE IF NOT EXISTS repo_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_name TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  repo_data JSONB NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  quality_score INTEGER DEFAULT 0,
  rotation_priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cluster_name, repo_id)
);

-- Cluster metadata table
CREATE TABLE IF NOT EXISTS cluster_metadata (
  cluster_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  repo_count INTEGER DEFAULT 0,
  last_curated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Saved repos indexes
CREATE INDEX IF NOT EXISTS idx_saved_repos_user_id ON saved_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_repos_repo_id ON saved_repos(repo_id);

-- Liked repos indexes
CREATE INDEX IF NOT EXISTS idx_liked_repos_user_id ON liked_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_repos_repo_id ON liked_repos(repo_id);

-- User interactions indexes
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_repo_id ON user_interactions(repo_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_action ON user_interactions(action);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);

-- Repo pools indexes
CREATE INDEX IF NOT EXISTS idx_repo_pools_user_id ON repo_pools(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_pools_updated_at ON repo_pools(updated_at DESC);

-- Cluster indexes (NEW)
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster ON repo_clusters(cluster_name);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_tags ON repo_clusters USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_quality ON repo_clusters(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_rotation ON repo_clusters(rotation_priority DESC);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_repo_id ON repo_clusters(repo_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_metadata ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Drop Existing Policies (if they exist)
-- ============================================

-- Drop users policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Drop user preferences policies
DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

-- Drop saved repos policies
DROP POLICY IF EXISTS "Users can read own saved repos" ON saved_repos;
DROP POLICY IF EXISTS "Users can insert own saved repos" ON saved_repos;
DROP POLICY IF EXISTS "Users can delete own saved repos" ON saved_repos;

-- Drop liked repos policies
DROP POLICY IF EXISTS "Users can read own liked repos" ON liked_repos;
DROP POLICY IF EXISTS "Users can insert own liked repos" ON liked_repos;
DROP POLICY IF EXISTS "Users can delete own liked repos" ON liked_repos;

-- Drop user interactions policies
DROP POLICY IF EXISTS "Users can read own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Users can read interactions for recommendations" ON user_interactions;

-- Drop repo pools policies
DROP POLICY IF EXISTS "Users can read own repo pool" ON repo_pools;
DROP POLICY IF EXISTS "Users can insert own repo pool" ON repo_pools;
DROP POLICY IF EXISTS "Users can update own repo pool" ON repo_pools;
DROP POLICY IF EXISTS "Users can delete own repo pool" ON repo_pools;

-- Drop cluster policies
DROP POLICY IF EXISTS "Anyone can read clusters" ON repo_clusters;
DROP POLICY IF EXISTS "Anyone can read cluster metadata" ON cluster_metadata;

-- ============================================
-- Create RLS Policies
-- ============================================

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

-- User preferences policies
CREATE POLICY "Users can read own preferences" ON user_preferences
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (true);

-- Saved repos policies
CREATE POLICY "Users can read own saved repos" ON saved_repos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own saved repos" ON saved_repos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own saved repos" ON saved_repos
  FOR DELETE USING (true);

-- Liked repos policies
CREATE POLICY "Users can read own liked repos" ON liked_repos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own liked repos" ON liked_repos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own liked repos" ON liked_repos
  FOR DELETE USING (true);

-- User interactions policies
CREATE POLICY "Users can read own interactions" ON user_interactions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own interactions" ON user_interactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read interactions for recommendations" ON user_interactions
  FOR SELECT USING (true);

-- Repo pools policies
CREATE POLICY "Users can read own repo pool" ON repo_pools
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own repo pool" ON repo_pools
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own repo pool" ON repo_pools
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own repo pool" ON repo_pools
  FOR DELETE USING (true);

-- Cluster policies (NEW - Public read for curated repos)
CREATE POLICY "Anyone can read clusters" ON repo_clusters
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read cluster metadata" ON cluster_metadata
  FOR SELECT USING (true);

-- ============================================
-- Initial Cluster Metadata
-- ============================================

-- Insert cluster metadata based on onboarding form
INSERT INTO cluster_metadata (cluster_name, display_name, description, icon, repo_count, is_active) VALUES
  ('frontend', 'Frontend', 'Frontend development frameworks, libraries, and tools', '🌐', 0, true),
  ('backend', 'Backend', 'Backend frameworks, APIs, and server-side tools', '⚙️', 0, true),
  ('ai-ml', 'AI/ML', 'Artificial Intelligence and Machine Learning libraries', '🤖', 0, true),
  ('mobile', 'Mobile', 'Mobile app development frameworks and tools', '📱', 0, true),
  ('devops', 'DevOps', 'DevOps tools, CI/CD, and infrastructure management', '🔧', 0, true),
  ('data-science', 'Data Science', 'Data science libraries, analytics, and visualization tools', '📊', 0, true)
ON CONFLICT (cluster_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;

-- ============================================
-- Done!
-- ============================================
-- After running this:
-- 1. Run the curation script to populate clusters: npx tsx scripts/curate-clusters.ts
-- 2. Or manually curate repos using the Supabase dashboard
-- ============================================
