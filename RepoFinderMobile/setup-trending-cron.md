# Setup Daily/Weekly Trending Repos Fetch

## Overview
This system automatically fetches new trending repos from GitHub daily/weekly, checks if they're underrated gems, and stores them in the trending system.

## Setup

### 1. Create Database Tables
Run `create-trending-system.sql` in Supabase SQL Editor (already provided above).

### 2. Manual Run (Testing)
```bash
# Fetch daily trending repos
node fetch-daily-trending.js --period=daily

# Fetch weekly trending repos
node fetch-daily-trending.js --period=weekly
```

### 3. Automated Daily/Weekly Fetch

#### Option A: Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Name: "Fetch Daily Trending Repos"
4. Trigger: Daily at 2 AM
5. Action: Start a program
6. Program: `node`
7. Arguments: `C:\Users\manda\github\RepoFinderMobile\fetch-daily-trending.js --period=daily`
8. Start in: `C:\Users\manda\github\RepoFinderMobile`

Repeat for weekly (every Monday at 3 AM).

#### Option B: Cron Job (if using WSL/Linux)
```bash
# Edit crontab
crontab -e

# Add these lines:
0 2 * * * cd /mnt/c/Users/manda/github/RepoFinderMobile && node fetch-daily-trending.js --period=daily
0 3 * * 1 cd /mnt/c/Users/manda/github/RepoFinderMobile && node fetch-daily-trending.js --period=weekly
```

#### Option C: Supabase Edge Function (Recommended)
Create a Supabase Edge Function that calls the script via HTTP, then set up a cron trigger in Supabase.

## What It Does

1. **Fetches Trending Repos** from GitHub API
   - Searches for repos with recent activity and stars
   - Gets top 500 trending repos

2. **Ingests New Repos**
   - Checks if repo exists in `repos_master`
   - If not, stores it
   - Enriches it (health, activity, etc.)

3. **Detects Underrated Gems**
   - Checks if repo qualifies as gem (stars < 1000, high health, etc.)
   - Adds to `repo_gems` if qualified

4. **Calculates Trending Scores**
   - Calculates trending score based on activity, freshness, health
   - Stores in `repo_trending_scores` table

5. **Ready for Query**
   - Use `get_trending_underrated_gems()` function to query
   - Filter by category and period (daily/weekly)

## Query Trending Gems

```javascript
// In your app
const { data } = await supabase.rpc('get_trending_underrated_gems', {
  p_period_type: 'daily',  // or 'weekly'
  p_cluster_slug: 'ai_ml', // or null for all
  p_limit: 50
});
```

## Maintenance

- Run `fetch-daily-trending.js --period=daily` daily
- Run `fetch-daily-trending.js --period=weekly` weekly
- The script automatically handles:
  - Rate limiting
  - Duplicate detection
  - Enrichment
  - Gem detection
  - Trending score calculation
