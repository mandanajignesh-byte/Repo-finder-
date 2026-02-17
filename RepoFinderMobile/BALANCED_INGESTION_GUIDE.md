# Balanced Multi-Dimensional Ingestion System

## Overview

The balanced ingestion system (`ingest-balanced.js`) ensures a **balanced distribution** of repositories across multiple dimensions to support accurate recommendations:

- **Clusters**: 2,000 repos per cluster (10 clusters = 20,000 total)
- **Skill Levels**: Beginner (25%), Intermediate (35%), Advanced (25%), Infrastructure (15%)
- **Star Tiers**: 0-100 (10%), 100-1k (35%), 1k-10k (35%), 10k+ (20%)
- **Languages**: Python (30%), JS/TS (25%), Go (10%), Rust (10%), Java/Kotlin (10%), Other (15%)
- **Repo Types**: Tutorials (20%), Boilerplates (20%), Full Apps (30%), Production SaaS (15%), Infrastructure (15%)
- **Gems**: 5-12% per cluster (underrated high-quality repos)

## Features

### 1. Multi-Dimensional Quota Tracking

The system tracks quotas across all dimensions simultaneously:

```javascript
class QuotaTracker {
  - skillLevels: { beginner, intermediate, advanced, infrastructure }
  - starTiers: { tier1, tier2, tier3, tier4 }
  - languages: { python, javascript, go, rust, java, other }
  - repoTypes: { tutorial, boilerplate, full_app, production_saas, infrastructure }
  - gems: count
  - total: count
}
```

### 2. Intelligent Classification

#### Skill Level Classification
- **Beginner**: Keywords like `tutorial`, `starter`, `beginner`, `learn`, `example`
- **Intermediate**: Keywords like `full app`, `dashboard`, `system`, `application`
- **Advanced**: Keywords like `saas`, `engine`, `platform`, `framework`
- **Infrastructure**: Keywords like `framework`, `orchestration`, `infrastructure`, `devops`

#### Repo Type Classification
- **Tutorial**: `tutorial`, `guide`, `learn`, `course`, `example`
- **Boilerplate**: `boilerplate`, `starter`, `template`, `scaffold`
- **Full App**: `app`, `application`, `project`, `demo`
- **Production SaaS**: `saas`, `platform`, `service`, `api`
- **Infrastructure**: `framework`, `library`, `toolkit`, `infrastructure`

#### Star Tier Classification
- **Tier 1**: 0-100 stars (10%)
- **Tier 2**: 100-1,000 stars (35%)
- **Tier 3**: 1,000-10,000 stars (35%)
- **Tier 4**: 10,000+ stars (20%)

#### Language Detection
- Uses GitHub API `/repos/{owner}/{repo}/languages` endpoint
- Primary language = language with most bytes
- Normalizes: TypeScript → JavaScript, Kotlin → Java

### 3. Underrated Gems Detection

A repo qualifies as a gem if:
- `stars < 1000`
- `health_score > 0.8`
- `freshness_score > 0.7`
- `documentation_score > 0.7`
- `contributors_count > 3`

Gems are inserted into `repo_gems` table with a calculated `gem_score`.

### 4. Intelligent Search Strategies

The system uses multiple search strategies:

1. **Skill Level + Topic**: `machine-learning tutorial`, `react starter`
2. **Star Tier + Topic**: Searches with star filters (`stars:100..1000`)
3. **Language + Topic**: `python machine-learning`, `javascript react`
4. **Random Diversity**: Shuffles strategies to ensure variety

### 5. Complete Enrichment Pipeline

For each ingested repo, the system:

1. ✅ Stores in `repos_master`
2. ✅ Assigns to `repo_cluster_new`
3. ✅ Detects and stores in `repo_tech_stack`
4. ✅ Classifies and stores in `repo_complexity`
5. ✅ Computes and stores in `repo_activity` (freshness, activity scores)
6. ✅ Computes and stores in `repo_health` (multi-dimensional health score)
7. ✅ Assigns badges in `repo_badges`
8. ✅ Detects and stores gems in `repo_gems`

## Usage

### Basic Usage

```bash
# Ingest all clusters (20,000 repos total)
node ingest-balanced.js --cluster=all

# Ingest specific cluster (2,000 repos)
node ingest-balanced.js --cluster=ai_ml
```

