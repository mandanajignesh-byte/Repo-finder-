# Quick Start: Run Cluster Curation

## ✅ Step 1: Add Indexes to Supabase (REQUIRED - Do This First!)

**Copy this SQL and run it in Supabase SQL Editor:**

```sql
-- Performance Indexes for repo_clusters Table
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_name ON repo_clusters(cluster_name);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_quality ON repo_clusters(cluster_name, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_rotation ON repo_clusters(cluster_name, rotation_priority DESC);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_tags_gin ON repo_clusters USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_updated_at ON repo_clusters(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_tags ON repo_clusters(cluster_name) INCLUDE (tags);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_repo_id ON repo_clusters(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_clusters_cluster_repo ON repo_clusters(cluster_name, repo_id);
```

## ✅ Step 2: Ensure Environment Variables Are Set

Make sure your `.env.local` file has:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GITHUB_TOKEN=your_github_token
# OR
VITE_GITHUB_API_TOKEN=your_github_token
```

## ✅ Step 3: Run the Curation Script

From project root:
```bash
npm run curate-clusters
```

**This will:**
- Fetch repos for all 8 clusters (frontend, backend, mobile, desktop, data-science, devops, game-dev, ai-ml)
- Filter out no-code tools, AI agents, claude skills
- Store up to 1000 repos per cluster
- Take 1-2 hours (due to GitHub API rate limits)

## ✅ Step 4: Verify Results

After completion, run in Supabase SQL Editor:

```sql
SELECT cluster_name, COUNT(*) AS repo_count
FROM repo_clusters
GROUP BY cluster_name
ORDER BY repo_count DESC;
```

You should see ~500-1000 repos per cluster!
