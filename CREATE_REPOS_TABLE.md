# Create `repos` Table - Quick Fix

## Issue
The `repos` table doesn't exist. The ingestion script needs it.

## Solution: Run SQL in Supabase

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy & Run This SQL

Copy the **entire contents** of `supabase-repos-schema.sql` and paste into SQL Editor, then click **Run**.

**OR** copy this directly:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main repos table
CREATE TABLE IF NOT EXISTS repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  owner_login TEXT NOT NULL,
  owner_avatar TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  language TEXT,
  topics TEXT[] DEFAULT '{}',
  license TEXT,
  repo_url TEXT NOT NULL,
  homepage_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  readme_summary TEXT,
  thumbnail_url TEXT,
  cluster TEXT,
  recommendation_score DECIMAL(10,2) DEFAULT 0,
  popularity_score DECIMAL(10,2) DEFAULT 0,
  activity_score DECIMAL(10,2) DEFAULT 0,
  freshness_score DECIMAL(10,2) DEFAULT 0,
  quality_score DECIMAL(10,2) DEFAULT 0,
  trending_score DECIMAL(10,2) DEFAULT 0,
  is_trending BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at_db TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_repos_cluster ON repos(cluster);
CREATE INDEX IF NOT EXISTS idx_repos_recommendation_score ON repos(recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_repos_stars ON repos(stars DESC);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repos(language);
CREATE INDEX IF NOT EXISTS idx_repos_topics_gin ON repos USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_repos_pushed_at ON repos(pushed_at DESC);
CREATE INDEX IF NOT EXISTS idx_repos_trending ON repos(is_trending, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_repos_featured ON repos(is_featured, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_repos_cluster_score ON repos(cluster, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_repos_github_id ON repos(github_id);
CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repos(full_name);
CREATE INDEX IF NOT EXISTS idx_repos_cluster_pushed_score ON repos(cluster, pushed_at DESC, recommendation_score DESC);

-- Function to update updated_at_db timestamp
CREATE OR REPLACE FUNCTION update_repos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at_db = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at_db
CREATE TRIGGER trigger_update_repos_updated_at
  BEFORE UPDATE ON repos
  FOR EACH ROW
  EXECUTE FUNCTION update_repos_updated_at();
```

### Step 3: Verify
1. Go to **Table Editor**
2. You should see `repos` table in the list
3. It should have all the columns listed above

### Step 4: Run Ingestion Again
After creating the table, run:
```bash
npm run ingest-comprehensive
```

## Note
- This creates a NEW `repos` table (separate from `repo_clusters`)
- `repo_clusters` will remain (for backward compatibility)
- The new `repos` table is optimized for fast queries with proper indexes
