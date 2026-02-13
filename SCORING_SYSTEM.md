# Repository Scoring System

## Overview

This system implements a hybrid recommendation scoring approach that precomputes global scores and combines them with user-specific factors at query time.

## Score Components

### Precomputed Scores (Stored in Database)

These scores are calculated once and stored in `repo_clusters` table:

1. **`popularity_score`** (0-100, 12% weight)
   - Based on stars and forks
   - Uses log scale to prevent huge repos from dominating
   - Formula: `log10(stars + 1) * 20 * 0.7 + log10(forks + 1) * 10 * 0.3`

2. **`activity_score`** (0-100, 10% weight)
   - Based on last commit date
   - Recent commits = higher score
   - Scoring:
     - Last 7 days: 100
     - Last 30 days: 90
     - Last 90 days: 70
     - Last 180 days: 50
     - Last 365 days: 30
     - Older: 10

3. **`freshness_score`** (0-100, 5% weight)
   - Boosts newer repos
   - Based on repo creation date
   - Scoring:
     - Last 30 days: 100
     - Last 90 days: 90
     - Last 180 days: 70
     - Last 365 days: 50
     - Last 2 years: 30
     - Older: 10

4. **`quality_score_new`** (0-100, 5% weight)
   - Based on repo completeness
   - Factors:
     - Description length (20 pts)
     - Topics count (20 pts)
     - License (15 pts)
     - README indicator (15 pts)
     - Documentation indicators (15 pts)
     - Tests/CI indicators (10 pts)
     - Demo/live link (5 pts)

5. **`trending_score`** (0-100, 15% weight)
   - Currently: Combination of popularity + activity
   - **TODO**: Update daily with actual growth metrics (stars/forks growth in last 7 days)

6. **`base_score`** (0-100)
   - Combined precomputed score
   - Formula: `popularity * 0.12 + activity * 0.10 + freshness * 0.05 + quality * 0.05`
   - Used for initial ranking before user-specific factors

### User-Specific Scores (Computed at Query Time)

These are calculated dynamically based on user preferences:

1. **Personalization** (40% weight)
   - Embedding similarity
   - Click history
   - User behavior patterns

2. **Preference Match** (8% weight)
   - Language match
   - Framework match
   - Topic match

3. **Diversity** (5% weight)
   - Avoid repetitive feed
   - Penalty for similar repos already shown

## Database Schema

```sql
ALTER TABLE repo_clusters ADD COLUMN IF NOT EXISTS popularity_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE repo_clusters ADD COLUMN IF NOT EXISTS activity_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE repo_clusters ADD COLUMN IF NOT EXISTS freshness_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE repo_clusters ADD COLUMN IF NOT EXISTS quality_score_new DECIMAL(5,2) DEFAULT 0;
ALTER TABLE repo_clusters ADD COLUMN IF NOT EXISTS trending_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE repo_clusters ADD COLUMN IF NOT EXISTS base_score DECIMAL(5,2) DEFAULT 0;
```

## Usage

### Calculate Scores for All Existing Repos

```bash
npm run calculate-scores
```

This will:
- Fetch all repos from `repo_clusters`
- Calculate all scores
- Update the database

### New Repos (Automatic)

When running `npm run curate-clusters`, scores are automatically calculated and stored for new repos.

### Final Recommendation Score

```
FINAL_SCORE = 
  base_score * 0.32 +
  trending_score * 0.15 +
  personalization * 0.40 +
  preference_match * 0.08 +
  diversity * 0.05
```

## Next Steps

1. ✅ Add score columns to database
2. ✅ Create scoring calculation script
3. ✅ Update curation script to calculate scores
4. ⏳ Run `npm run calculate-scores` to populate existing repos
5. ⏳ Update recommendation service to use precomputed scores
6. ⏳ Create daily cron job to update trending_score

## Files Modified

- `scripts/calculate-repo-scores.ts` - Score calculation script
- `scripts/curate-clusters-improved.ts` - Updated to calculate scores for new repos
- `package.json` - Added `calculate-scores` script
