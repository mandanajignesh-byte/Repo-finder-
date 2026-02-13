# Run Cluster Curation - Step by Step

## Step 1: Add Performance Indexes (Run in Supabase SQL Editor)

Copy and paste this entire SQL into Supabase SQL Editor and run it:

```sql
-- Performance Indexes for repo_clusters Table
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_name 
  ON repo_clusters(cluster_name);

CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_quality 
  ON repo_clusters(cluster_name, quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_rotation 
  ON repo_clusters(cluster_name, rotation_priority DESC);

CREATE INDEX IF NOT EXISTS idx_repo_clusters_tags_gin 
  ON repo_clusters USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_repo_clusters_updated_at 
  ON repo_clusters(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_tags 
  ON repo_clusters(cluster_name) 
  INCLUDE (tags);

CREATE INDEX IF NOT EXISTS idx_repo_clusters_repo_id 
  ON repo_clusters(repo_id);

CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_repo 
  ON repo_clusters(cluster_name, repo_id);
```

## Step 2: Run the Curation Script

From your project root, run:

```bash
npm run curate-clusters
```

Or directly:

```bash
npx tsx scripts/curate-clusters-improved.ts
```

**Expected time:** 1-2 hours (due to GitHub API rate limits)

**What it does:**
- Fetches repos for each cluster (frontend, backend, mobile, etc.)
- Filters out no-code tools, AI agents, claude skills
- Stores up to 1000 repos per cluster
- Updates cluster metadata

## Step 3: Verify Results

After completion, check in Supabase SQL Editor:

```sql
-- Check repo counts per cluster
SELECT cluster_name, COUNT(*) AS repo_count
FROM repo_clusters
GROUP BY cluster_name
ORDER BY repo_count DESC;

-- Check total repos
SELECT COUNT(*) AS total_repos FROM repo_clusters;

-- Check for any issues
SELECT cluster_name, COUNT(*) 
FROM repo_clusters 
GROUP BY cluster_name 
HAVING COUNT(*) < 100;
```

## Troubleshooting

**Rate limit errors?**
- The script handles rate limits automatically
- It will wait and retry
- Make sure `GITHUB_TOKEN` or `VITE_GITHUB_API_TOKEN` is set in `.env.local`

**Missing repos?**
- Check the console output for filtered repos
- Adjust `minStars` in the script if needed (currently 50)

**Slow queries?**
- Make sure indexes were created (Step 1)
- Check Supabase dashboard for query performance
