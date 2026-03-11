# How to Verify GitHub Actions Workflow

## Method 1: Check GitHub Actions Logs (Recommended)

1. **Go to your GitHub repository:**
   - Visit: `https://github.com/mandanajignesh-byte/Repo-finder-`

2. **Navigate to Actions tab:**
   - Click on "Actions" tab at the top

3. **Find the workflow run:**
   - Look for "Update Daily Trending Repos" workflow
   - Click on the latest run (should show green checkmark if successful)

4. **Check the logs:**
   - Click on "Update daily trending repos" job
   - Expand each step to see:
     - ✅ **Checkout repository** - Should show files checked out
     - ✅ **Setup Node.js** - Should show Node.js version
     - ✅ **Install dependencies** - Should show npm install output
     - ✅ **Update daily trending repos** - **THIS IS THE KEY STEP**
       - Look for: "✅ Found X trending repos"
       - Look for: "✅ Inserted X repos into trending_repos"
       - Look for any error messages

5. **Common Issues to Check:**
   - ❌ "No GitHub tokens found" → Secrets not set
   - ❌ "Could not find table 'trending_repos'" → Table doesn't exist
   - ❌ "Authentication failed" → Wrong Supabase credentials
   - ❌ "No repos found matching criteria" → Search criteria too strict

## Method 2: Run Verification Script Locally

```bash
cd RepoFinderMobile
node verify-trending-repos.js
```

This will show:
- How many trending repos are in the database
- When they were last updated
- Sample repo details

## Method 3: Check Supabase Database Directly

1. **Go to Supabase Dashboard:**
   - Visit your Supabase project dashboard

2. **Open SQL Editor:**
   - Click on "SQL Editor" in the left sidebar

3. **Run this query:**

```sql
-- Check if trending_repos table exists
SELECT COUNT(*) as total_daily 
FROM trending_repos 
WHERE period_type = 'daily' 
  AND period_date = CURRENT_DATE;

-- Check latest entries
SELECT 
  period_type,
  period_date,
  COUNT(*) as repo_count,
  MAX(created_at) as last_update
FROM trending_repos
GROUP BY period_type, period_date
ORDER BY last_update DESC
LIMIT 10;

-- Check sample repos
SELECT 
  tr.rank,
  tr.repo_id,
  tr.trending_score,
  r.name,
  r.stars,
  r.language
FROM trending_repos tr
LEFT JOIN repos_master r ON tr.repo_id = r.repo_id
WHERE tr.period_type = 'daily'
  AND tr.period_date = CURRENT_DATE
ORDER BY tr.rank
LIMIT 10;
```

## Method 4: Test the Script Locally

Test if the script works on your machine:

```bash
cd RepoFinderMobile

# Make sure .env file has:
# SUPABASE_URL=your_url
# SUPABASE_SERVICE_ROLE_KEY=your_key
# GH_API_TOKENS=token1,token2,token3

# Run the script manually
node update-trending-repos.js --period=daily

# Then verify
node verify-trending-repos.js
```

## Expected Results

✅ **Success looks like:**
- Workflow shows green checkmark
- Logs show "✅ Found X trending repos"
- Logs show "✅ Inserted X repos into trending_repos"
- Verification script shows repos in database
- Supabase query returns data

❌ **Failure looks like:**
- Workflow shows red X
- Logs show error messages
- Verification script shows 0 repos
- Supabase query returns empty

## Troubleshooting

### If workflow shows success but no data:

1. **Check if table exists:**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name = 'trending_repos'
   );
   ```

2. **Check script output in logs:**
   - Look for "No repos found" messages
   - Check if search criteria are too strict

3. **Verify secrets:**
   - Go to Settings → Secrets → Actions
   - Ensure all three secrets are set:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GH_API_TOKENS`

### If workflow fails:

1. **Check error message in logs**
2. **Common fixes:**
   - Missing secrets → Add them in GitHub Settings
   - Wrong table name → Check SQL schema
   - API rate limits → Add more tokens
   - Network errors → Check GitHub Actions connectivity
