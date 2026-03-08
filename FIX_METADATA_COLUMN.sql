-- ════════════════════════════════════════════════════════════════════════════
-- URGENT FIX - Missing 'metadata' column in user_interactions
-- ════════════════════════════════════════════════════════════════════════════
-- Run this NOW to fix the error!
-- ════════════════════════════════════════════════════════════════════════════

-- Check if metadata column exists
DO $$ 
BEGIN
  -- Try to add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_interactions' 
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE user_interactions ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added metadata column to user_interactions';
  ELSE
    RAISE NOTICE 'metadata column already exists';
  END IF;
END $$;

-- Also make sure the table has all required columns
DO $$
BEGIN
  -- Add missing columns if they don't exist
  
  -- id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'id') THEN
    ALTER TABLE user_interactions ADD COLUMN id BIGSERIAL PRIMARY KEY;
  END IF;
  
  -- user_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'user_id') THEN
    ALTER TABLE user_interactions ADD COLUMN user_id TEXT NOT NULL;
  END IF;
  
  -- repo_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'repo_id') THEN
    ALTER TABLE user_interactions ADD COLUMN repo_id BIGINT NOT NULL;
  END IF;
  
  -- action column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'action') THEN
    ALTER TABLE user_interactions ADD COLUMN action TEXT NOT NULL;
  END IF;
  
  -- timestamp column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'timestamp') THEN
    ALTER TABLE user_interactions ADD COLUMN timestamp TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- metadata column (most important!)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'metadata') THEN
    ALTER TABLE user_interactions ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  
END $$;

-- Remove any foreign key constraints
ALTER TABLE user_interactions DROP CONSTRAINT IF EXISTS user_interactions_user_id_fkey;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_repo ON user_interactions(repo_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_action ON user_interactions(action);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp);

-- Enable RLS
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Drop old policies and create new ones
DROP POLICY IF EXISTS "Users can view own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Allow all for anonymous users interactions" ON user_interactions;

-- Create permissive policy for anonymous users
CREATE POLICY "Allow all for anonymous users interactions"
  ON user_interactions
  FOR ALL
  USING (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id)
  WITH CHECK (user_id LIKE 'anon_%' OR auth.uid()::TEXT = user_id);

-- Verify the table structure
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
-- id         | bigint    | nextval(...) | NO
-- user_id    | text      | null         | NO
-- repo_id    | bigint    | null         | NO
-- action     | text      | null         | NO
-- timestamp  | timestamp | NOW()        | YES
-- metadata   | jsonb     | '{}'         | YES  ← This MUST be present!
-- ════════════════════════════════════════════════════════════════════════════
