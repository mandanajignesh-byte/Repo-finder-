# 🔧 URGENT FIX - Run This SQL Script Now!

## ❌ Errors You're Seeing:

1. **Error 23503**: `user_preferences_user_id_fkey` constraint doesn't exist
2. **406 Not Acceptable**: Can't read `user_preferences` table
3. **409 Conflict**: Can't insert into `user_preferences`

## ✅ The Fix:

The SQL script was **incomplete** - it was missing critical tables!

### Missing Tables Added:
- ✅ `user_preferences` (with proper RLS policies)
- ✅ `user_interactions` (tracks all user actions)
- ✅ `liked_repos` (stores liked repositories)
- ✅ `saved_repos` (stores saved repositories)

---

## 🚀 Run This NOW:

### Step 1: Go to Supabase SQL Editor

### Step 2: Copy ALL of `supabase-recommendation-system-FINAL.sql`

### Step 3: Paste and Click **RUN**

The script will now create **8 tables** instead of just 2:

| Table | Purpose |
|-------|---------|
| `user_preferences` | User settings & onboarding |
| `user_tag_affinity` | Tag preferences (React, Python, etc.) |
| `repo_scores` | Global like/skip rates |
| `user_interactions` | All user actions (view/like/skip) |
| `liked_repos` | User's liked repositories |
| `saved_repos` | User's saved repositories |
| + Functions | `get_scored_repos`, `update_tag_affinity`, `update_repo_score` |

---

## 📋 After Running:

### Verify All Tables Exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_preferences',
    'user_tag_affinity',
    'repo_scores',
    'user_interactions',
    'liked_repos',
    'saved_repos'
  )
ORDER BY table_name;
```

**Expected**: 6 rows (all tables)

---

### Verify All Functions Exist:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_scored_repos',
    'update_tag_affinity',
    'update_repo_score'
  );
```

**Expected**: 3 rows (all functions)

---

## ✅ Then Refresh Your App:

1. **Close the browser tab completely**
2. **Open fresh**: `http://localhost:5173/`
3. **Check console** - Errors should be GONE! ✅

You should see:
```
🚀 Initializing recommendation engine...
🔐 User ID: anon_1772985955256_ekets63
ℹ️ No primary cluster set (onboarding not completed)
📊 Excluding 0 seen repos (attempt 0)
🎲 Using random cluster: ai-ml
🔍 Fetching repos (stars: 100-30000)
📦 Received 10 repos from database
✅ 10 fresh repos after dedup
```

And **10 repo cards** will appear! 🎉

---

## 🎯 What Each Table Does:

### user_preferences
Stores user's selected preferences:
- Primary cluster (ai-ml, frontend, etc.)
- Tech stack (React, Python, etc.)
- Goals (learn, contribute, etc.)
- Onboarding status

### user_tag_affinity
Learns from swipes:
- Tag: "react", "python", "machine-learning"
- Affinity: -5 to +20 (negative = dislike, positive = like)
- Updates after each swipe

### repo_scores
Global stats for each repo:
- Total likes across all users
- Total skips across all users
- Like rate (likes / total)

### user_interactions
Tracks everything:
- Views, likes, skips, saves, shares
- Timestamp
- Metadata

### liked_repos & saved_repos
User's collections:
- Quick access to liked/saved repos
- Stored with full repo data

---

## 🔒 Security (RLS Policies):

All tables have Row Level Security:
- ✅ Users can only see their own data
- ✅ Anonymous users (anon_xxx) can access their data
- ✅ Authenticated users can access their data
- ❌ Users CANNOT see other users' data

---

## 🆘 If You Still See Errors:

### Error: "relation already exists"
**Solution**: The script uses `CREATE TABLE IF NOT EXISTS` - it's safe to run multiple times!

### Error: "policy already exists"  
**Solution**: The script uses `DROP POLICY IF EXISTS` first - it's safe!

### Error: Still 406/409 errors
**Solution**: 
1. Check RLS is enabled on all tables
2. Verify policies were created
3. Try logging out and back in

---

## ✅ Summary:

The SQL script is now **COMPLETE** with:
- ✅ 6 tables (was only 2)
- ✅ 3 functions
- ✅ All RLS policies
- ✅ All indexes
- ✅ Foreign key fixes

**Run the updated script and all errors will disappear!** 🎉

---

## 📊 After Setup:

Once working, you can:
- 👍 Like repos → Learns your preferences
- 👎 Skip repos → Learns what you don't like
- 💾 Save repos → Adds to your collection
- 🔄 Keep swiping → AI gets smarter!

**Your recommendation system will be fully functional!** 🚀
