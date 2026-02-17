# Repo Coverage Example Analysis

## Current: 233 Repos (After 12-month filter)

### Example User: Frontend Developer

**Onboarding Selections:**
- Primary Cluster: `frontend`
- Languages: `JavaScript`, `TypeScript`
- Goals: `learning-new-tech`, `building-project`
- Project Types: `tutorial`, `boilerplate`

**What They'll Get:**

1. **From Frontend Cluster:** ~29 repos
   - All repos with `cluster = 'frontend'`
   
2. **From JavaScript Language:** ~14 repos
   - Repos with `language = 'JavaScript'`
   
3. **From TypeScript Language:** ~14 repos
   - Repos with `language = 'TypeScript'`
   
4. **From Learning Goal:** ~46 repos
   - Repos matching tutorial/learning keywords
   
5. **From Tutorial Type:** ~38 repos
   - Repos with tutorial/guide keywords

**Total Unique Repos:** ~50-70 repos (after deduplication)

**Status:** ✅ **Sufficient for swipe feed** (but could be better)

---

## Problem: 233 is Low

**Why?**
- 12-month filter removed many repos
- Only fetching 50 repos per cluster (3 queries × 50 = 150, but many duplicates)
- Many repos filtered out by date

**Impact:**
- Some combinations might only get 20-30 repos
- Less variety
- Users might see same repos quickly

---

## Solution: Increase Repos

### Option 1: Increase Fetch Limits
Change in `ingest-repos-comprehensive.ts`:
- Clusters: 50 → 100 repos per query
- Languages: 30 → 50 repos per query
- Goals: 20 → 40 repos per query
- Project Types: 20 → 40 repos per query

**Expected:** 500-800 repos (after deduplication & filter)

### Option 2: Relax Date Filter
Change 12 months → 18 months:
```typescript
twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 18);
```

**Expected:** 400-600 repos

### Option 3: Remove Date Filter (Temporarily)
Comment out the filter to get maximum repos, then add filter back.

**Expected:** 1000-1500 repos

---

## Recommendation

**For MVP:** 233 repos is **OK** but **tight**
- Each user gets 30-70 repos
- Enough for initial testing
- Will need more for production

**For Production:** Aim for **500-1000 repos**
- Better variety
- More combinations covered
- Users won't run out quickly
