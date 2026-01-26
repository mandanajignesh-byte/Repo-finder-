-- Migration: Add name column to users table
-- Run this in Supabase SQL Editor if you haven't run the complete schema

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name TEXT;
