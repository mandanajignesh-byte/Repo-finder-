-- ============================================
-- Create All Enrichment Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Repo Tech Stack
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
-- STEP 2: Repo Complexity Classification
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
-- STEP 3: Repo Activity & Freshness
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
-- STEP 4: Repo Health Scoring
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
-- STEP 5: Badge Definitions (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS badge_definitions (
  badge_slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT
);

-- Insert default badge definitions
INSERT INTO badge_definitions (badge_slug, name, description, icon, color) VALUES
  ('well_maintained', 'Well Maintained', 'Active development and regular updates', 'shield-check', '#10b981'),
  ('actively_updated', 'Actively Updated', 'Recently updated within last 30 days', 'activity', '#3b82f6'),
  ('beginner_friendly', 'Beginner Friendly', 'Great for learning and tutorials', 'book-open', '#8b5cf6'),
  ('production_ready', 'Production Ready', 'Stable and ready for production use', 'check-circle', '#10b981'),
  ('trending_now', 'Trending Now', 'Rapidly gaining stars and attention', 'trending-up', '#f59e0b')
ON CONFLICT (badge_slug) DO NOTHING;

-- ============================================
-- STEP 6: Repo Badges
-- ============================================
CREATE TABLE IF NOT EXISTS repo_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id BIGINT REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  badge_slug TEXT REFERENCES badge_definitions(badge_slug) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, badge_slug)
);

CREATE INDEX IF NOT EXISTS idx_repo_badges_repo_id ON repo_badges(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_badges_badge_slug ON repo_badges(badge_slug);

-- ============================================
-- STEP 7: Repo Gems (Underrated Gems)
-- ============================================
CREATE TABLE IF NOT EXISTS repo_gems (
  repo_id BIGINT PRIMARY KEY REFERENCES repos_master(repo_id) ON DELETE CASCADE,
  gem_score FLOAT DEFAULT 0.0 CHECK (gem_score >= 0 AND gem_score <= 1),
  reason JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_gems_score ON repo_gems(gem_score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_gems_detected_at ON repo_gems(detected_at DESC);

-- ============================================
-- Verification
-- ============================================
-- Run this to verify tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'repo_tech_stack',
    'repo_complexity',
    'repo_activity',
    'repo_health',
    'badge_definitions',
    'repo_badges',
    'repo_gems'
  )
ORDER BY table_name;
