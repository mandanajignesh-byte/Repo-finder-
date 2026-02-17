# GitHub Actions Setup for Daily Trending Repos

## Quick Setup Steps

### 1. Push to GitHub
Make sure your code is pushed to GitHub repository.

### 2. Add Secrets to GitHub
Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these 3 secrets:
- **SUPABASE_URL** - Your Supabase project URL
- **SUPABASE_SERVICE_ROLE_KEY** - Your Supabase service role key (not anon key)
- **GH_API_TOKENS** - Your GitHub tokens (comma-separated): `token1,token2,token3,...`

**Important:** Secret name must be `GH_API_TOKENS` (NOT `GITHUB_TOKENS`) because GitHub reserves all names starting with `GITHUB_`

### 3. Test Manually
1. Go to your GitHub repository
2. Click "Actions" tab
3. Select "Update Daily Trending Repos" workflow
4. Click "Run workflow" → "Run workflow" button
5. Watch it run!

### 4. Automatic Schedule
The workflow will automatically run daily at 2 AM UTC.

To change the time, edit `.github/workflows/daily-trending.yml` and modify the cron schedule:
- `'0 2 * * *'` = 2 AM UTC daily
- `'0 8 * * *'` = 8 AM UTC daily
- `'0 14 * * *'` = 2 PM UTC daily

## Benefits

✅ **No PC needed** - Runs in GitHub's cloud  
✅ **Free** - Unlimited runs on public repos  
✅ **Reliable** - GitHub's infrastructure  
✅ **Logs** - See execution history and logs  
✅ **Manual trigger** - Can run manually anytime  

## Troubleshooting

If workflow fails:
1. Check Actions tab → See error logs
2. Verify secrets are set correctly
3. Test script locally first: `node update-trending-repos.js --period=daily`