### Environment Variables

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GITHUB_TOKEN=your_github_token
```

**Important**: Use `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_ANON_KEY`) for write operations.

## Quota Enforcement

The system continues ingestion until **all quotas are satisfied**:

1. **Cluster Target**: 2,000 repos per cluster
2. **Skill Level Distribution**: Exact percentages per cluster
3. **Star Tier Distribution**: Exact percentages per cluster
4. **Language Distribution**: Exact percentages per cluster
5. **Repo Type Distribution**: Exact percentages per cluster
6. **Gem Target**: 5-12% per cluster

### Quota Priority

When searching for repos, the system prioritizes:
1. Skill level needs
2. Language needs
3. Star tier needs
4. Repo type needs

If no specific quota needs a repo, it still has a 30% chance of being ingested to meet overall cluster target.

## Output Tables

All tables are populated:

- ✅ `repos_master` - Core repository data
- ✅ `repo_cluster_new` - Cluster assignments
- ✅ `repo_tech_stack` - Detected technologies
- ✅ `repo_complexity` - Skill level classification
- ✅ `repo_activity` - Activity and freshness scores
- ✅ `repo_health` - Multi-dimensional health scores
- ✅ `repo_badges` - Assigned badges
- ✅ `repo_gems` - Underrated gems

## Progress Tracking

The system provides detailed progress updates every 10 repos:

```
✅ Ingested 10 repos | Total: 150/2000
   Skill: B:38 I:52 A:38 Inf:22
   Stars: T1:15 T2:52 T3:52 T4:31
   Langs: Py:45 JS:38 Go:15 Rust:15 Java:15 Other:23
   Types: Tut:30 Boil:30 App:45 SaaS:23 Inf:22
   Gems: 12
```

## Rate Limiting

- **GitHub API**: 1 second delay between requests
- **Rate Limit Handling**: Automatically waits when rate limit is hit
- **Connection Timeouts**: 60-second timeout with retry logic
- **SSL Issues**: Handles corporate proxy SSL certificate issues

## Deduplication

- Uses `repo_id` as primary key
- `UPSERT` operations prevent duplicates
- Checks `repos_master` before ingesting

## Example Output

```
🚀 Balanced Multi-Dimensional Ingestion System

Target Distribution:
  ai_ml: 2000 repos
  web_dev: 2000 repos
  devops: 2000 repos
  ...

Total Target: 20000 repos

Quota Targets (per cluster):
  Skill Levels: Beginner (25%), Intermediate (35%), Advanced (25%), Infrastructure (15%)
  Star Tiers: 0-100 (10%), 100-1k (35%), 1k-10k (35%), 10k+ (20%)
  Languages: Python (30%), JS/TS (25%), Go (10%), Rust (10%), Java/Kotlin (10%), Other (15%)
  Repo Types: Tutorials (20%), Boilerplates (20%), Full Apps (30%), SaaS (15%), Infra (15%)
  Gems: 5-12% per cluster

🎯 Ingesting cluster: AI_ML
   Target: 2000 repos

  ✅ Ingested 10 repos | Total: 150/2000
     Skill: B:38 I:52 A:38 Inf:22
     Stars: T1:15 T2:52 T3:52 T4:31
     ...

   ✅ Cluster ai_ml: Ingested 1850 repos
   📊 Final Status:
      Total: 2000/2000
      Skill Levels: B:500 I:700 A:500 Inf:300
      Star Tiers: T1:200 T2:700 T3:700 T4:400
      Languages: Py:600 JS:500 Go:200 Rust:200 Java:200 Other:300
      Repo Types: Tut:400 Boil:400 App:600 SaaS:300 Inf:300
      Gems: 150 (7.5%)
```

## Troubleshooting

### Issue: "Using SUPABASE_ANON_KEY" warning
**Solution**: Set `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file.

### Issue: Rate limit errors
**Solution**: The script automatically handles rate limits. If persistent, add a GitHub token to increase limits.

### Issue: SSL certificate errors
**Solution**: The script includes SSL bypass for corporate proxies. Only use in development.

### Issue: Quotas not balanced
**Solution**: The system prioritizes balance but may not achieve 100% exact distribution due to GitHub search limitations. Run multiple times to improve balance.

## Next Steps

After ingestion:
1. Run enrichment pipeline to update activity scores with commit history
2. Review gem detection results
3. Verify quota distributions match targets
4. Run recommendation engine to test accuracy
