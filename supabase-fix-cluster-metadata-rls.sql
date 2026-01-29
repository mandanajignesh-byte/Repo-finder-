-- Fix RLS policies for cluster_metadata table
-- Allows inserts and updates for cluster metadata (needed for scripts)

-- Allow anyone to insert cluster metadata (for curation scripts)
CREATE POLICY "Anyone can insert cluster metadata" ON cluster_metadata
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update cluster metadata (for curation scripts)
CREATE POLICY "Anyone can update cluster metadata" ON cluster_metadata
  FOR UPDATE USING (true);

-- Also ensure repo_clusters has INSERT/UPDATE policies
CREATE POLICY "Anyone can insert cluster repos" ON repo_clusters
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update cluster repos" ON repo_clusters
  FOR UPDATE USING (true);
