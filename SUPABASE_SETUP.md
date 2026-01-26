# Supabase Setup Guide

This guide will help you set up Supabase for the GitHub Repository Discovery App.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `github-repo-discovery` (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql` file
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 4: Configure Environment Variables

1. Create or update `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Replace `xxxxx` with your actual project URL
3. Replace the anon key with your actual key

## Step 5: Verify Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open the app and:
   - Fill out the onboarding questionnaire
   - Like some repos (swipe right)
   - Save some repos (click Save button)

3. Check Supabase dashboard:
   - Go to **Table Editor**
   - You should see data in:
     - `users` table
     - `user_preferences` table
     - `liked_repos` table
     - `saved_repos` table
     - `user_interactions` table

## How It Works

### Data Flow

1. **User Preferences**: Saved to Supabase when user completes onboarding
2. **Liked Repos**: Synced to Supabase when user swipes right
3. **Saved Repos**: Synced to Supabase when user clicks Save button
4. **Interactions**: All interactions (save, like, skip) are tracked in Supabase

### Benefits

- **Persistent Storage**: Data survives browser clears
- **Cross-Device Sync**: Same user ID = same data everywhere
- **Better Recommendations**: Collaborative filtering uses data from all users
- **Analytics**: Track user behavior patterns
- **Scalable**: Handles thousands of users

### Fallback Behavior

- If Supabase is not configured, the app falls back to localStorage
- All features work without Supabase, but data is device-specific
- Once Supabase is configured, existing localStorage data is synced

## Troubleshooting

### "Supabase credentials not configured"
- Make sure `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after adding env variables

### "Error creating user"
- Check that the `users` table exists
- Verify RLS policies are set correctly
- Check browser console for detailed error messages

### "No data showing in Supabase"
- Check that you ran the SQL schema
- Verify RLS policies allow inserts
- Check browser console for errors

### Data not syncing
- Check network tab for failed requests
- Verify Supabase URL and key are correct
- Check Supabase dashboard for API errors

## Next Steps

1. **Enable Authentication** (optional):
   - Set up email/password auth in Supabase
   - Update the app to use authenticated users
   - This allows true user accounts

2. **Add Analytics**:
   - Create views for popular repos
   - Track recommendation effectiveness
   - Monitor user engagement

3. **Optimize Queries**:
   - Add more indexes for common queries
   - Use materialized views for complex aggregations
   - Implement caching strategies

## Security Notes

- The `anon` key is safe to use in the frontend (it's public)
- RLS policies ensure users can only access their own data
- For production, consider implementing proper authentication
- Never commit your `.env` file to git
