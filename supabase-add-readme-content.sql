-- Add readme_content column to repos table
-- This stores the full README markdown content

ALTER TABLE repos 
ADD COLUMN IF NOT EXISTS readme_content TEXT;

-- Add index for readme_content queries (optional, for filtering repos with READMEs)
CREATE INDEX IF NOT EXISTS idx_repos_has_readme 
ON repos((readme_content IS NOT NULL AND readme_content != ''));

COMMENT ON COLUMN repos.readme_content IS 'Full README markdown content fetched from GitHub';
