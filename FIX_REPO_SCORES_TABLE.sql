-- ════════════════════════════════════════════════════════════════════════════
-- FIX: repo_scores table - ensure it exists with correct schema and RLS
-- ════════════════════════════════════════════════════════════════════════════

-- Create or update repo_scores table
CREATE TABLE IF NOT EXISTS repo_scores (
  repo_id         TEXT PRIMARY KEY,
  total_likes     INTEGER DEFAULT 0,
  total_skips     INTEGER DEFAULT 0,
  like_rate       DECIMAL DEFAULT 0.5,
  weighted_score  DECIMAL DEFAULT 50,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_repo_scores_rate ON repo_scores(like_rate DESC);
CREATE INDEX IF NOT EXISTS idx_repo_scores_weighted ON repo_scores(weighted_score DESC);

-- Enable RLS
ALTER TABLE repo_scores ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can read repo scores" ON repo_scores;
DROP POLICY IF EXISTS "Allow all for repo scores" ON repo_scores;

-- Create new permissive policy (everyone can read, system can write)
CREATE POLICY "Allow read for everyone"
  ON repo_scores
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Allow insert/update for authenticated and anon users"
  ON repo_scores
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- Verify structure
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'repo_scores'
ORDER BY ordinal_position;

-- ════════════════════════════════════════════════════════════════════════════
-- Expected output:
-- ════════════════════════════════════════════════════════════════════════════
-- repo_id        | text    | null
-- total_likes    | integer | 0
-- total_skips    | integer | 0
-- like_rate      | numeric | 0.5
-- weighted_score | numeric | 50
-- last_updated   | timestamp | NOW()
-- updated_at     | timestamp | NOW()
-- ════════════════════════════════════════════════════════════════════════════
