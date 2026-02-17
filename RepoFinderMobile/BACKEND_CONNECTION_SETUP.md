# Backend Connection Setup

## Quick Setup Steps

### 1. Create the `repos` View
Run this SQL in Supabase SQL Editor:

```sql
-- Copy contents from create-repos-view.sql
```

This creates a view that combines `repos_master` with cluster and enrichment data to match what the Flutter app expects.

### 2. Verify Connection
The app should now be able to:
- ✅ Query repos by cluster
- ✅ Get personalized recommendations
- ✅ Display repo cards
- ✅ Save/like repos
- ✅ Track interactions

### 3. Test the App
1. Run the Flutter app
2. Complete onboarding
3. Check Discovery screen - repos should load
4. Swipe through cards - they should work

## What Was Fixed

1. **Created `repos` view** - Combines `repos_master` + `repo_cluster_new` + enrichment tables
2. **Updated `RepoService`** - Now queries from correct tables with proper field mapping
3. **Cluster mapping** - Maps app cluster names (frontend, ai-ml) to DB slugs (web_dev, ai_ml)
4. **Field transformation** - Maps `repo_id` → `github_id`, adds default scores, etc.

## Database Tables Used

- `repos_master` - Main repository data
- `repo_cluster_new` - Cluster assignments
- `repo_health` - Health scores
- `repo_activity` - Activity scores
- `app_users` - User data
- `app_user_preferences` - User preferences
- `app_saved_repos` - Saved repos
- `app_liked_repos` - Liked repos
- `app_user_interactions` - Interaction tracking

## Troubleshooting

If repos don't load:
1. Check Supabase connection in `.env`
2. Verify `repos` view exists
3. Check that `repos_master` has data
4. Check that `repo_cluster_new` has cluster assignments
5. Look at debug console for errors
