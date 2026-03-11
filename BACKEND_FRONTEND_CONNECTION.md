# Backend-Frontend Connection Guide

## ✅ What's Connected

### 1. **Discovery Screen** (Swipeable Cards)
- ✅ Fetches personalized repos based on user preferences
- ✅ Uses `getPersonalizedRepos()` which queries:
  - `repo_cluster_new` for cluster matching
  - `repos_master` for repo data
  - `repo_health` and `repo_activity` for enrichment scores
- ✅ Fallback logic: cluster+language → cluster only → general repos
- ✅ Saves/likes repos to `app_saved_repos` and `app_liked_repos`

### 2. **Trending Screen** (Daily/Weekly Toggle)
- ✅ Fetches trending repos using `getTrendingRepos()`
- ✅ Supports daily/weekly toggle
- ✅ Queries `trending_repos` table
- ✅ Uses SQL function `get_trending_gems()` if available
- ✅ Falls back to direct query if function not available

### 3. **Saved/Liked Repos**
- ✅ Loads from `app_saved_repos` and `app_liked_repos`
- ✅ Fetches full repo data from `repos_master`

### 4. **User Preferences**
- ✅ Stored in `app_user_preferences`
- ✅ Used for personalized recommendations

## 📊 Database Tables Used

### Core Tables:
- ✅ `repos_master` - 21,905 repos
- ✅ `repo_cluster_new` - Cluster assignments
- ✅ `trending_repos` - Daily (467) + Weekly (237) trending repos

### Enrichment Tables:
- ✅ `repo_health` - Health scores
- ✅ `repo_activity` - Activity & freshness scores
- ✅ `repo_complexity` - Complexity classification
- ✅ `repo_tech_stack` - Tech stack detection
- ✅ `repo_badges` - Badge assignments
- ✅ `repo_gems` - Underrated gems

### User Tables:
- ✅ `app_users` - User IDs
- ✅ `app_user_preferences` - User preferences
- ✅ `app_saved_repos` - Saved repos
- ✅ `app_liked_repos` - Liked repos
- ✅ `app_user_interactions` - Interaction tracking

## 🔗 Connection Flow

### Discovery Flow:
```
User Opens App
  ↓
Load User Preferences (app_user_preferences)
  ↓
Get Primary Cluster (e.g., 'web_dev')
  ↓
Query repo_cluster_new → Get repo_ids for cluster
  ↓
Query repos_master → Get repo data
  ↓
Query repo_health + repo_activity → Get enrichment scores
  ↓
Display Swipeable Cards
```

### Trending Flow:
```
User Opens Trending Tab
  ↓
Select Period (daily/weekly)
  ↓
Query trending_repos table
  ↓
Get latest period_date for period_type
  ↓
Fetch repo_ids with ranks
  ↓
Query repos_master → Get full repo data
  ↓
Display Trending List
```

## 🚀 Testing Checklist

### Before Testing on Phone:

1. **Verify Supabase Connection:**
   - ✅ Check `.env` file has correct Supabase URL and keys
   - ✅ Verify Supabase project is accessible

2. **Verify Database Tables:**
   - ✅ Run `create-repos-view.sql` in Supabase SQL Editor
   - ✅ Verify `repos` view exists and has data
   - ✅ Check `trending_repos` has daily/weekly data

3. **Verify Flutter App:**
   - ✅ Check `lib/main.dart` initializes Supabase correctly
   - ✅ Verify all services are registered in Provider

4. **Test Locally First:**
   ```bash
   flutter run
   ```

## 📱 What to Test on Phone

1. **Discovery Screen:**
   - ✅ Swipeable cards appear
   - ✅ Repos match user's cluster preference
   - ✅ Like/Save buttons work
   - ✅ Preview (swipe up) works

2. **Trending Screen:**
   - ✅ Daily trending repos appear
   - ✅ Weekly toggle works
   - ✅ Repos are underrated gems (< 1000 stars)
   - ✅ Refresh button works

3. **Saved/Liked:**
   - ✅ Saved repos appear in Saved tab
   - ✅ Liked repos appear in Liked tab

4. **Onboarding:**
   - ✅ User can select cluster/languages/goals
   - ✅ Preferences are saved

## 🔧 Quick Fixes if Issues

### If no repos appear:
1. Check Supabase connection in logs
2. Verify `repos` view exists: `SELECT COUNT(*) FROM repos;`
3. Check cluster names match (frontend → web_dev, etc.)

### If trending repos empty:
1. Verify `trending_repos` has data: `SELECT COUNT(*) FROM trending_repos;`
2. Check period_date matches today's date
3. Run `node verify-trending-repos.js` locally

### If scores are 0:
1. Verify enrichment tables have data
2. Check `repo_health` and `repo_activity` tables
3. Run enrichment if needed: `node enrich-all-repos.js`
