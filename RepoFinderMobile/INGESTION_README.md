# Repoverse Repository Ingestion

Complete script to fetch GitHub repositories and populate all database tables automatically.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (from Supabase dashboard)
- `GITHUB_TOKEN` - Optional, but recommended for higher rate limits (get from https://github.com/settings/tokens)

## Usage

### Ingest Specific Repositories

```bash
node ingest-repos.js owner/repo [owner/repo ...]
```

**Examples:**
```bash
# Single repo
node ingest-repos.js facebook/react

# Multiple repos
node ingest-repos.js facebook/react tensorflow/tensorflow flutter/flutter

# Popular repos
node ingest-repos.js \
  facebook/react \
  tensorflow/tensorflow \
  flutter/flutter \
  kubernetes/kubernetes \
  pandas-dev/pandas \
  vercel/next.js \
  microsoft/vscode \
  nodejs/node
```

### Ingest Underrated & Useful Repositories

```bash
# Discover and ingest underrated repos (excludes major orgs)
node ingest-underrated.js

# With custom parameters
node ingest-underrated.js --min-stars 100 --max-stars 3000 --limit 50

# Ingest by specific keywords/use cases
node ingest-by-keywords.js "api client" "task manager" "data parser"

# Or use predefined useful keywords
node ingest-by-keywords.js --useful
```

### Ingest Trending Repositories

```bash
node ingest-trending.js
```

This will fetch 50 trending repositories (high stars, recent activity) and ingest them automatically.

## Discovery Strategies

### 1. Underrated Repos (`ingest-underrated.js`)
- Searches by topics (productivity, developer-tools, automation, etc.)
- Filters out major orgs (Facebook, Google, Microsoft, etc.)
- Star range: 50-5000 (configurable)
- Must have recent activity (pushed in last 6 months)
- Quality filters (description length, issue ratio)

### 2. Keyword-Based (`ingest-by-keywords.js`)
- Searches for specific use cases
- Examples: "api client", "task manager", "data parser"
- Excludes major orgs
- Focuses on practical, useful tools

### 3. Manual Selection (`ingest-repos.js`)
- You specify exact repos to ingest
- Best for curating specific repositories

## What It Does

For each repository, the script:

1. ✅ Fetches repository data from GitHub API
2. ✅ Fetches commit history for activity tracking
3. ✅ Inserts into `repos_master`
4. ✅ Classifies and inserts into `repo_cluster_new` (interests)
5. ✅ Detects and inserts into `repo_tech_stack`
6. ✅ Classifies and inserts into `repo_complexity`
7. ✅ Calculates and inserts into `repo_activity` (freshness scores)
8. ✅ Calculates and inserts into `repo_health` (health scores)
9. ✅ Assigns badges in `repo_badges`

## Classification Logic

### Clusters
- Analyzes repository topics and description
- Maps keywords to cluster slugs (ai_ml, web_dev, mobile, etc.)
- Assigns weights and confidence scores

### Tech Stack
- Detects primary language
- Identifies frameworks from description/topics
- Maps to tech slugs (python, react, docker, etc.)

### Complexity
- Analyzes repository size, stars, and description
- Classifies as: tutorial, boilerplate, full_app, production_saas, infrastructure, framework

### Activity & Freshness
- Fetches latest commit date
- Calculates commits in last 30/90 days
- Computes freshness score based on days inactive
- Calculates activity score (freshness + velocity)

### Health Score
- Multi-dimensional scoring:
  - Activity (25%)
  - Maintenance (20%)
  - Community (20%)
  - Code Quality (15%)
  - Documentation (10%)
  - Stability (10%)

## Rate Limiting

- Without GitHub token: 60 requests/hour
- With GitHub token: 5,000 requests/hour
- Script includes 1-2 second delays between requests

## Example Output

```
🚀 Starting ingestion of 3 repositories...

📦 Fetching facebook/react...
  📝 Inserting into repos_master...
  🏷️  Classifying clusters...
  🛠️  Detecting tech stack...
  📊 Classifying complexity...
  ⚡ Calculating activity...
  ❤️  Calculating health score...
  🏅 Assigning badges...
  ✅ Successfully ingested facebook/react

📦 Fetching tensorflow/tensorflow...
  ...
✨ Ingestion complete!
```

## Troubleshooting

### Error: "GitHub API error: 403"
- Add `GITHUB_TOKEN` to `.env` file
- Check token permissions

### Error: "relation does not exist"
- Make sure you've run `complete-repoverse-schema.sql` first
- Check Supabase connection

### Error: "Invalid repo format"
- Use format: `owner/repo`
- Example: `facebook/react` not `facebook-react`

## Next Steps

After ingestion:
1. Run recommendation generation for users
2. Set up cron jobs for periodic updates
3. Monitor health scores and refresh as needed
