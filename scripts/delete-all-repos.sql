-- Delete all repos from repos table
-- Run this in Supabase SQL Editor before re-ingesting

DELETE FROM repos;

-- Verify deletion
SELECT COUNT(*) as remaining_repos FROM repos;
