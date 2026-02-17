# Cluster-Targeted Ingestion Guide

## Overview

This script ingests repos to meet target counts per cluster, ensuring balanced coverage across all 10 clusters.

## Target Distribution

| Cluster | Target Repos | Topics Searched |
|---------|-------------|-----------------|
| AI / ML | 3,000 | machine-learning, artificial-intelligence, deep-learning, neural-network, tensorflow, pytorch |
| Web Dev | 3,000 | web-development, frontend, backend, react, vue, angular, nextjs |
| DevOps | 2,500 | devops, docker, kubernetes, infrastructure, ci-cd, terraform |
| Data Science | 2,000 | data-science, data-analysis, pandas, jupyter, analytics |
| Mobile | 2,000 | mobile, ios, android, flutter, react-native, mobile-app |
| Automation | 1,500 | automation, bot, workflow, task-automation, scheduler |
| Cybersecurity | 1,500 | security, cybersecurity, encryption, authentication, vulnerability |
| Blockchain | 1,500 | blockchain, crypto, ethereum, web3, solidity, defi |
| Game Dev | 1,200 | game-development, gaming, unity, unreal-engine, game-engine |
| Open Source Tools | 1,300 | tool, utility, cli, developer-tools, productivity |

**Total Target: ~20,000 repos**

## Usage

### Ingest All Clusters

```bash
cd C:\Users\manda\github\RepoFinderMobile
node ingest-by-cluster-targets.js --cluster=all
```

This will:
- Check current count for each cluster
- Ingest repos until target is reached
- Skip clusters already at target
- Show progress for each cluster

### Ingest Specific Cluster

```bash
cd C:\Users\manda\github\RepoFinderMobile

# Ingest AI/ML cluster
node ingest-by-cluster-targets.js --cluster=ai_ml

# Ingest Web Dev cluster
node ingest-by-cluster-targets.js --cluster=web_dev

# Ingest DevOps cluster
node ingest-by-cluster-targets.js --cluster=devops
```

## How It Works

1. **Checks Current Count**: Queries database for existing repos in cluster
2. **Calculates Needed**: Target - Current = Repos to ingest
3. **Searches by Topics**: Uses multiple topics per cluster for better coverage
4. **Filters Quality**: 
   - Excludes major orgs (Facebook, Google, etc.)
   - Requires description
   - Requires recent activity (last 6 months)
   - Skips already-ingested repos
5. **Ingests Repos**: Stores in `repos_master` and assigns to cluster
6. **Tracks Progress**: Shows real-time progress per cluster

## Example Output

```
🚀 Cluster-Targeted Ingestion

Target Distribution:
  ai_ml: 3000 repos
  web_dev: 3000 repos
  devops: 2500 repos
  ...

🎯 Ingesting cluster: AI_ML
   Target: 3000 repos
   Current: 1250 repos
   Needed: 1750 repos

   🔍 Searching topic: machine-learning...
      Found 95 repos (page 1)
      ✅ Ingested: owner/repo (1/1750)
      ✅ Ingested: owner/repo (2/1750)
      ...

   ✅ Cluster ai_ml: Ingested 1750 repos
   📊 New total: 3000/3000

📊 Final Summary:
  ai_ml: 3000/3000 (100.0%)
  web_dev: 2850/3000 (95.0%)
  ...
  Total: 18500/20000 repos
```

## After Cluster Ingestion

After ingesting repos to cluster targets, run the full enrichment pipeline:

```bash
cd C:\Users\manda\github\RepoFinderMobile

# Enrich all repos (clusters, tech stack, complexity, activity, health, badges, gems)
node ingest-pipeline.js --step=3-7 --limit=1000
```

This will:
- Enrich with tech stack
- Classify complexity
- Compute activity & freshness
- Compute health scores
- Assign badges
- Detect gems

## Monitoring Progress

Check cluster counts anytime:

```sql
-- Current counts per cluster
SELECT 
  cluster_slug,
  COUNT(*) as repo_count,
  ROUND(COUNT(*) * 100.0 / 
    CASE cluster_slug
      WHEN 'ai_ml' THEN 3000
      WHEN 'web_dev' THEN 3000
      WHEN 'devops' THEN 2500
      WHEN 'data_science' THEN 2000
      WHEN 'mobile' THEN 2000
      WHEN 'automation' THEN 1500
      WHEN 'cybersecurity' THEN 1500
      WHEN 'blockchain' THEN 1500
      WHEN 'game_dev' THEN 1200
      WHEN 'open_source_tools' THEN 1300
    END, 1) as progress_percent
FROM repo_cluster_new
GROUP BY cluster_slug
ORDER BY repo_count DESC;
```

## Gems Detection

After reaching targets, gems should be ~5-12% of repos per cluster:

```sql
-- Gems per cluster
SELECT 
  rc.cluster_slug,
  COUNT(DISTINCT rc.repo_id) as total_repos,
  COUNT(DISTINCT rg.repo_id) as gems,
  ROUND(COUNT(DISTINCT rg.repo_id) * 100.0 / COUNT(DISTINCT rc.repo_id), 1) as gem_percentage
FROM repo_cluster_new rc
LEFT JOIN repo_gems rg ON rc.repo_id = rg.repo_id
GROUP BY rc.cluster_slug
ORDER BY rc.cluster_slug;
```

## Recommended Workflow

### Phase 1: Initial Ingestion (Week 1)
```bash
# Day 1-2: Ingest all clusters to targets
node ingest-by-cluster-targets.js --cluster=all

# Day 3-4: Enrich all repos
node ingest-pipeline.js --step=3-7 --limit=5000
```

### Phase 2: Continuous Updates (Weekly)
```bash
# Weekly: Top up clusters that are below target
node ingest-by-cluster-targets.js --cluster=all

# Weekly: Recompute health and gems
node ingest-pipeline.js --step=5-7 --limit=1000
```

## Tips

1. **Run in batches**: Don't run all clusters at once. Do 2-3 clusters per session.
2. **Monitor rate limits**: Script handles rate limits automatically, but may take time.
3. **Check progress**: Use SQL queries to monitor progress.
4. **Quality over quantity**: Script filters for quality, so some clusters may take longer.

## Troubleshooting

**Cluster not reaching target:**
- Try different topics
- Lower star range (e.g., 30-3000 instead of 50-5000)
- Check if topics are too restrictive

**Rate limit errors:**
- Add `GITHUB_TOKEN` to `.env`
- Script will auto-wait, but may take hours for full ingestion

**Missing repos:**
- Run enrichment pipeline after cluster ingestion
- Some repos may need manual classification
