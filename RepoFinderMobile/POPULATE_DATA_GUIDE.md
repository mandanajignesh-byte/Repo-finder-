# Guide to Populate Repoverse Database

## Overview
This guide explains how to populate each table in the Repoverse database, from GitHub API data to computed recommendations.

---

## 📦 Table Population Order

Populate tables in this order to respect foreign key dependencies:

1. `repos_master` - Base repository data
2. `repo_cluster_new` - Interest clusters
3. `repo_tech_stack` - Technology stack
4. `repo_complexity` - Complexity classification
5. `repo_activity` - Commit activity
6. `repo_health` - Health scores
7. `repo_badges` - Badge assignments
8. User tables (via onboarding)
9. `repo_recommendations` - Computed recommendations

---

## 1️⃣ Repos Master (`repos_master`)

### Data Source
GitHub API: `GET /repos/{owner}/{repo}`

### Required Fields
```sql
INSERT INTO repos_master (
  repo_id,           -- GitHub repo ID
  name,              -- Repository name
  full_name,         -- owner/repo
  description,       -- Repo description
  owner_login,       -- Owner username
  avatar_url,        -- Owner avatar
  html_url,          -- GitHub URL
  language,          -- Primary language
  stars,             -- Star count
  forks,             -- Fork count
  watchers,          -- Watcher count
  open_issues,       -- Open issues
  topics,            -- JSONB array of topics
  size_kb,           -- Repository size
  created_at,        -- Created date
  updated_at,        -- Last updated
  pushed_at,         -- Last push
  last_commit_at,    -- From commits API (see below)
  archived,          -- Is archived
  license            -- License name
) VALUES (...);
```

### Example API Response Mapping
```javascript
{
  id: data.id,
  name: data.name,
  full_name: data.full_name,
  description: data.description,
  owner_login: data.owner.login,
  avatar_url: data.owner.avatar_url,
  html_url: data.html_url,
  language: data.language,
  stars: data.stargazers_count,
  forks: data.forks_count,
  watchers: data.watchers_count,
  open_issues: data.open_issues_count,
  topics: JSON.stringify(data.topics || []),
  size_kb: data.size,
  created_at: data.created_at,
  updated_at: data.updated_at,
  pushed_at: data.pushed_at,
  archived: data.archived,
  license: data.license?.name
}
```

---

## 2️⃣ Repo Clusters (`repo_cluster_new`)

### Data Source
- GitHub topics
- README analysis
- AI classification

### Cluster Slugs
- `ai_ml`
- `web_dev`
- `mobile`
- `devops`
- `cybersecurity`
- `data_science`
- `automation`
- `blockchain`
- `game_dev`
- `open_source_tools`

### Insert Example
```sql
INSERT INTO repo_cluster_new (repo_id, cluster_slug, weight, confidence_score)
VALUES 
  (123456789, 'ai_ml', 0.95, 0.98),
  (123456789, 'automation', 0.60, 0.75)
ON CONFLICT (repo_id, cluster_slug) DO UPDATE
SET weight = EXCLUDED.weight,
    confidence_score = EXCLUDED.confidence_score;
```

### Classification Logic
1. Parse GitHub topics → map to clusters
2. Analyze README keywords
3. Run ML classifier
4. Assign top 2-3 clusters with weights

---

## 3️⃣ Repo Tech Stack (`repo_tech_stack`)

### Data Source
- Repository languages
- Dependency files (package.json, requirements.txt, etc.)
- README mentions

### Tech Slugs Examples
- Languages: `python`, `javascript`, `go`, `rust`, `java`, `cpp`
- Frameworks: `react`, `nodejs`, `flutter`, `django`, `spring`
- Tools: `docker`, `kubernetes`, `supabase`, `tensorflow`

### Insert Example
```sql
INSERT INTO repo_tech_stack (repo_id, tech_slug, weight)
VALUES 
  (123456789, 'python', 0.95),
  (123456789, 'tensorflow', 1.0)
ON CONFLICT (repo_id, tech_slug) DO UPDATE
SET weight = EXCLUDED.weight;
```

---

## 4️⃣ Repo Complexity (`repo_complexity`)

