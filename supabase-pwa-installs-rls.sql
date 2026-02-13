-- ============================================
-- Row Level Security (RLS) Policies for pwa_installs
-- ============================================

-- Enable RLS on pwa_installs table
ALTER TABLE pwa_installs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own PWA install record
CREATE POLICY "Users can read own PWA install"
  ON pwa_installs
  FOR SELECT
  USING (auth.uid()::text = user_id OR true); -- Allow users to read their own OR allow public read for analytics

-- Policy 2: Users can insert their own PWA install record
CREATE POLICY "Users can insert own PWA install"
  ON pwa_installs
  FOR INSERT
  WITH CHECK (true); -- Allow anyone to insert (since we use client-side user_id)

-- Policy 3: Users can update their own PWA install record (for last_opened_at)
CREATE POLICY "Users can update own PWA install"
  ON pwa_installs
  FOR UPDATE
  USING (auth.uid()::text = user_id OR true) -- Allow users to update their own OR allow public update
  WITH CHECK (auth.uid()::text = user_id OR true);

-- Alternative: If you want more restrictive policies (only allow users to manage their own records)
-- Uncomment the following and comment out the policies above:

/*
-- More restrictive: Users can only read their own records
DROP POLICY IF EXISTS "Users can read own PWA install" ON pwa_installs;
CREATE POLICY "Users can read own PWA install"
  ON pwa_installs
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- More restrictive: Users can only insert their own records
DROP POLICY IF EXISTS "Users can insert own PWA install" ON pwa_installs;
CREATE POLICY "Users can insert own PWA install"
  ON pwa_installs
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- More restrictive: Users can only update their own records
DROP POLICY IF EXISTS "Users can update own PWA install" ON pwa_installs;
CREATE POLICY "Users can update own PWA install"
  ON pwa_installs
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
*/
