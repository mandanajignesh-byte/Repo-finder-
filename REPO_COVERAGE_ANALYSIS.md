# Repo Coverage Analysis

## Current Status: 233 Repos

### Coverage Breakdown

**Per Cluster:** ~29 repos (233 ÷ 8 clusters)
**Per Language:** ~14 repos (233 ÷ 16 languages)  
**Per Goal:** ~46 repos (233 ÷ 5 goals)
**Per Project Type:** ~38 repos (233 ÷ 6 types)

## Example Scenarios

### Scenario 1: Frontend Developer
**Onboarding:**
- Primary Cluster: `frontend`
- Languages: `JavaScript`, `TypeScript`
- Goals: `learning-new-tech`, `building-project`
- Project Types: `tutorial`, `boilerplate`

**Expected Repos:**
- Frontend cluster: ~29 repos
- JavaScript: ~14 repos
- TypeScript: ~14 repos
- Learning tutorials: ~46 repos
- Boilerplates: ~38 repos

**Result:** ~50-70 unique repos (after deduplication)
**Status:** ✅ **Sufficient** (enough for swipe feed)

---

### Scenario 2: Backend Developer
**Onboarding:**
- Primary Cluster: `backend`
- Languages: `Python`, `Java`
- Goals: `finding-solutions`
- Project Types: `library`, `framework`

**Expected Repos:**
- Backend cluster: ~29 repos
- Python: ~14 repos
- Java: ~14 repos
- Libraries: ~38 repos
- Frameworks: ~38 repos

**Result:** ~40-60 unique repos
**Status:** ✅ **Sufficient**

---

### Scenario 3: Mobile Developer
**Onboarding:**
- Primary Cluster: `mobile`
- Languages: `Dart`, `Swift`, `Kotlin`
- Goals: `building-project`
- Project Types: `boilerplate`, `full-app`

**Expected Repos:**
- Mobile cluster: ~29 repos
- Dart: ~14 repos
- Swift: ~14 repos
- Kotlin: ~14 repos
- Boilerplates: ~38 repos
- Full apps: ~38 repos

**Result:** ~50-80 unique repos
**Status:** ✅ **Sufficient**

---

### Scenario 4: Data Science
**Onboarding:**
- Primary Cluster: `data-science`
- Languages: `Python`, `R`
- Goals: `learning-new-tech`
- Project Types: `tutorial`, `library`

**Expected Repos:**
- Data science cluster: ~29 repos
- Python: ~14 repos
- R: ~14 repos
- Tutorials: ~46 repos
- Libraries: ~38 repos

**Result:** ~40-60 unique repos
**Status:** ✅ **Sufficient**

---

## Recommendation

### Current: 233 repos
**Status:** ✅ **Sufficient for MVP**
- Each user gets 40-80 repos based on preferences
- Enough for initial swipe feed
- Can add more later

### For Better Coverage: 500-1000 repos
- More variety per combination
- Better recommendations
- Less repetition

## How to Increase Coverage

1. **Increase repos per query:**
   - Change `perPage: 50` → `perPage: 100`
   - Fetch more repos per cluster/language

2. **More queries per category:**
   - Currently: 3 queries per cluster
   - Increase to: 5 queries per cluster

3. **Run ingestion multiple times:**
   - Different time ranges
   - Different search terms
