# Quick Start - Ingestion Pipeline

## Step 0: Create repo_gems Table (Do This First!)

1. Open Supabase SQL Editor
2. Copy and paste contents of `add-repo-gems-table.sql`
3. Click Run

---

## Step 1: Run All Steps Together (Recommended)

```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=all --limit=10
```

This runs all 7 steps for 10 repos.

---

## Step 2: Or Run Steps One by One

```bash
cd C:\Users\manda\github\RepoFinderMobile

# Step 1: Fetch repos from GitHub
node ingest-pipeline.js --step=1 --limit=10

# Step 2: Store repos in database
node ingest-pipeline.js --step=2 --limit=10

# Step 3: Enrich (clusters, tech stack, complexity)
node ingest-pipeline.js --step=3 --limit=10

# Step 4: Compute activity & freshness
node ingest-pipeline.js --step=4 --limit=10

# Step 5: Compute health scores
node ingest-pipeline.js --step=5 --limit=10

# Step 6: Assign badges
node ingest-pipeline.js --step=6 --limit=10

# Step 7: Detect underrated gems
node ingest-pipeline.js --step=7 --limit=10
```

---

## Custom Searches

```bash
cd C:\Users\manda\github\RepoFinderMobile

# Search for automation repos
node ingest-pipeline.js --step=1 --query="topic:automation stars:100..2000" --limit=20

# Search for API clients
node ingest-pipeline.js --step=1 --query="api client stars:50..1000" --limit=15

# Search for AI/ML repos
node ingest-pipeline.js --step=1 --query="topic:machine-learning stars:100..3000" --limit=30
```

---

## Verify Results

After running, check in Supabase:

```sql
-- Check all tables
SELECT 'repos_master' as table_name, COUNT(*) as count FROM repos_master
UNION ALL
SELECT 'repo_cluster_new', COUNT(*) FROM repo_cluster_new
UNION ALL
SELECT 'repo_tech_stack', COUNT(*) FROM repo_tech_stack
UNION ALL
SELECT 'repo_activity', COUNT(*) FROM repo_activity
UNION ALL
SELECT 'repo_health', COUNT(*) FROM repo_health
UNION ALL
SELECT 'repo_badges', COUNT(*) FROM repo_badges
UNION ALL
SELECT 'repo_gems', COUNT(*) FROM repo_gems;

-- View gems
SELECT * FROM repo_gems_view LIMIT 10;
```

---

## Troubleshooting

**Error: "Cannot find module"**
- Run: `npm install` first

**Error: "Rate limit exceeded"**
- Add `GITHUB_TOKEN` to `.env` file

**Error: "relation does not exist"**
- Make sure you ran `add-repo-gems-table.sql` first
