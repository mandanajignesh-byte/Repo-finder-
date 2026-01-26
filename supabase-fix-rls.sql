-- ============================================
-- Fix RLS Policy for repo_clusters
-- Run this in Supabase SQL Editor
-- ============================================

-- Add INSERT policy for repo_clusters (needed for curation script)
CREATE POLICY "Anyone can insert into clusters" ON repo_clusters
  FOR INSERT WITH CHECK (true);

-- Add UPDATE policy for repo_clusters (needed for curation script)
CREATE POLICY "Anyone can update clusters" ON repo_clusters
  FOR UPDATE USING (true);

-- ============================================
-- Done! Now the curation script can insert repos
-- ============================================
