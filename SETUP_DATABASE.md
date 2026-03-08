# 🔧 Database Setup Guide - Fix All Errors

## ❌ Current Errors
1. `get_scored_repos` RPC function not found/working
2. `getSavedRepositories` was missing (now fixed ✅)
3. `saveUserPreferences` was missing (now fixed ✅)

## ✅ What I Fixed
- ✅ Added `getSavedRepositories()` to supabase service
- ✅ Added `getLikedRepositories()` to supabase service
- ✅ Added `saveUserPreferences()` to supabase service
- ✅ Added `trackInteraction()` to supabase service
- ✅ Added fallback mechanism when `get_scored_repos` fails

## 🔴 What YOU Need to Do in Supabase

### Step 1: Run the SQL Script

Go to your Supabase dashboard → SQL Editor → New Query

Copy and paste **ALL** contents from:
```
supabase-recommendation-system-FIXED.sql
```

Click **RUN** button.

---

### Step 2: Verify Tables Were Created

Run this query to check:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_tag_affinity', 'repo_scores');
```

You should see **2 tables**:
- `user_tag_affinity`
- `repo_scores`

---

### Step 3: Verify Functions Were Created

Run this query:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_scored_repos', 'update_tag_affinity');
```

You should see **2 functions**:
- `get_scored_repos`
- `update_tag_affinity`

---

### Step 4: Test the get_scored_repos Function

Run this test query:

```sql
SELECT * FROM get_scored_repos(
  'anon_1772985955256_ekets63',  -- Your user ID (see console)
  'trending-daily-desktop',       -- Cluster name
  ARRAY[]::BIGINT[],             -- Empty exclude list
  10,                             -- Limit
  50,                             -- Min stars
  100000                          -- Max stars
);
```

**Expected result**: Should return 10 repositories with scores.

If it returns **0 rows**, the function has an issue.

---

### Step 5: Check Your Existing Tables

The script assumes you have these tables already:
- `repo_clusters` (with `repo_data` JSONB column)
- `user_interactions`
- `liked_repos`
- `saved_repos`
- `user_preferences`

Run this to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "relation repo_clusters does not exist"
**Fix**: You need to create the `repo_clusters` table first. The script expects it to exist.

### Issue 2: "column repo_data does not exist"
**Fix**: Your `repo_clusters` table needs a `repo_data` column of type JSONB containing repo information.

### Issue 3: get_scored_repos returns 0 repos
**Possible causes**:
1. No data in `repo_clusters` table for the cluster you specified
2. All repos are filtered out by stars filter (50-100000)
3. The `repo_data` JSONB structure doesn't match expected format

**Check data**:
```sql
SELECT cluster_name, COUNT(*) 
FROM repo_clusters 
GROUP BY cluster_name;
```

### Issue 4: "function get_scored_repos already exists"
**Fix**: Drop the old one first:
```sql
DROP FUNCTION IF EXISTS get_scored_repos;
```
Then re-run the SQL script.

---

## ✅ After Database Setup

Once you've successfully run the SQL script and verified the functions work:

1. **Refresh your browser** at http://localhost:5173/
2. Check the console - you should see:
   - ✅ "Initializing recommendation engine..."
   - ✅ "User ID: anon_xxx"
   - ✅ "Fetching repos (stars: 100-30000)"
   - ✅ "Received X repos from database"

3. If you still see errors, check:
   - Did all 4 SQL sections run successfully?
   - Does your `repo_clusters` table have data?
   - Are the column names correct (`repo_data`, `tags`, `quality_score`)?

---

## 📊 Expected Database Schema

### repo_clusters table should have:
```sql
- cluster_name (TEXT)
- repo_data (JSONB) containing:
  {
    "id": "123456789",
    "name": "repo-name",
    "full_name": "owner/repo-name",
    "stars": 1234,
    "forks": 56,
    "description": "...",
    "language": "JavaScript",
    "topics": ["react", "nodejs"],
    "url": "https://github.com/...",
    "pushed_at": "2024-01-01T00:00:00Z"
  }
- tags (TEXT[])
- quality_score (DECIMAL)
```

---

## 🆘 Still Having Issues?

Share the output of these queries:

```sql
-- 1. Check tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 2. Check repo_clusters structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'repo_clusters';

-- 3. Check sample data
SELECT cluster_name, jsonb_typeof(repo_data) as data_type, 
       COUNT(*) as count 
FROM repo_clusters 
GROUP BY cluster_name, data_type;

-- 4. Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';
```

Send me the results and I'll help debug further!
