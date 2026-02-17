-- ============================================
-- Fix Missing Tables - Run this if tables are missing
-- ============================================

-- First, check what's missing by running verify-schema.sql
-- Then run the sections below for any missing tables

-- ============================================
-- 1. REPOSITORIES - Master Table (MUST BE FIRST)
-- ============================================
CREATE TABLE IF NOT EXISTS repos_master (
  repo_id BIGINT PRIMARY KEY,
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
  ingested_at TIMESTAMPTZ DEFAULT NOW()
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
