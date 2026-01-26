# Cluster-Based Hybrid Recommendation System

## Overview

This implementation uses a **hybrid approach** that combines:
1. **Pre-curated clusters** (0 API calls for first-time users)
2. **Dynamic personalization** (minimal API calls for engaged users)

## Architecture

### First-Time Users
- **Zero GitHub API calls** - All repos from Supabase clusters
- Instant loading from pre-curated data
- "Best of [Cluster]" experience based on minimal preferences

### Engaged Users
- **Minimal API calls** - Mix of pre-curated + dynamic repos
- Tag-based filtering from clusters
- Dynamic fetching only to fill gaps

## Files Created/Modified

### New Files
1. `src/services/cluster.service.ts` - Cluster management service
2. `scripts/curate-clusters.ts` - Script to populate clusters
3. `supabase-schema-complete.sql` - Complete database schema

### Modified Files
1. `src/services/repo-pool.service.ts` - Hybrid pool building
2. `src/app/components/DiscoveryScreen.tsx` - Uses cluster service

## Setup Instructions

### Step 1: Run SQL Schema in Supabase

1. Open your Supabase project
2. Go to SQL Editor
3. Copy and paste the entire contents of `supabase-schema-complete.sql`
4. Click "Run" to execute

This creates:
- All existing tables (users, preferences, etc.)
- **NEW**: `repo_clusters` table (pre-curated repos)
- **NEW**: `cluster_metadata` table (cluster info)
- All indexes and RLS policies
- Initial cluster metadata entries

### Step 2: Populate Clusters

Run the curation script to fetch and store repos in clusters:

```bash
cd "GitHub Repository Discovery App"
npx tsx scripts/curate-clusters.ts
```

**Requirements:**
- Set environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GITHUB_API_TOKEN` (optional but recommended)

**What it does:**
- Fetches top 150 repos for each cluster
- Applies quality filters
- Stores in Supabase `repo_clusters` table
- Updates cluster metadata

**Clusters created:**
- `frontend` - React, Vue, Angular, UI components
- `backend` - Node.js, Express, Django, APIs
- `ai-ml` - TensorFlow, PyTorch, ML libraries
- `mobile` - React Native, Flutter, mobile frameworks
- `devops` - Docker, Kubernetes, CI/CD tools
- `data-science` - Pandas, NumPy, analytics tools

### Step 3: Verify Setup

1. Check Supabase dashboard:
   - `cluster_metadata` should have 6 rows
   - `repo_clusters` should have ~900 repos (150 × 6 clusters)

2. Test the app:
   - First-time users should see repos instantly (no API calls)
   - Engaged users should see personalized repos

## How It Works

### Cluster Detection

The system detects the primary cluster from user preferences:

```typescript
// From onboarding form:
- interests: ['web-frontend'] → 'frontend' cluster
- techStack: ['React', 'Vue'] → 'frontend' cluster
- goals: ['learning-new-tech'] → Default to 'frontend'
```

### First-Time User Flow

1. User opens app (no preferences)
2. System detects default cluster (usually 'frontend')
3. Fetches "Best of Frontend" from `repo_clusters` table
4. **Zero API calls** - All from Supabase
5. Shows top 20 repos instantly

### Engaged User Flow

1. User has preferences (tech stack, goals, etc.)
2. System fetches curated repos matching tags
3. If enough curated repos (≥50), uses them
4. If not enough, fetches dynamic repos to fill gaps
5. Combines and deduplicates
6. Shows personalized recommendations

### Tag-Based Matching

Repos can have multiple tags:
```json
{
  "tags": ["react", "ui-components", "animations"],
  "cluster_name": "frontend"
}
```

A repo with `["react", "ui-components"]` will appear for:
- Users interested in "react"
- Users interested in "ui-components"
- Users interested in "animations"

**No duplication** - One repo serves multiple interests!

## Cluster Maintenance

### Weekly Curation (Recommended)

Run the curation script weekly to keep clusters fresh:

```bash
# Add to cron or scheduled task
npx tsx scripts/curate-clusters.ts
```

### Manual Curation

You can also manually add/remove repos in Supabase:
1. Go to `repo_clusters` table
2. Insert/update/delete rows
3. Update `cluster_metadata.repo_count`

## Benefits

### ✅ First-Time User Experience
- Instant loading (0 API calls)
- High-quality curated repos
- "Best of [Cluster]" experience

### ✅ Server Load
- First-time: 0 GitHub API calls
- Engaged: Minimal API calls (only to fill gaps)
- Most data from Supabase (fast reads)

### ✅ Full Control
- You control which repos are shown
- Quality validation before storage
- Easy to update/remove repos

### ✅ Scalability
- ~150 repos per cluster × 6 clusters = ~900 repos
- All in Supabase (fast queries)
- Tag-based filtering (efficient)

### ✅ Personalization
- Tag matching for engaged users
- Rotation strategies (trending, stars, updated, hidden gems)
- Gradual transition from curated to personalized

## Troubleshooting

### No repos showing for first-time users
- Check `cluster_metadata` has entries
- Check `repo_clusters` has repos
- Verify RLS policies allow SELECT

### Curation script fails
- Check GitHub API token is set
- Check Supabase credentials
- Check rate limits (add delays if needed)

### Repos not matching preferences
- Verify tags in `repo_clusters` match user interests
- Check cluster detection logic
- Run curation script to update tags

## Next Steps

1. ✅ Run SQL schema in Supabase
2. ✅ Run curation script to populate clusters
3. ✅ Test with first-time user (should see repos instantly)
4. ✅ Test with engaged user (should see personalized repos)
5. ✅ Set up weekly curation (cron/scheduled task)

## Questions?

Check the code comments in:
- `src/services/cluster.service.ts` - Cluster operations
- `src/services/repo-pool.service.ts` - Hybrid pool building
- `scripts/curate-clusters.ts` - Curation logic
