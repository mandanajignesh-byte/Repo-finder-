# Complete Ingestion Pipeline Guide

## Overview

This guide walks you through running the complete ingestion pipeline step-by-step. The pipeline fetches repos from GitHub and populates all database tables.

---

## Prerequisites

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
Create `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GITHUB_TOKEN=your-github-token
```

3. **Create repo_gems table:**
Run this SQL in Supabase first:
```sql
-- Run: add-repo-gems-table.sql
```

---

## Step-by-Step Execution

### STEP 1: Create repo_gems Table

**Run in Supabase SQL Editor:**
```sql
-- Copy and paste contents of: add-repo-gems-table.sql
```

**Verify:**
```sql
SELECT * FROM repo_gems LIMIT 1;
```

---

### STEP 2: Fetch Repositories (Step 1)

**Command:**
```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=1 --limit=10
```

**What it does:**
- Searches GitHub for repos (default: stars 50-5000, recent activity)
- Fetches repo data and latest commits
- Returns list of repos (not stored yet)

**Custom search:**
```bash
# Search by topic
node ingest-pipeline.js --step=1 --query="topic:automation stars:100..2000" --limit=20

# Search by keyword
node ingest-pipeline.js --step=1 --query="api client stars:50..1000" --limit=15
```

**Expected output:**
```
📦 STEP 1: Fetching Repositories from GitHub...
  ✅ Fetched 10 repositories
```

---

### STEP 3: Store Repos (Step 2)

**Command:**
```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=2 --limit=10
```

**What it does:**
- Takes repos from Step 1
- Inserts into `repos_master` table
- Skips duplicates

**Expected output:**
```
💾 STEP 2: Storing in repos_master...
  ✅ Stored: owner/repo-name
  📊 Results: 10 stored, 0 skipped
```

**Verify:**
```sql
SELECT COUNT(*) FROM repos_master;
```

---

### STEP 4: Enrich Repos (Step 3)

**Command:**
```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=3 --limit=10
```

**What it does:**
- Classifies repos into clusters (ai_ml, web_dev, mobile, etc.)
- Detects tech stack (python, react, docker, etc.)
- Classifies complexity (tutorial, framework, etc.)
- Populates: `repo_cluster_new`, `repo_tech_stack`, `repo_complexity`

**Expected output:**
```
🏷️  STEP 3: Enriching Repos...
  ✅ Enriched: owner/repo (2 clusters, 3 tech, framework)
```

**Verify:**
```sql
-- Check clusters
SELECT cluster_slug, COUNT(*) FROM repo_cluster_new GROUP BY cluster_slug;

-- Check tech stack
SELECT tech_slug, COUNT(*) FROM repo_tech_stack GROUP BY tech_slug;
```

---

### STEP 5: Compute Activity (Step 4)

**Command:**
```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=4 --limit=10
```

**What it does:**
- Fetches commit history from GitHub
- Calculates commits in last 30/90 days
- Computes freshness score (based on days inactive)
- Computes activity score
- Populates: `repo_activity`

**Expected output:**
```
⚡ STEP 4: Computing Activity & Freshness...
  ✅ Activity computed: owner/repo (freshness: 0.95)
```

**Verify:**
```sql
SELECT repo_id, freshness_score, activity_score FROM repo_activity LIMIT 5;
```

---

### STEP 6: Compute Health (Step 5)

**Command:**
```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=5 --limit=10
```

**What it does:**
- Calculates health subscores:
  - Activity (25%)
  - Maintenance (20%)
  - Community (20%)
  - Code Quality (15%)
  - Documentation (10%)
  - Stability (10%)
- Computes overall health_score
- Populates: `repo_health`

**Expected output:**
```
❤️  STEP 5: Computing Health Scores...
  ✅ Health computed: owner/repo (score: 0.85)
```

**Verify:**
```sql
SELECT repo_id, health_score FROM repo_health ORDER BY health_score DESC LIMIT 10;
```

