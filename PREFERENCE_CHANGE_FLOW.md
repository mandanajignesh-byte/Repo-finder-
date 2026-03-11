# 🔄 How Preference Changes Impact Recommendations

## Overview

When a user changes their preferences (experience level, programming languages, frameworks), the recommendation system automatically updates to reflect these changes.

## Flow Diagram

```
User Edits Preferences
    ↓
Save Preferences (Flutter App)
    ↓
Update app_user_preferences Table
    ↓
Database Trigger Fires (on_preferences_change)
    ↓
Trigger Function Executes:
  1. Regenerate User Vectors (from new preferences)
  2. Recompute All Repo Scores (500 repos)
  3. Update repo_recommendations_feed Table
    ↓
New Recommendations Ready (< 5 seconds)
    ↓
User Sees Updated Recommendations in Discovery Tab
```

## Technical Details

### 1. **Database Trigger (Automatic)**

When `app_user_preferences` is updated, a PostgreSQL trigger automatically fires:

```sql
CREATE TRIGGER on_preferences_change
  AFTER INSERT OR UPDATE ON app_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_recommendations();
```

The trigger function:
- Calls `precompute_user_recommendations(user_id, 500)`
- Regenerates user vectors from new preferences
- Scores all candidate repos
- Updates the `repo_recommendations_feed` table

**Location:** `create-recommendation-system.sql` (lines 436-449)

### 2. **What Gets Recomputed**

When preferences change, the system:

1. **Regenerates User Vectors:**
   - Interest vector (from primary/secondary clusters)
   - Tech vector (from tech_stack)
   - Complexity vector (from experience_level)
   - Goal vector (from goals)

2. **Rescores All Repos:**
   - Interest match score (35% weight)
   - Tech match score (15% weight)
   - Complexity match score (10% weight)
   - Popularity score (10% weight)
   - Health score (20% weight)
   - Freshness score (10% weight)
   - Gem boost (0.05-0.10)

3. **Updates Feed:**
   - Deletes old recommendations for the user
   - Inserts top 500 repos ranked by new scores
   - Stores precomputed metadata (badges, scores, etc.)

### 3. **User Experience**

**In Edit Preferences Screen:**
- User saves preferences
- Loading indicator shows
- Success message: "Preferences saved! Recommendations are being updated..."
- Recommendations recompute in background (5-10 seconds)

**In Discovery Tab:**
- Next time user opens/swipes, they see new recommendations
- Feed query is instant (< 10ms) - uses precomputed data
- No lag or delay - seamless experience

### 4. **Fallback Mechanisms**

**If Trigger Fails:**
- Flutter app also calls `precompute_user_recommendations` RPC directly
- Daily GitHub Actions job recomputes for all users (3 AM UTC)
- Manual trigger available via SQL or Node.js script

**If Feed is Empty:**
- App falls back to old personalized query method
- Still works, just slower (500-2000ms vs < 10ms)

## Performance

### Computation Time
- **Single User:** 5-10 seconds
- **All Users (Batch):** ~1-2 minutes per 100 users

### Query Time (After Recomputation)
- **Feed Query:** < 10ms ⚡
- **Fallback Query:** 500-2000ms 🐌

## When Recommendations Update

Recommendations are automatically recomputed when:

1. ✅ **Preferences Change** → Trigger fires immediately
2. ✅ **Onboarding Completes** → Trigger fires
3. ✅ **Daily Refresh** → GitHub Actions (3 AM UTC)
4. ✅ **Manual Trigger** → Via SQL or Node.js script

## Code Locations

### Database
- **Trigger:** `create-recommendation-system.sql` (lines 436-449)
- **Function:** `create-recommendation-system.sql` (lines 310-431)

### Flutter App
- **Save Preferences:** `lib/services/app_supabase_service.dart` (line 121)
- **Trigger Recomputation:** `lib/services/app_supabase_service.dart` (line 169)
- **Edit Screen:** `lib/screens/edit_preferences_screen.dart` (line 94)

### Node.js Script
- **Manual Trigger:** `compute-recommendations.js`

## Testing

To test preference changes:

1. **Edit preferences in app**
2. **Check database:**
   ```sql
   SELECT 
     user_id,
     COUNT(*) as count,
     MAX(computed_at) as last_computed
   FROM repo_recommendations_feed
   WHERE user_id = 'your-user-id'
   GROUP BY user_id;
   ```
3. **Verify new recommendations appear in Discovery tab**

## Summary

✅ **Automatic:** Trigger handles everything  
✅ **Fast:** 5-10 seconds to recompute  
✅ **Seamless:** User sees updated recommendations immediately  
✅ **Reliable:** Multiple fallback mechanisms  
✅ **Scalable:** Handles thousands of users efficiently
