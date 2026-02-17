# App Users Database Setup

## Quick Setup

### Step 1: Run SQL in Supabase

Copy and paste the **entire contents** of `supabase-app-users-complete.sql` into Supabase SQL Editor and run it.

This creates:
- ✅ `app_users` table (mobile app users)
- ✅ `app_user_preferences` table (onboarding data)
- ✅ `app_user_interactions` table (for recommendations)
- ✅ `app_saved_repos` table (saved repos)
- ✅ `app_liked_repos` table (liked repos)
- ✅ All indexes for performance
- ✅ RLS policies for security
- ✅ Helper views for recommendations

## Tables Created

### 1. `app_users`
Stores mobile app user information:
- `id` (TEXT) - Unique user ID
- `device_id` - Device identifier
- `platform` - 'android' or 'ios'
- `name` - User name
- `created_at`, `updated_at`, `last_active_at`

### 2. `app_user_preferences`
Stores onboarding and preference data:
- `user_id` - References app_users
- `primary_cluster` - Selected cluster (frontend, backend, etc.)
- `secondary_clusters` - Array of additional clusters
- `tech_stack` - Array of selected languages
- `goals` - Array of goals (learning-new-tech, building-project, etc.)
- `project_types` - Array of project types
- `experience_level` - beginner, intermediate, advanced
- `onboarding_completed` - Boolean flag
- And more...

### 3. `app_user_interactions`
Tracks user interactions for recommendations:
- `user_id` - User who interacted
- `repo_github_id` - Repo that was interacted with
- `action` - 'like', 'save', 'skip', 'view', 'swipe_up'
- `created_at` - When interaction occurred

### 4. `app_saved_repos`
Stores saved repos:
- `user_id` - User who saved
- `repo_github_id` - Saved repo
- `saved_at` - When saved

### 5. `app_liked_repos`
Stores liked repos:
- `user_id` - User who liked
- `repo_github_id` - Liked repo
- `liked_at` - When liked

## Flutter App Integration

The app now uses:
- `AppSupabaseService` - For app-specific operations
- `app_users` and `app_user_preferences` tables
- `app_saved_repos` and `app_liked_repos` tables

## Update Flutter App

Replace `SupabaseService` with `AppSupabaseService` in:
- `lib/main.dart`
- `lib/screens/onboarding_screen.dart`
- `lib/screens/discovery_screen.dart`
- Any other screens using user preferences

## Verification

After running SQL, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'app_%';
```

Should return:
- app_users
- app_user_preferences
- app_user_interactions
- app_saved_repos
- app_liked_repos

## Benefits

✅ **Separate from web users** - Mobile app has its own user system
✅ **Proper onboarding storage** - All preference fields supported
✅ **Recommendation ready** - Interaction tracking built-in
✅ **Performance optimized** - Proper indexes on all queries
✅ **Secure** - RLS policies enabled
✅ **Scalable** - Designed for millions of users
