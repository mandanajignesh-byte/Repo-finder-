# Trending Repositories Database Setup

This document explains how to set up and use the database-backed trending repositories system.

## Overview

Instead of fetching trending repos on-demand from GitHub API every time, we now:
1. **Fetch trending repos daily/weekly** and store them in Supabase
2. **Serve from database** for faster loading and reduced API calls
3. **Clean up old data** automatically to keep the database lean

## Setup

### 1. Create Database Table

Run the SQL script in your Supabase SQL Editor:

```sql
-- Run: supabase-trending-repos.sql
```

This creates the `trending_repos` table with proper indexes and RLS policies.

### 2. Install Dependencies

Make sure you have `tsx` installed for running TypeScript scripts:

```bash
npm install -D tsx
# or
pnpm add -D tsx
```

### 3. Configure Environment Variables

Ensure your `.env.local` file has:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GITHUB_TOKEN=your_github_token  # Optional but recommended for higher rate limits
```

## Usage

### Fetch and Store Trending Repos

Run the fetch script to populate the database:

```bash
# Fetch daily trending repos (default)
npm run fetch-trending:daily

# Fetch weekly trending repos
npm run fetch-trending:weekly

# Or specify manually
npm run fetch-trending daily
npm run fetch-trending weekly
npm run fetch-trending monthly
```

The script will:
- Fetch trending repos from GitHub API
- Store both filtered (unknown gems) and unfiltered versions
- Delete old entries for the same time range/date before inserting new ones

### Cleanup Old Data

Run the cleanup script periodically to remove old trending repos:

```bash
# Delete repos older than 7 days (default)
npm run cleanup-trending

# Delete repos older than 14 days
npm run cleanup-trending 14
```

## Automated Scheduling

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/fetch-trending.yml`:

```yaml
name: Fetch Trending Repos

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  fetch-trending:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run fetch-trending:daily
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Option 2: Cron Job (Server)

On your server, add to crontab:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/app && npm run fetch-trending:daily

# Weekly cleanup on Sundays at 3 AM
0 3 * * 0 cd /path/to/app && npm run cleanup-trending
```

### Option 3: Vercel Cron Jobs

Add `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-trending",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Create `api/cron/fetch-trending.ts`:

```typescript
import { exec } from 'child_process';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  exec('npm run fetch-trending:daily', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return res.status(500).json({ error: 'Failed to fetch trending repos' });
    }
    res.status(200).json({ success: true, output: stdout });
  });
}
```

## How It Works

### Fetch Flow

1. **Script runs** → Fetches trending repos from GitHub API
2. **Stores in database** → Saves repos with metadata (time_range, date_key, language, etc.)
3. **Deletes old entries** → Removes previous entries for the same time range/date before inserting

### Read Flow

1. **User requests trending repos** → `githubService.getTrendingRepos()` is called
2. **Check localStorage cache** → First checks in-memory cache
3. **Check database** → If not cached, fetches from Supabase
4. **Fallback to API** → If database is empty, falls back to GitHub API
5. **Cache result** → Stores in localStorage for subsequent requests

### Database Schema

```sql
trending_repos (
  id UUID PRIMARY KEY,
  repo_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_description TEXT,
  repo_stars INTEGER,
  repo_forks INTEGER,
  repo_language TEXT,
  repo_url TEXT,
  repo_owner_login TEXT,
  repo_owner_avatar_url TEXT,
  repo_topics TEXT[],
  repo_tags TEXT[],
  trending_score TEXT,  -- e.g., "🔥 1.2k stars"
  rank INTEGER,           -- Position in trending list
  time_range TEXT,       -- 'daily', 'weekly', 'monthly'
  date_key TEXT,         -- YYYY-MM-DD for daily, YYYY-W## for weekly
  language TEXT,         -- Filter language (null = all)
  exclude_well_known BOOLEAN,  -- Whether well-known repos were filtered
  repo_data JSONB,       -- Full repo data
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Benefits

1. **Faster Loading** → Database queries are faster than GitHub API calls
2. **Reduced API Calls** → Only fetch once per day/week instead of on every request
3. **Better Rate Limits** → Avoid hitting GitHub API rate limits
4. **Consistent Data** → All users see the same trending repos for a given day/week
5. **Offline Support** → Can serve cached trending repos even if GitHub API is down

## Monitoring

Check database stats:

```sql
-- Count repos by time range
SELECT time_range, date_key, COUNT(*) as count
FROM trending_repos
GROUP BY time_range, date_key
ORDER BY date_key DESC;

-- Check latest fetch
SELECT MAX(created_at) as last_fetch
FROM trending_repos;
```

## Troubleshooting

### Script fails with "Missing Supabase credentials"
- Check `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Script fails with rate limit errors
- Add `GITHUB_TOKEN` to `.env.local` for higher rate limits
- The script includes rate limiting delays between requests

### Database queries return empty
- Run `npm run fetch-trending:daily` to populate the database
- Check that the table was created correctly

### Old repos not being cleaned up
- Run `npm run cleanup-trending` manually
- Check cron job is running correctly