---

### STEP 7: Assign Badges (Step 6)

**Command:**
```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=6 --limit=10
```

**What it does:**
- Assigns badges based on conditions:
  - `well_maintained` - health > 0.85
  - `actively_updated` - freshness > 0.85
  - `beginner_friendly` - tutorial + good docs
  - `production_ready` - health > 0.8 + freshness > 0.7
- Populates: `repo_badges`

**Expected output:**
```
🏅 STEP 6: Assigning Badges...
  ✅ Badges assigned: 123456789 (well_maintained, production_ready)
```

**Verify:**
```sql
SELECT badge_slug, COUNT(*) FROM repo_badges GROUP BY badge_slug;
```

---

### STEP 8: Detect Gems (Step 7)

**Command:**
```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=7 --limit=10
```

**What it does:**
- Detects underrated high-quality repos
- Conditions:
  - Stars < 5000
  - Health > 0.80
  - Freshness > 0.70
  - Documentation > 0.70
- Calculates gem_score
- Populates: `repo_gems`

**Expected output:**
```
💎 STEP 7: Detecting Underrated Gems...
  💎 Gem detected: 123456789 (score: 0.82)
```

**Verify:**
```sql
SELECT * FROM repo_gems_view ORDER BY gem_score DESC LIMIT 10;
```

---

## Running All Steps Together

**Full pipeline:**
```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-pipeline.js --step=all --limit=20
```

This runs all 7 steps in sequence for 20 repos.

---

## Recommended Workflow

### First Time Setup:
1. ✅ Create `repo_gems` table (SQL)
2. ✅ Run Step 1-2: Fetch and store 10 repos
3. ✅ Run Step 3-7: Enrich and compute for those 10 repos
4. ✅ Verify data in Supabase

### Regular Ingestion:
```bash
cd C:\Users\manda\github\RepoFinderMobile

# Daily: Fetch new repos
node ingest-pipeline.js --step=1-2 --limit=50

# Daily: Enrich new repos
node ingest-pipeline.js --step=3-7 --limit=50

# Weekly: Recompute health for all repos
node ingest-pipeline.js --step=5-7 --limit=1000
```

---

## Customization

### Search for Specific Clusters:
```bash
cd C:\Users\manda\github\RepoFinderMobile

# AI/ML repos
node ingest-pipeline.js --step=1 --query="topic:machine-learning stars:100..3000" --limit=30

# Web dev repos
node ingest-pipeline.js --step=1 --query="topic:web-development stars:50..2000" --limit=30

# Mobile repos
node ingest-pipeline.js --step=1 --query="topic:mobile-app stars:100..2500" --limit=30
```

### Process Existing Repos:
```bash
cd C:\Users\manda\github\RepoFinderMobile

# If you already have repos in repos_master, skip steps 1-2
node ingest-pipeline.js --step=3-7 --limit=50
```

---

## Troubleshooting

### Rate Limit Errors:
- Add `GITHUB_TOKEN` to `.env`
- Script automatically waits when rate limited

### Missing Data:
- Run steps in order
- Check Supabase connection
- Verify table exists

### Slow Performance:
- Reduce `--limit` value
- Run steps separately
- Process in batches

---

## Verification Queries

After running pipeline, verify with:

```sql
-- Check all tables
SELECT 'repos_master' as table_name, COUNT(*) as count FROM repos_master
UNION ALL
SELECT 'repo_cluster_new', COUNT(*) FROM repo_cluster_new
UNION ALL
SELECT 'repo_tech_stack', COUNT(*) FROM repo_tech_stack
UNION ALL
SELECT 'repo_complexity', COUNT(*) FROM repo_complexity
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

## Next Steps

After ingestion:
1. Generate recommendations for users
2. Set up cron jobs for automated ingestion
3. Monitor gem detection
4. Build "Hidden Gems" feed