### Data Source
- Lines of code (LOC)
- Project structure analysis
- README complexity indicators

### Complexity Slugs
- `tutorial` - Simple learning projects
- `boilerplate` - Starter templates
- `full_app` - Complete applications
- `production_saas` - Production-ready SaaS
- `infrastructure` - DevOps/infra tools
- `framework` - Frameworks/libraries

### Insert Example
```sql
INSERT INTO repo_complexity (repo_id, complexity_slug, confidence, loc_bucket)
VALUES 
  (123456789, 'framework', 0.95, 'xlarge')
ON CONFLICT (repo_id) DO UPDATE
SET complexity_slug = EXCLUDED.complexity_slug,
    confidence = EXCLUDED.confidence,
    loc_bucket = EXCLUDED.loc_bucket;
```

---

## 5️⃣ Repo Activity (`repo_activity`)

### Data Source
GitHub API: `GET /repos/{owner}/{repo}/commits`

### Get Last Commit
```javascript
// Get latest commit
const commits = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
const latestCommit = commits[0];
const lastCommitAt = latestCommit.commit.committer.date;
```

### Calculate Metrics
```sql
-- Calculate commits in last 30/90 days
SELECT 
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as commits_30_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days') as commits_90_days
FROM commits_table;

-- Calculate commit velocity
commit_velocity = commits_90_days / 90.0;

-- Calculate freshness_score (use function or logic)
freshness_score = CASE
  WHEN days_inactive <= 30 THEN 1.0
  WHEN days_inactive <= 90 THEN 0.85
  WHEN days_inactive <= 180 THEN 0.65
  WHEN days_inactive <= 365 THEN 0.45
  WHEN days_inactive <= 730 THEN 0.25
  ELSE 0.05
END;

-- Calculate activity_score
activity_score = (freshness_score * 0.6) + (commit_velocity * 0.4);
```

### Insert Example
```sql
INSERT INTO repo_activity (
  repo_id, last_commit_at, commits_30_days, commits_90_days,
  commit_velocity, freshness_score, activity_score
) VALUES 
  (123456789, '2024-01-14 12:00:00+00', 45, 120, 1.33, 1.0, 0.95)
ON CONFLICT (repo_id) DO UPDATE
SET last_commit_at = EXCLUDED.last_commit_at,
    commits_30_days = EXCLUDED.commits_30_days,
    commits_90_days = EXCLUDED.commits_90_days,
    commit_velocity = EXCLUDED.commit_velocity,
    freshness_score = EXCLUDED.freshness_score,
    activity_score = EXCLUDED.activity_score;
```

---

## 6️⃣ Repo Health (`repo_health`)

### Data Source
Computed from multiple metrics:
- Activity score (from `repo_activity`)
- Maintenance (recent PRs, issues resolved)
- Community (stars, forks, contributors)
- Code quality (linter scores, test coverage)
- Documentation (README quality, docs completeness)
- Stability (release frequency, breaking changes)

### Insert Example
```sql
INSERT INTO repo_health (
  repo_id, activity_score, maintenance_score, community_score,
  code_quality_score, documentation_score, stability_score, health_score
) VALUES 
  (123456789, 0.95, 0.88, 0.92, 0.85, 0.90, 0.87, 0.90)
ON CONFLICT (repo_id) DO UPDATE
SET activity_score = EXCLUDED.activity_score,
    maintenance_score = EXCLUDED.maintenance_score,
    community_score = EXCLUDED.community_score,
    code_quality_score = EXCLUDED.code_quality_score,
    documentation_score = EXCLUDED.documentation_score,
    stability_score = EXCLUDED.stability_score,
    health_score = EXCLUDED.health_score;
```

---

## 7️⃣ Repo Badges (`repo_badges`)

