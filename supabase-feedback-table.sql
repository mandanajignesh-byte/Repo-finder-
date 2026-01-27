-- Create feedback table for storing user feedback
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert feedback (anonymous feedback)
CREATE POLICY "Allow anonymous feedback insert"
  ON feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create policy to allow users to view their own feedback (optional)
CREATE POLICY "Users can view their own feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Note: If you want to allow admins to view all feedback, create a separate policy
-- CREATE POLICY "Admins can view all feedback"
--   ON feedback
--   FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE id = auth.uid()::text 
--       AND role = 'admin'
--     )
--   );
