# Vercel Cron Jobs Setup for Trending Repos

## Overview

This setup automatically fetches and stores trending repos daily/weekly using Vercel Cron Jobs.

## Files Created

1. **`api/cron/fetch-trending.ts`** - Serverless function that fetches and stores trending repos
2. **`vercel.json`** - Updated with cron job schedules

## Environment Variables Required in Vercel

Make sure these are set in your Vercel project settings:

1. **`VITE_SUPABASE_URL`** - Your Supabase project URL
2. **`VITE_SUPABASE_ANON_KEY`** - Your Supabase anon/public key  
3. **`GITHUB_TOKEN`** or **`VITE_GITHUB_API_TOKEN`** - Your GitHub Personal Access Token
4. **`CRON_SECRET`** (optional) - Secret for securing cron endpoints

## How It Works

### Automatic Schedule

The cron jobs run automatically:
- **Daily**: Every day at midnight UTC (`0 0 * * *`)
- **Weekly**: Every Sunday at midnight UTC (`0 0 * * 0`)

### Manual Testing

You can test the endpoint manually:

```bash
# Test daily fetch
curl https://your-domain.vercel.app/api/cron/fetch-trending?timeRange=daily&manual=true

# Test weekly fetch  
curl https://your-domain.vercel.app/api/cron/fetch-trending?timeRange=weekly&manual=true
```

## Deployment Steps

1. **Push to GitHub** - The cron jobs will be automatically configured when you deploy

2. **Verify Environment Variables** - Check Vercel dashboard → Settings → Environment Variables

3. **Check Cron Jobs** - After deployment, go to Vercel dashboard → Settings → Cron Jobs
   - You should see two cron jobs:
     - `fetch-trending-daily` (runs daily at midnight UTC)
     - `fetch-trending-weekly` (runs weekly on Sundays)

4. **Monitor Logs** - Check Vercel dashboard → Functions → `/api/cron/fetch-trending` for execution logs

## Troubleshooting

### Cron job not running?
- Check Vercel dashboard → Cron Jobs to see if they're enabled
- Verify environment variables are set correctly
- Check function logs for errors

### Function errors?
- Check that Supabase credentials are correct
- Verify GitHub token has proper permissions
- Check Supabase table exists (`trending_repos`)

### Rate limiting?
- Make sure `GITHUB_TOKEN` is set (increases rate limit from 60/hour to 5000/hour)
- The function includes rate limiting delays between requests

## What Gets Stored

For each time range (daily/weekly), the function stores:
- **Filtered repos** (`exclude_well_known: true`) - Lesser-known trending repos
- **Unfiltered repos** (`exclude_well_known: false`) - All trending repos

Both are stored separately so users can toggle between "Unknown Gems" and "All Trending" views.
