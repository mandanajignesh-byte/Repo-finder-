-- ============================================
-- Complete Feedback Table Setup
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Step 1: Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous feedback insert" ON feedback;
DROP POLICY IF EXISTS "Allow feedback insert for completed onboarding" ON feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
DROP POLICY IF EXISTS "Allow viewing all feedback" ON feedback;
DROP POLICY IF EXISTS "Allow authenticated users to view all feedback" ON feedback;

-- Step 5: Create policy to allow INSERT feedback ONLY for users who completed onboarding
-- This ensures only users who have gone through onboarding can submit feedback
CREATE POLICY "Allow feedback insert for completed onboarding"
  ON feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_preferences 
      WHERE user_preferences.user_id = feedback.user_id 
      AND user_preferences.onboarding_completed = true
    )
  );

-- Step 6: Create policy to allow anyone to VIEW all feedback (for dashboard)
-- This allows the feedback dashboard to display all feedback entries
-- WARNING: This makes all feedback visible to anyone with access to your Supabase client
-- For production, consider implementing proper admin authentication
CREATE POLICY "Allow viewing all feedback"
  ON feedback
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- Verification Query (optional - run to check)
-- ============================================
-- SELECT COUNT(*) as total_feedback FROM feedback;
-- SELECT * FROM feedback ORDER BY created_at DESC LIMIT 10;

-- ============================================
-- Notes:
-- ============================================
-- 1. This setup allows:
--    - Anyone to submit feedback (INSERT)
--    - Anyone to view all feedback (SELECT) - for the dashboard
--
-- 2. For more security in production:
--    - Use service role key on backend server
--    - Implement admin authentication
--    - Restrict SELECT policy to specific user roles
--
-- 3. To disable viewing all feedback later:
--    DROP POLICY "Allow viewing all feedback" ON feedback;
--    CREATE POLICY "Users can view their own feedback"
--      ON feedback FOR SELECT
--      TO authenticated
--      USING (auth.uid()::text = user_id);
