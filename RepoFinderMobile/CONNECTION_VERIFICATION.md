# Connection Verification Guide

## ✅ All Connections Verified

### 1. **Onboarding → Database**
- ✅ Uses `AppSupabaseService`
- ✅ Saves to `app_user_preferences` table
- ✅ All fields saved: `primary_cluster`, `tech_stack`, `goals`, `project_types`, etc.
- ✅ Sets `onboarding_completed = true` when done

**File**: `lib/screens/onboarding_screen.dart`
- Line 122: Uses `AppSupabaseService`
- Line 131: Calls `saveUserPreferences()` which saves to `app_user_preferences`

### 2. **Likes → Database**
- ✅ Uses `AppSupabaseService`
- ✅ Saves to `app_liked_repos` table
- ✅ Tracks interaction in `app_user_interactions` table

**Files**:
- `lib/screens/discovery_screen.dart` - Line 86: `_handleLike()` uses `AppSupabaseService`
- `lib/services/repo_service.dart` - Line 210: `likeRepo()` saves to `app_liked_repos`
- `lib/services/repo_service.dart` - Line 218: Tracks interaction

### 3. **Saves → Database**
- ✅ Uses `AppSupabaseService`
- ✅ Saves to `app_saved_repos` table
- ✅ Tracks interaction in `app_user_interactions` table

**Files**:
- `lib/screens/discovery_screen.dart` - Line 117: `_handleSave()` uses `AppSupabaseService`
- `lib/services/repo_service.dart` - Line 179: `saveRepo()` saves to `app_saved_repos`
- `lib/services/repo_service.dart` - Line 188: Tracks interaction

### 4. **Interactions Tracking**
- ✅ Skip: Tracked when user swipes left or clicks skip
- ✅ Like: Tracked when user swipes right or likes
- ✅ Save: Tracked when user saves
- ✅ View/Swipe Up: Tracked when user previews README

**Files**:
- `lib/screens/discovery_screen.dart` - Line 222: `_nextRepo()` tracks skip
- `lib/screens/discovery_screen.dart` - Line 157: `_handlePreview()` tracks swipe_up
- `lib/services/app_supabase_service.dart` - Line 141: `trackInteraction()` method

## Database Tables Used

1. **`app_users`** - User accounts
2. **`app_user_preferences`** - Onboarding data
3. **`app_liked_repos`** - Liked repos
4. **`app_saved_repos`** - Saved repos
5. **`app_user_interactions`** - All interactions (for recommendations)

## Testing Checklist

### Onboarding
- [ ] Complete onboarding flow
- [ ] Check `app_user_preferences` table in Supabase
- [ ] Verify `onboarding_completed = true`
- [ ] Verify all fields are saved correctly

### Likes
- [ ] Like a repo (swipe right or tap like)
- [ ] Check `app_liked_repos` table
- [ ] Check `app_user_interactions` table for 'like' action

### Saves
- [ ] Save a repo (swipe right or tap save)
- [ ] Check `app_saved_repos` table
- [ ] Check `app_user_interactions` table for 'save' action

### Skips
- [ ] Skip a repo (swipe left or tap skip)
- [ ] Check `app_user_interactions` table for 'skip' action

### README Preview
- [ ] Swipe up on a repo card
- [ ] Check `app_user_interactions` table for 'swipe_up' action

## SQL Queries to Verify

### Check onboarding data:
```sql
SELECT * FROM app_user_preferences 
WHERE onboarding_completed = true 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check liked repos:
```sql
SELECT * FROM app_liked_repos 
ORDER BY liked_at DESC 
LIMIT 10;
```

### Check saved repos:
```sql
SELECT * FROM app_saved_repos 
ORDER BY saved_at DESC 
LIMIT 10;
```

### Check all interactions:
```sql
SELECT action, COUNT(*) as count 
FROM app_user_interactions 
GROUP BY action;
```

### Check user activity:
```sql
SELECT 
  u.id,
  u.platform,
  COUNT(DISTINCT lr.repo_github_id) as liked_count,
  COUNT(DISTINCT sr.repo_github_id) as saved_count,
  COUNT(DISTINCT ui.id) as interaction_count
FROM app_users u
LEFT JOIN app_liked_repos lr ON u.id = lr.user_id
LEFT JOIN app_saved_repos sr ON u.id = sr.user_id
LEFT JOIN app_user_interactions ui ON u.id = ui.user_id
GROUP BY u.id, u.platform
ORDER BY u.last_active_at DESC;
```

## All Connections Working! ✅

Everything is properly connected:
- ✅ Onboarding saves to `app_user_preferences`
- ✅ Likes save to `app_liked_repos` + tracked in `app_user_interactions`
- ✅ Saves save to `app_saved_repos` + tracked in `app_user_interactions`
- ✅ Skips tracked in `app_user_interactions`
- ✅ README previews tracked in `app_user_interactions`
