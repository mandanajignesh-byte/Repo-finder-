# README Storage Guide

## Overview

To show README files in the app, we need to store the full README markdown content in Supabase. This guide explains how to set it up.

## Step 1: Add README Column to Database

Run this SQL in Supabase SQL Editor:

```sql
-- See: supabase-add-readme-content.sql
ALTER TABLE repos 
ADD COLUMN IF NOT EXISTS readme_content TEXT;

CREATE INDEX IF NOT EXISTS idx_repos_has_readme 
ON repos((readme_content IS NOT NULL AND readme_content != ''));
```

## Step 2: Fetch READMEs for Existing Repos

After running the ingestion script, fetch READMEs separately to avoid rate limits:

```bash
cd "GitHub Repository Discovery App"
npm run fetch-readmes
```

This script:
- Fetches README content from GitHub API
- Updates repos in batches (10 at a time)
- Respects rate limits (100ms delay between requests)
- Handles repos without READMEs gracefully

## Step 3: Update Ingestion Script (Optional)

The comprehensive ingestion script now supports README fetching, but it's disabled by default to avoid rate limits. If you want to fetch READMEs during ingestion:

1. Edit `scripts/ingest-repos-comprehensive.ts`
2. Change `normalizeRepo(repo, false)` to `normalizeRepo(repo, true)`
3. **Warning**: This will be much slower and may hit rate limits

## Recommended Approach

**Two-step process:**

1. **First**: Run comprehensive ingestion (without READMEs)
   ```bash
   npm run ingest-comprehensive
   ```

2. **Then**: Fetch READMEs separately
   ```bash
   npm run fetch-readmes
   ```

This approach:
- ✅ Avoids rate limits during initial ingestion
- ✅ Allows you to fetch READMEs at your own pace
- ✅ Can be run multiple times (only fetches missing READMEs)

## Flutter App

The Flutter app automatically uses `readme_content` field:
- `ReadmePreviewModal` fetches from `readme_content`
- Swipe up on repo card to preview README
- Shows "No README available" if content is null

## Rate Limits

GitHub API rate limits:
- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

The `fetch-readmes.ts` script:
- Processes 10 repos per batch
- 100ms delay between requests
- 2 second delay between batches
- Handles rate limit errors gracefully

## Monitoring

Check README coverage:

```sql
SELECT 
  COUNT(*) as total_repos,
  COUNT(readme_content) as repos_with_readme,
  ROUND(COUNT(readme_content)::numeric / COUNT(*)::numeric * 100, 2) as coverage_percent
FROM repos;
```

## Troubleshooting

**No READMEs showing:**
1. Check if `readme_content` column exists
2. Run `npm run fetch-readmes` to populate READMEs
3. Check GitHub API rate limits
4. Verify `GITHUB_TOKEN` in `.env.local`

**Rate limit errors:**
- Wait 1 hour and retry
- Use authenticated GitHub token
- Reduce batch size in `fetch-readmes.ts`
