-- ============================================
-- Trending Repositories Table
-- Stores daily/weekly trending repos fetched from GitHub
-- ============================================

-- Trending repositories table
CREATE TABLE IF NOT EXISTS trending_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_description TEXT,
  repo_stars INTEGER DEFAULT 0,
  repo_forks INTEGER DEFAULT 0,
  repo_language TEXT,
  repo_url TEXT NOT NULL,
  repo_owner_login TEXT,
  repo_owner_avatar_url TEXT,
  repo_topics TEXT[] DEFAULT '{}',
  repo_tags TEXT[] DEFAULT '{}',
  repo_readme TEXT,
  repo_created_at TIMESTAMP WITH TIME ZONE,
  repo_updated_at TIMESTAMP WITH TIME ZONE,
  repo_pushed_at TIMESTAMP WITH TIME ZONE,
  trending_score TEXT, -- e.g., "🔥 1.2k stars"
  rank INTEGER, -- Position in trending list
  time_range TEXT NOT NULL CHECK (time_range IN ('daily', 'weekly', 'monthly')), -- daily, weekly, monthly
  date_key TEXT NOT NULL, -- YYYY-MM-DD for daily, YYYY-W## for weekly, YYYY-MM for monthly
  language TEXT, -- Filter language (null = all languages)
  exclude_well_known BOOLEAN DEFAULT FALSE, -- Whether well-known repos were filtered out
  repo_data JSONB, -- Full repo data as JSON for flexibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(repo_id, time_range, date_key, language, exclude_well_known) -- One repo per time range/date/language combo
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_trending_repos_time_range_date ON trending_repos(time_range, date_key);
CREATE INDEX IF NOT EXISTS idx_trending_repos_date_key ON trending_repos(date_key);
CREATE INDEX IF NOT EXISTS idx_trending_repos_repo_id ON trending_repos(repo_id);
CREATE INDEX IF NOT EXISTS idx_trending_repos_created_at ON trending_repos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_repos_language ON trending_repos(language);

-- Enable Row Level Security (allow public read, but restrict writes)
ALTER TABLE trending_repos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read trending repos
CREATE POLICY "Allow public read access to trending repos"
  ON trending_repos
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users or service role to insert/update (for scripts)
-- Note: You may need to adjust this based on your Supabase setup
CREATE POLICY "Allow service role to manage trending repos"
  ON trending_repos
  FOR ALL
  USING (true)
  WITH CHECK (true);
