# Repoverse Database Schema Documentation

## Overview

This document describes the complete database schema for Repoverse, a repository discovery and recommendation system. The schema is organized into three main layers:

1. **RAW DATA** → GitHub ingestion
2. **ENRICHED DATA** → Tags, health, badges
3. **PERSONAL DATA** → Users + recommendations

## Table Structure

### 1. Core Repository Tables

#### `repos_master`
Master catalog of all repositories from GitHub.

**Key Columns:**
- `repo_id` (BIGINT, PK) - GitHub repository ID
- `full_name` (TEXT, UNIQUE) - e.g., "facebook/react"
- `stars`, `forks`, `watchers` - Engagement metrics
- `topics` (JSONB) - GitHub topics array
- `ingested_at` - When repo was added to system

**Indexes:**
- Language, stars, owner, topics (GIN), ingested_at

---

### 2. Repository Tagging Tables

#### `repo_clusters`
Maps repositories to interest categories (AI/ML, Web Dev, Mobile, etc.)

**Columns:**
- `repo_id` → `repos_master.repo_id`
- `cluster_slug` - e.g., "ai_ml", "web_dev", "mobile"
- `weight` (0.0-1.0) - How strongly repo belongs to cluster
- `confidence_score` (0.0-1.0) - Detection confidence

**Example:**
```
repo_id | cluster_slug | weight | confidence_score
--------|--------------|--------|------------------
101     | ai_ml        | 0.9    | 0.95
101     | automation   | 0.6    | 0.75
```

#### `repo_tech_stack`
Stores detected frameworks and tools per repository.

**Columns:**
- `repo_id` → `repos_master.repo_id`
- `tech_slug` - e.g., "python", "react", "docker"
- `weight` (0.0-1.0) - Relevance weight

**Example:**
```
repo_id | tech_slug | weight
--------|-----------|-------
501     | python    | 1.0
501     | fastapi   | 0.9
501     | docker    | 0.7
```

#### `repo_complexity`
Classifies repositories by skill level suitability.

**Columns:**
- `repo_id` → `repos_master.repo_id`
- `complexity_slug` - One of: `tutorial`, `boilerplate`, `full_app`, `production_saas`, `infrastructure`, `framework`
- `confidence` (0.0-1.0) - Classification confidence
- `loc_bucket` - Size category: `small`, `medium`, `large`, `xlarge`

---

### 3. Health & Quality Tables

#### `repo_health`
Multi-dimensional health scoring for repositories.

**Columns:**
- `repo_id` (PK) → `repos_master.repo_id`
- `activity_score` (0.0-1.0) - Recent activity level
- `maintenance_score` (0.0-1.0) - Maintenance quality
- `community_score` (0.0-1.0) - Community engagement
- `code_quality_score` (0.0-1.0) - Code quality metrics
- `documentation_score` (0.0-1.0) - Docs quality
- `stability_score` (0.0-1.0) - Stability indicators
- `health_score` (0.0-1.0) - Overall health (weighted average)
- `computed_at` - Last computation timestamp

**Example:**
```
repo_id | activity | maintenance | community | code_quality | docs | stability | health_score
--------|----------|------------|-----------|--------------|------|-----------|-------------
101     | 0.82     | 0.74       | 0.91      | 0.63         | 0.88 | 0.79      | 0.81
```

#### `badge_definitions`
Catalog of available badges.

**Columns:**
- `badge_slug` (PK) - e.g., "well_maintained", "beginner_friendly"
- `name`, `description`, `icon`, `color`

**Default Badges:**
- `well_maintained` - Active development
- `beginner_friendly` - Great for learning
- `trending` - Rapidly gaining stars
- `production_ready` - Stable for production
- `high_quality` - Excellent code/docs
- `popular` - Widely used

#### `repo_badges`
Maps badges to repositories.

**Columns:**
- `repo_id` → `repos_master.repo_id`
- `badge_slug` → `badge_definitions.badge_slug`
- `awarded_at` - When badge was awarded

---

### 4. User Onboarding Tables

#### `user_profile`
Core user profile information.

**Columns:**
- `user_id` (PK) - User identifier
- `username`, `email`
- `skill_level` - `beginner`, `intermediate`, `advanced`
- `complexity_vector` (JSONB) - Skill-based complexity preferences
- `onboarding_completed` (BOOLEAN)

#### `user_interests`
User-selected interest categories.

**Columns:**
- `user_id` → `user_profile.user_id`
- `interest_slug` - e.g., "ai_ml", "web_dev", "mobile"
- `weight` (0.0-1.0) - Priority weight (1st choice = 1.0, 2nd = 0.8, etc.)
- `selected_rank` - Selection order

#### `user_tech_stack`
User's technology preferences.

**Columns:**
- `user_id` → `user_profile.user_id`
- `tech_slug` - e.g., "python", "react", "docker"
- `weight` (0.0-1.0) - Preference strength

#### `user_goals`
User's goals for using Repoverse.

**Columns:**
- `user_id` → `user_profile.user_id`
- `goal_slug` - e.g., "learning", "startup", "freelance", "contributing", "exploring"

#### `user_preferences`
Additional user preferences.

