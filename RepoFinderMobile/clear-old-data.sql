-- Script to clear old ingestion data and start fresh
-- WARNING: This will delete all ingested repos and start from scratch!

-- Step 1: Delete all enrichment data (keeps repos_master but clears relationships)
DELETE FROM repo_gems;
DELETE FROM repo_badges;
DELETE FROM repo_health;
DELETE FROM repo_activity;
DELETE FROM repo_complexity;
DELETE FROM repo_tech_stack;
DELETE FROM repo_cluster_new;

-- Step 2: (Optional) Delete repos_master too for complete fresh start
-- Uncomment the line below if you want to delete ALL repos:
-- DELETE FROM repos_master;

-- Step 3: Reset sequences if needed
-- ALTER SEQUENCE IF EXISTS repo_cluster_new_id_seq RESTART WITH 1;

-- After running this, you'll have a clean slate to start ingestion fresh!
