# Backend Architecture - Repoverse

## 1. Database Schema

### Unified `repos` Table
```sql
CREATE TABLE IF NOT EXISTS repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  owner_login TEXT NOT NULL,
  owner_avatar TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  language TEXT,
  topics TEXT[] DEFAULT '{}',
  license TEXT,
  repo_url TEXT NOT NULL,
  homepage_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  readme_summary TEXT,
  thumbnail_url TEXT,
  cluster TEXT,
  recommendation_score DECIMAL(10,2) DEFAULT 0,
  popularity_score DECIMAL(10,2) DEFAULT 0,
  activity_score DECIMAL(10,2) DEFAULT 0,
  freshness_score DECIMAL(10,2) DEFAULT 0,
  quality_score DECIMAL(10,2) DEFAULT 0,
  trending_score DECIMAL(10,2) DEFAULT 0,
  is_trending BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at_db TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_repos_cluster ON repos(cluster);
CREATE INDEX IF NOT EXISTS idx_repos_recommendation_score ON repos(recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_repos_stars ON repos(stars DESC);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repos(language);
CREATE INDEX IF NOT EXISTS idx_repos_topics_gin ON repos USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_repos_pushed_at ON repos(pushed_at DESC);
CREATE INDEX IF NOT EXISTS idx_repos_trending ON repos(is_trending, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_repos_featured ON repos(is_featured, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_repos_cluster_score ON repos(cluster, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_repos_github_id ON repos(github_id);
```

## 2. Ingestion Pipeline Structure

### `scripts/ingest-repos.ts`
```typescript
// Main ingestion orchestrator
- fetchFromGitHub() // Trending, search, topics
- normalizeRepoData() // Clean & transform
- extractTopics() // From topics, description, readme
- summarizeReadme() // AI summary (optional)
- assignCluster() // Based on topics/language
- computeScores() // All recommendation scores
- upsertToSupabase() // Batch upsert
```

### Score Calculation (Precomputed)
```typescript
// Calculate once during ingestion, store in DB
popularity_score = log(stars + 1) * 0.4 + log(forks + 1) * 0.3 + log(watchers + 1) * 0.3
activity_score = (commits_last_30d / 100) * 0.5 + (issues_closed / 10) * 0.3 + (prs_merged / 10) * 0.2
freshness_score = 1 / (1 + days_since_last_push / 30)
quality_score = (has_readme ? 0.3 : 0) + (has_tests ? 0.3 : 0) + (has_ci ? 0.2 : 0) + (license ? 0.2 : 0)
trending_score = (stars_growth_rate * 0.6) + (recent_activity * 0.4)
recommendation_score = (popularity * 0.3) + (activity * 0.25) + (freshness * 0.2) + (quality * 0.15) + (trending * 0.1)
```

## 3. Recommendation Engine Queries

### Feed Query (Cursor Pagination)
```sql
-- Get repos by cluster with cursor pagination
SELECT 
  github_id, name, full_name, description, owner_login, owner_avatar,
  stars, forks, language, topics, repo_url, pushed_at,
  recommendation_score, cluster
FROM repos
WHERE cluster = $1
  AND recommendation_score > $2
  AND github_id > $3  -- cursor
ORDER BY recommendation_score DESC, github_id ASC
LIMIT $4;
```

### Trending Feed
```sql
SELECT * FROM repos
WHERE is_trending = true
ORDER BY trending_score DESC, recommendation_score DESC
LIMIT 50;
```

### Featured Feed
```sql
SELECT * FROM repos
WHERE is_featured = true
ORDER BY recommendation_score DESC
LIMIT 50;
```

## 4. Performance Optimizations

### Response Trimming
- Only return essential fields for feed
- Exclude `readme_summary` from feed queries
- Use `SELECT` with specific columns

### Caching Strategy
- Cache feed results in Redis (5 min TTL)
- Cache user-specific recommendations (2 min TTL)
- Precompute popular queries

### Batch Operations
- Batch upsert in chunks of 100
- Use `ON CONFLICT` for upserts
- Background job for score recalculation

## 5. Scalability

### Partitioning (Future)
```sql
-- Partition by cluster for 1M+ repos
CREATE TABLE repos_frontend PARTITION OF repos FOR VALUES IN ('frontend');
CREATE TABLE repos_backend PARTITION OF repos FOR VALUES IN ('backend');
```

### Read Replicas
- Use Supabase read replicas for feed queries
- Primary for writes, replicas for reads

### Background Jobs
- Daily: Recalculate trending scores
- Weekly: Recalculate recommendation scores
- Hourly: Update activity scores

## 6. Incremental Updates

### Adding New Repos
- Run `npm run ingest-repos` - Uses `ON CONFLICT` upsert, only adds new repos
- No need to re-run all steps

### Updating Existing Repos
- Run `npm run update-repos [limit]` - Refreshes scores/metadata for existing repos
- Updates repos older than 7 days or with stale data
- Can target specific clusters

### Daily/Weekly Jobs
- Daily: `ingest-repos` (adds new trending repos)
- Weekly: `update-repos` (refresh scores for top repos)

## 7. Implementation Order

1. Create `repos` table schema
2. Build ingestion script (fetch → normalize → score → upsert)
3. Migrate existing `repo_clusters` data to `repos`
4. Update recommendation service to use `repos` table
5. Implement cursor pagination in API
6. Add caching layer
7. Set up background jobs for score updates
