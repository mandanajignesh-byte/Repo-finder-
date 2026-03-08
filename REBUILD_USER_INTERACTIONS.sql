-- ════════════════════════════════════════════════════════════════════════════
-- FIX user_interactions table - Rebuild with correct schema
-- ════════════════════════════════════════════════════════════════════════════
-- Your table has wrong column types and extra columns
-- This will rebuild it correctly
-- ════════════════════════════════════════════════════════════════════════════

-- Drop the old table
DROP TABLE IF EXISTS user_interactions CASCADE;

-- Create with the CORRECT schema
CREATE TABLE user_interactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  repo_id    BIGINT NOT NULL,     -- BIGINT not TEXT!
  action     TEXT NOT NULL,
  timestamp  TIMESTAMPTZ DEFAULT NOW(),
  metadata   JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_user_interactions_user ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_repo ON user_interactions(repo_id);
CREATE INDEX idx_user_interactions_action ON user_interactions(action);
CREATE INDEX idx_user_interactions_timestamp ON user_interactions(timestamp);

-- Enable RLS
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous users
CREATE POLICY "Allow all for anonymous users"
  ON user_interactions
  FOR ALL
  USING (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id)
  WITH CHECK (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id);

-- Verify the structure
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_interactions'
ORDER BY ordinal_position;

-- ════════════════════════════════════════════════════════════════════════════
-- Expected output:
-- ════════════════════════════════════════════════════════════════════════════
-- id         | uuid      | gen_random_uuid() | NO
-- user_id    | text      | null              | NO
-- repo_id    | bigint    | null              | NO   ← BIGINT not TEXT!
-- action     | text      | null              | NO
-- timestamp  | timestamp | NOW()             | YES
-- metadata   | jsonb     | '{}'              | YES
-- ════════════════════════════════════════════════════════════════════════════
