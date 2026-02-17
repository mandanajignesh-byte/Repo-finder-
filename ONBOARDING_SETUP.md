# Onboarding Setup Guide

## Quick Setup

### 1. Check Available Clusters in Database

Run this SQL in Supabase SQL Editor:

```sql
SELECT 
  cluster,
  COUNT(*) as repo_count,
  AVG(recommendation_score) as avg_score,
  MIN(stars) as min_stars,
  MAX(stars) as max_stars
FROM repos
WHERE cluster IS NOT NULL
GROUP BY cluster
ORDER BY repo_count DESC;
```

This shows which clusters have repos and how many.

### 2. If No Repos Found

Run the comprehensive ingestion script:

```bash
cd "GitHub Repository Discovery App"
npm run ingest-comprehensive
```

This fetches ~2000 repos covering all clusters, languages, and goals.

### 3. App Users Schema (Optional)

If you want a separate `app_users` table for mobile app users, run:

```sql
-- See supabase-app-users-schema.sql
```

This creates:
- `app_users` table (separate from web users)
- `app_user_preferences` table (matches repos structure)
- Proper indexes and RLS policies

## Onboarding Flow

1. **Step 1: Primary Cluster** (Required)
   - User selects one of 8 clusters
   - Matches actual clusters in database

2. **Step 2: Languages** (Optional)
   - User selects preferred languages
   - Filters repos by language

3. **Step 3: Goals** (Required - at least one)
   - User selects goals
   - Maps to topics in repos

## Repo Fetching Logic

The app fetches repos using:
1. Primary cluster (required filter)
2. Preferred languages (optional filter)
3. Goals (topic matching)

If no repos match, falls back to cluster-only query.
