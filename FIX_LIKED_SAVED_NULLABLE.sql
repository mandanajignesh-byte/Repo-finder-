-- ════════════════════════════════════════════════════════════════════════════
-- FIX: Make repo columns nullable in liked_repos and saved_repos
-- ════════════════════════════════════════════════════════════════════════════
-- Error: null value in column "repo_full_name" violates not-null constraint
-- Solution: These fields should be nullable since we only need repo_id
-- ════════════════════════════════════════════════════════════════════════════

-- Fix liked_repos table
ALTER TABLE liked_repos 
  ALTER COLUMN repo_full_name DROP NOT NULL,
  ALTER COLUMN repo_description DROP NOT NULL,
  ALTER COLUMN repo_language DROP NOT NULL,
  ALTER COLUMN repo_tags DROP NOT NULL,
  ALTER COLUMN repo_topics DROP NOT NULL;

-- Fix saved_repos table
ALTER TABLE saved_repos 
  ALTER COLUMN repo_full_name DROP NOT NULL,
  ALTER COLUMN repo_description DROP NOT NULL,
  ALTER COLUMN repo_language DROP NOT NULL,
  ALTER COLUMN repo_tags DROP NOT NULL,
  ALTER COLUMN repo_topics DROP NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- Verify the changes
-- ════════════════════════════════════════════════════════════════════════════

SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name IN ('liked_repos', 'saved_repos')
  AND column_name IN ('repo_full_name', 'repo_description', 'repo_language', 'repo_tags', 'repo_topics')
ORDER BY table_name, column_name;

-- Expected: All these columns should now show is_nullable = 'YES'

-- ════════════════════════════════════════════════════════════════════════════
-- WHY THIS FIX IS NEEDED
-- ════════════════════════════════════════════════════════════════════════════
-- The frontend was trying to insert likes/saves with just repo_id and user_id.
-- But the table had NOT NULL constraints on all the metadata columns.
-- Since we already have repo_id, we can fetch metadata later if needed.
-- Making these nullable allows quick inserts without full repo data.
-- ════════════════════════════════════════════════════════════════════════════
