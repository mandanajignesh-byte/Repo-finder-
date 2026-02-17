# Setup Enrichment Tables

## Problem
The enrichment tables (`repo_health`, `repo_activity`, `repo_complexity`, `repo_tech_stack`, `repo_badges`, `repo_gems`) don't exist in the database, causing all enrichment operations to fail silently.

## Solution

### Step 1: Create the Tables
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `create-enrichment-tables.sql`
4. Run the SQL script

This will create all necessary enrichment tables:
- `repo_tech_stack` - Technologies used in repos
- `repo_complexity` - Complexity classification (tutorial, boilerplate, full_app, etc.)
- `repo_activity` - Activity and freshness scores
- `repo_health` - Health scoring (maintenance, community, code quality, etc.)
- `badge_definitions` - Badge catalog
- `repo_badges` - Badge assignments to repos
- `repo_gems` - Underrated gems detection

### Step 2: Run Enrichment
After creating the tables, run:
```bash
node enrich-all-repos.js
```

This will enrich all 20k+ repos in `repos_master` and populate all the enrichment tables.

### Step 3: Verify
Check the status:
```bash
node check-status.js
```

You should see:
- ✅ repo_health: ~20,694
- ✅ repo_activity: ~20,694
- ✅ repo_complexity: ~20,694
- ✅ repo_tech_stack: (multiple entries per repo)
- ✅ repo_badges: (multiple entries per repo)
- ✅ repo_gems: (5-12% of repos)
