# Trending Repos Auto-Update System

## Overview
This system automatically fetches and updates daily/weekly trending underrated gems. Old entries are automatically deleted when new ones are added.

## How It Works

1. **Fetches Trending Repos** from GitHub API
2. **Filters for Underrated Gems** (from `repo_gems` or meets criteria)
3. **Deletes OLD entries** for the current period
4. **Inserts NEW trending repos**
5. **Auto-cleans** entries older than 7 days (daily) or 4 weeks (weekly)

## Setup

### 1. Create Table
Run this SQL in Supabase SQL Editor:

```sql
-- Copy contents from create-trending-repos-table.sql
```

### 2. Test Manual Update
```bash
# Update daily trending
node update-trending-repos.js --period=daily

# Update weekly trending
node update-trending-repos.js --period=weekly
```

### 3. Set Up Automation

#### Option A: Windows Task Scheduler (Recommended)
1. Open **Task Scheduler**
2. Create **Basic Task**
3. **Name:** "Update Daily Trending Repos"
4. **Trigger:** Daily at 2:00 AM
5. **Action:** Start a program
6. **Program:** `node`
7. **Arguments:** `C:\Users\manda\github\RepoFinderMobile\update-trending-repos.js --period=daily`
8. **Start in:** `C:\Users\manda\github\RepoFinderMobile`

Repeat for weekly (every Monday at 3:00 AM).

#### Option B: Batch Files (Manual)
- Double-click `run-daily-trending.bat` daily
- Double-click `run-weekly-trending.bat` weekly

#### Option C: Supabase Cron (Best for Production)
Create a Supabase Edge Function and set up cron triggers.

## Query Trending Gems

### In Your App:
```javascript
// Get daily trending gems for a category
const { data } = await supabase.rpc('get_trending_gems', {
  p_period_type: 'daily',
  p_cluster_slug: 'ai_ml', // or null for all
  p_limit: 50
});

// Get weekly trending (all categories)
const { data } = await supabase.rpc('get_trending_gems', {
  p_period_type: 'weekly',
  p_cluster_slug: null,
  p_limit: 50
});
```

### Direct SQL:
```sql
-- Get daily trending gems
SELECT * FROM get_trending_gems('daily', 'ai_ml', 50);

-- Get weekly trending (all categories)
SELECT * FROM get_trending_gems('weekly', NULL, 50);

-- Or use the view
SELECT * FROM trending_gems_view 
WHERE period_type = 'daily' 
  AND period_date = CURRENT_DATE
ORDER BY rank;
```

## Auto-Cleanup

The script automatically:
- **Deletes old entries** when updating (replaces current period)
- **Cleans up** entries older than:
  - 7 days for daily period
  - 4 weeks for weekly period

## Features

✅ **Auto-updates** - Fetches new trending repos daily/weekly  
✅ **Auto-deletes** - Removes old entries automatically  
✅ **Underrated gems only** - Only shows repos from `repo_gems`  
✅ **Category filtering** - Filter by onboarding clusters  
✅ **Daily/Weekly toggle** - Switch between periods  
✅ **Ranked** - Repos are ranked by trending score  

## Maintenance

The system is fully automated once set up. Just ensure:
- Task Scheduler is running (if using Windows)
- GitHub tokens are valid
- Database connection is working
