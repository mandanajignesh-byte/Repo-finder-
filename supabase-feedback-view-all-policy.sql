-- SQL to allow viewing ALL feedback (for admin/dashboard purposes)
-- Run this in your Supabase SQL Editor if you want to view all feedback
--
-- WARNING: This allows anyone with access to your Supabase client to view all feedback.
-- Only use this if you're okay with that, or implement proper admin authentication.

-- Option 1: Allow anyone to view all feedback (simplest, but less secure)
-- Uncomment the lines below if you want this:

-- DROP POLICY IF EXISTS "Allow viewing all feedback" ON feedback;
-- CREATE POLICY "Allow viewing all feedback"
--   ON feedback
--   FOR SELECT
--   TO anon, authenticated
--   USING (true);

-- Option 2: Allow viewing all feedback only for authenticated users (recommended)
-- This requires users to be authenticated, but still allows any authenticated user to see all feedback
-- Uncomment the lines below if you want this:

-- DROP POLICY IF EXISTS "Allow authenticated users to view all feedback" ON feedback;
-- CREATE POLICY "Allow authenticated users to view all feedback"
--   ON feedback
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Option 3: Service role key approach (most secure)
-- Instead of modifying RLS policies, you can use the service role key on the server side
-- to bypass RLS. This is the most secure approach but requires a backend server.

-- For now, if you're using the anon key in your client, you can temporarily disable RLS
-- for testing purposes (NOT recommended for production):
-- ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS:
-- ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