### Badge Assignment Logic
```sql
-- Actively Maintained (< 30 days)
INSERT INTO repo_badges (repo_id, badge_slug)
SELECT repo_id, 'actively_maintained'
FROM repo_activity
WHERE last_commit_at > NOW() - INTERVAL '30 days'
ON CONFLICT DO NOTHING;

-- Well Maintained (health > 0.85)
INSERT INTO repo_badges (repo_id, badge_slug)
SELECT repo_id, 'well_maintained'
FROM repo_health
WHERE health_score > 0.85
ON CONFLICT DO NOTHING;

-- Beginner Friendly (tutorial + docs high)
INSERT INTO repo_badges (repo_id, badge_slug)
SELECT r.repo_id, 'beginner_friendly'
FROM repo_complexity rc
JOIN repo_health rh ON rc.repo_id = rh.repo_id
WHERE rc.complexity_slug = 'tutorial' 
  AND rh.documentation_score > 0.8
ON CONFLICT DO NOTHING;
```

---

## 8️⃣ User Tables (Onboarding)

These are populated automatically when users complete onboarding via the Flutter app. The `AppSupabaseService.saveOnboardingData()` method handles this.

---

## 9️⃣ Repo Recommendations (`repo_recommendations`)

### Scoring Formula
```sql
-- Calculate recommendation score
score = 
  (interest_match * 0.35) +
  (tech_match * 0.15) +
  (complexity_match * 0.10) +
  (popularity * 0.10) +
  (health_score * 0.20) +
  (freshness_score * 0.10)
```

### Generate Recommendations (Example Query)
```sql
-- This would be run by a backend worker/cron job
INSERT INTO repo_recommendations (
  user_id, repo_id, score, interest_match, tech_match,
  complexity_match, health_boost, freshness_boost, version
)
SELECT 
  uv.user_id,
  r.repo_id,
  -- Calculate score (simplified example)
  (
    -- Interest match (simplified)
    COALESCE(
      (SELECT SUM(rc.weight * (uv.interest_vector->>rc.cluster_slug)::float)
       FROM repo_cluster_new rc
       WHERE rc.repo_id = r.repo_id
       AND uv.interest_vector ? rc.cluster_slug), 0
    ) * 0.35 +
    -- Tech match (simplified)
    COALESCE(
      (SELECT SUM(rts.weight * (uv.tech_vector->>rts.tech_slug)::float)
       FROM repo_tech_stack rts
       WHERE rts.repo_id = r.repo_id
       AND uv.tech_vector ? rts.tech_slug), 0
    ) * 0.15 +
    -- Health boost
    COALESCE(rh.health_score, 0) * 0.20 +
    -- Freshness boost
    COALESCE(ra.freshness_score, 0) * 0.10
  ) as score,
  -- Individual components (calculate separately)
  0.0 as interest_match,
  0.0 as tech_match,
  0.0 as complexity_match,
  COALESCE(rh.health_score, 0) as health_boost,
  COALESCE(ra.freshness_score, 0) as freshness_boost,
  1 as version
FROM user_vectors uv
CROSS JOIN repos_master r
LEFT JOIN repo_health rh ON r.repo_id = rh.repo_id
LEFT JOIN repo_activity ra ON r.repo_id = ra.repo_id
WHERE uv.user_id = 'USER_ID'
ON CONFLICT (user_id, repo_id, version) DO UPDATE
SET score = EXCLUDED.score;
```

---

## 🔄 Automation / Cron Jobs

### Weekly Jobs
1. **Fetch GitHub Data**: Update `repos_master` with latest stars, forks, etc.
2. **Fetch Commits**: Update `repo_activity` with latest commit data
3. **Recalculate Health**: Update `repo_health` scores
4. **Refresh Badges**: Reassign badges based on latest data
5. **Regenerate Recommendations**: Recompute `repo_recommendations` for all users

### Daily Jobs
- Update trending repos
- Refresh activity for high-traffic repos

---

## 📝 Quick Start: Sample Data

Run `populate-sample-data.sql` to insert sample data for testing:

```sql
-- This creates 5 sample repos with all related data
\i populate-sample-data.sql
```

---

## ✅ Verification Queries

After populating, verify with:

```sql
-- Check repo counts
SELECT COUNT(*) FROM repos_master;
SELECT COUNT(*) FROM repo_cluster_new;
SELECT COUNT(*) FROM repo_tech_stack;

-- Check sample recommendations
SELECT r.name, rr.score
FROM repo_recommendations rr
JOIN repos_master r ON rr.repo_id = r.repo_id
LIMIT 10;
```
