# Trending Underrated Gems Setup

## Overview
This system shows daily and weekly trending repositories that are also underrated gems (from `repo_gems` table), filtered by onboarding categories (clusters).

## Setup Steps

### 1. Create Database Tables
Run the SQL in `create-trending-system.sql` in Supabase SQL Editor:

```sql
-- Copy contents of create-trending-system.sql
```

This creates:
- `repo_trending_scores` table - stores trending scores for daily/weekly periods
- `trending_underrated_gems` view - combines gems with trending scores
- `get_trending_underrated_gems()` function - query trending gems by category

### 2. Calculate Trending Scores
Run the calculation script to populate trending scores:

```bash
# Calculate daily trending scores
node calculate-trending-scores.js --period=daily

# Calculate weekly trending scores
node calculate-trending-scores.js --period=weekly

# Or both at once
node calculate-trending-scores.js --period=both
```

This will:
- Find all repos in `repo_gems` (underrated gems)
- Calculate trending scores based on activity, freshness, and health
- Store scores in `repo_trending_scores` table

### 3. Query Trending Gems
Test the query function:

```bash
# Get daily trending gems (all categories)
node get-trending-gems.js --period=daily

# Get weekly trending gems for a specific category
node get-trending-gems.js --period=weekly --cluster=ai_ml

# Get daily trending for web_dev
node get-trending-gems.js --period=daily --cluster=web_dev
```

## Available Clusters (Categories)

- `ai_ml` - AI/ML
- `web_dev` - Web Development
- `devops` - DevOps
- `data_science` - Data Science
- `mobile` - Mobile Development
- `automation` - Automation
- `cybersecurity` - Cybersecurity
- `blockchain` - Blockchain
- `game_dev` - Game Development
- `open_source_tools` - Open Source Tools

## Usage in App

### Query from Supabase Client

```javascript
// Get daily trending gems for a category
const { data, error } = await supabase
  .rpc('get_trending_underrated_gems', {
    p_period_type: 'daily',
    p_cluster_slug: 'ai_ml',
    p_limit: 50
  });

// Get weekly trending (all categories)
const { data, error } = await supabase
  .rpc('get_trending_underrated_gems', {
    p_period_type: 'weekly',
    p_cluster_slug: null,
    p_limit: 50
  });
```

### Response Format

Each repo includes:
- `repo_id` - Repository ID
- `name`, `full_name`, `description`
- `stars`, `forks`, `language`
- `gem_score` - Underrated gem score
- `trending_score` - Trending score (0-1)
- `star_velocity` - Estimated stars gained per period
- `cluster_slug` - Category/cluster
- `health_score`, `freshness_score`
- `rank` - Rank in trending list

## Daily/Weekly Toggle

The `period_type` parameter controls the time range:
- `daily` - Trending in last 24 hours
- `weekly` - Trending in last 7 days

Users can toggle between these in the UI.

## Maintenance

### Recalculate Trending Scores
Run daily/weekly to keep scores fresh:

```bash
# Daily cron job
node calculate-trending-scores.js --period=daily

# Weekly cron job (e.g., every Monday)
node calculate-trending-scores.js --period=weekly
```

### Check Status
```bash
node get-trending-gems.js --period=daily --cluster=ai_ml
```

## Notes

- Only repos in `repo_gems` are included (underrated gems)
- Trending scores are calculated from activity, freshness, and health metrics
- Scores are stored per period (daily/weekly) and date
- The function automatically gets the latest period date
