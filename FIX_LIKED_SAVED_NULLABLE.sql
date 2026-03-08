-- ════════════════════════════════════════════════════════════════════════════
-- FIX: liked_repos and saved_repos tables - Make columns nullable
-- ════════════════════════════════════════════════════════════════════════════
-- The error shows repo_full_name is NOT NULL but we're inserting NULL values
-- ════════════════════════════════════════════════════════════════════════════

-- Fix liked_repos table - make optional fields nullable
ALTER TABLE liked_repos 
  ALTER COLUMN repo_name DROP NOT NULL,
  ALTER COLUMN repo_full_name DROP NOT NULL,
  ALTER COLUMN repo_description DROP NOT NULL,
  ALTER COLUMN repo_language DROP NOT NULL,
  ALTER COLUMN repo_url DROP NOT NULL;

-- Fix saved_repos table - same issue
ALTER TABLE saved_repos 
  ALTER COLUMN repo_name DROP NOT NULL,
  ALTER COLUMN repo_full_name DROP NOT NULL,
  ALTER COLUMN repo_description DROP NOT NULL,
  ALTER COLUMN repo_language DROP NOT NULL,
  ALTER COLUMN repo_url DROP NOT NULL;

-- Verify changes
SELECT 
  table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('liked_repos', 'saved_repos')
  AND column_name IN ('repo_name', 'repo_full_name', 'repo_description', 'repo_language', 'repo_url')
ORDER BY table_name, ordinal_position;

-- ════════════════════════════════════════════════════════════════════════════
-- Expected output - all should show is_nullable = YES:
-- ════════════════════════════════════════════════════════════════════════════
-- liked_repos | repo_name        | text | YES
-- liked_repos | repo_full_name   | text | YES
-- liked_repos | repo_description | text | YES
-- liked_repos | repo_language    | text | YES
-- liked_repos | repo_url         | text | YES
-- saved_repos | repo_name        | text | YES
-- saved_repos | repo_full_name   | text | YES
-- saved_repos | repo_description | text | YES
-- saved_repos | repo_language    | text | YES
-- saved_repos | repo_url         | text | YES
-- ════════════════════════════════════════════════════════════════════════════
