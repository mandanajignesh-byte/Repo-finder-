# Daily Update Analysis - What Needs Regular Updates?

## Current Status ✅

### Already Updated Daily/Weekly:
- ✅ **`trending_repos`** - Daily + Weekly updates (467 daily, 237 weekly)

### Static Tables (No Daily Updates Needed):
- ✅ **`repos_master`** - Base repository data (20k+ repos, filled once)
- ✅ **`repo_cluster_new`** - Cluster assignments (enriched once)
- ✅ **`repo_tech_stack`** - Tech stack detection (enriched once)
- ✅ **`repo_complexity`** - Complexity classification (enriched once)
- ✅ **`repo_badges`** - Badge assignments (enriched once)

## Tables That COULD Benefit from Daily Updates:

### 1. **`repo_activity`** ⚠️ RECOMMENDED
**Why:** Activity scores change as repos get new commits
- `commits_30_days`, `commits_90_days` - Changes daily
- `freshness_score` - Based on last commit date
- `activity_score` - Based on commit velocity

**Recommendation:** Update ONLY for trending repos (already fetched daily)
- ~700 repos max (467 daily + 237 weekly)
- Low cost, high value

### 2. **`repo_health`** ⚠️ RECOMMENDED
**Why:** Health scores change as repos gain stars/forks/issues
- `community_score` - Based on stars/forks
- `health_score` - Overall health metric

**Recommendation:** Update ONLY for trending repos
- Same ~700 repos
- Keeps trending repos' scores fresh

### 3. **`repo_gems`** ⚠️ OPTIONAL
**Why:** Gems list could change as repos gain/lose stars
- Criteria: stars < 1000, health_score > 0.8, etc.
- Could recalculate periodically

**Recommendation:** Recalculate weekly (not daily)
- Less critical than activity/health
- Weekly is sufficient

## Recommended Daily Update Strategy:

### Option 1: Update Activity/Health for Trending Repos Only (RECOMMENDED)
**Pros:**
- ✅ Low cost (~700 repos/day)
- ✅ High value (trending repos are what users see)
- ✅ Already fetching trending repos daily

**Implementation:**
- Add step to `update-trending-repos.js` to refresh activity/health scores
- Or create separate lightweight script

### Option 2: Update All Repos Daily (NOT RECOMMENDED)
**Cons:**
- ❌ Expensive (20k+ repos = many API calls)
- ❌ Rate limit issues
- ❌ Low value (most repos don't change daily)

## Conclusion:

**You DON'T need any other daily updates right now!**

The current setup is perfect:
- ✅ Trending repos updated daily/weekly
- ✅ Base dataset is static (which is fine)
- ✅ Enrichment tables are complete

**Optional Enhancement (Future):**
- Update `repo_activity` and `repo_health` for trending repos only
- This keeps trending repos' scores fresh without heavy API usage
