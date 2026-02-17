-- RLS Policies for repos table
-- Run this in Supabase SQL Editor

-- Enable RLS
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (for mobile app)
CREATE POLICY "Allow public read access to repos"
ON repos
FOR SELECT
USING (true);

-- Note: Service role key bypasses RLS automatically
-- Ingestion scripts use service role key, so they can write without policies