**Columns:**
- `user_id` (PK) → `user_profile.user_id`
- `repo_size_pref` - `small`, `medium`, `large`
- `size_weight` (0.0-1.0) - Size preference strength
- `trend_pref` - `low`, `medium`, `high`
- `time_availability` - `low`, `medium`, `high`

#### `user_current_projects`
Optional: User's current project description.

**Columns:**
- `user_id` (PK) → `user_profile.user_id`
- `text_input` - Free text description
- `extracted_clusters` (JSONB) - AI-extracted interest clusters

---

### 5. Recommendation System Tables

#### `user_vectors`
Vector representation of user preferences for scoring.

**Columns:**
- `user_id` (PK) → `user_profile.user_id`
- `interest_vector` (JSONB) - Interest weights: `{"ai_ml": 0.9, "automation": 0.7}`
- `tech_vector` (JSONB) - Tech stack weights: `{"python": 1.0, "flutter": 0.6}`
- `complexity_vector` (JSONB) - Complexity preferences: `{"full_app": 1.0, "tutorial": 0.4}`
- `goal_vector` (JSONB) - Goal weights: `{"learning": 1.0, "contributing": 0.8}`
- `behavior_vector` (JSONB) - Learned from interactions
- `updated_at` - Last vector update

**Example:**
```json
{
  "interest_vector": {"ai_ml": 0.9, "automation": 0.7},
  "tech_vector": {"python": 1.0, "flutter": 0.6},
  "complexity_vector": {"full_app": 1.0, "tutorial": 0.4},
  "goal_vector": {"learning": 1.0}
}
```

#### `repo_recommendations`
Precomputed recommendation scores for users.

**Columns:**
- `user_id` → `user_profile.user_id`
- `repo_id` → `repos_master.repo_id`
- `score` (DECIMAL) - Final recommendation score
- `interest_match` - Interest matching score
- `tech_match` - Tech stack matching score
- `complexity_match` - Complexity matching score
- `health_boost` - Health score boost
- `freshness_boost` - Recency boost
- `computed_at` - Computation timestamp
- `version` - Algorithm version

**Indexes:**
- `(user_id, score DESC)` - Fast feed queries

---

### 6. Interaction Tracking Tables

#### `repo_interactions`
Tracks user interactions with repositories.

**Columns:**
- `user_id` → `user_profile.user_id`
- `repo_id` → `repos_master.repo_id`
- `interaction_type` - `click`, `star`, `bookmark`, `view_time`, `fork`, `like`, `skip`, `save`, `share`
- `interaction_value` - For `view_time` (seconds), or 1.0 for binary actions
- `created_at` - Interaction timestamp

**Constraints:**
- Unique per `(user_id, repo_id, interaction_type, DATE(created_at))` - One per day per type

#### `user_github_data`
Optional: GitHub-connected user data.

**Columns:**
- `user_id` → `user_profile.user_id`
- `repo_id` → `repos_master.repo_id`
- `interaction_type` - `starred`, `forked`, `contributed`, `watching`

---

## Data Flow

### Onboarding Flow
```
User completes onboarding
  ↓
user_interests, user_tech_stack, user_profile, user_goals, user_preferences
  ↓
Vector generator runs
  ↓
user_vectors updated
  ↓
Scoring engine runs
  ↓
repo_recommendations filled
  ↓
Mobile app fetches ranked repos
```

### Recommendation Scoring Formula
```
score = 
  (interest_match * 0.35) +
  (tech_match * 0.15) +
  (complexity_match * 0.15) +
  (goal_match * 0.10) +
  (popularity * 0.10) +
  (health_score * 0.15)
```

## Views

### `user_feed_view`
Pre-joined view for user feed queries:
- Recommendations + repo details + health scores
- Filtered to latest version per user

### `repo_full_view`
Complete repository metadata:
- Repo details + health + clusters + tech stack + complexity + badges

## Example Queries

### Get User Feed (Top 20)
```sql
SELECT * FROM user_feed_view
WHERE user_id = 'user_123'
ORDER BY score DESC
LIMIT 20;
```

### Get Repos Matching User Interests
```sql
SELECT DISTINCT r.*, rc.weight as interest_weight
FROM repos_master r
JOIN repo_clusters rc ON r.repo_id = rc.repo_id
JOIN user_interests ui ON rc.cluster_slug = ui.interest_slug
WHERE ui.user_id = 'user_123'
ORDER BY rc.weight DESC, r.stars DESC
LIMIT 50;
```

### Get Repos by Health Score
```sql
SELECT * FROM repo_full_view
WHERE health_score >= 0.8
ORDER BY stars DESC
LIMIT 50;
```

## Recompute Triggers

Recommendations should be recomputed when:

**User Triggers:**
- Onboarding completed
- Preferences updated
- Repo starred/bookmarked

**Repo Triggers:**
- Health score updated
- New stars surge
- Repo archived

## Minimum Tables (MVP)

For a lean v1, you need:
- `repos_master`
- `repo_clusters`
- `repo_complexity`
- `repo_health`
- `repo_badges`
- `user_profile`
- `user_interests`
- `user_vectors`
- `repo_recommendations`

Everything else can be added incrementally.
