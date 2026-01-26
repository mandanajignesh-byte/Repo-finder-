# Tomorrow's Plan: Onboarding Redesign & Cluster Population

## 🎯 Goal
Fix the issue where users only see 2 repos by:
1. Redesigning onboarding to prioritize **PRIMARY CLUSTER** selection
2. Repopulating clusters based on the new onboarding structure
3. Ensuring 50+ repos for every user selection combination

---

## 📋 Step 1: Redesign Onboarding Form

### Current Problem
- Onboarding starts with **languages** (too granular)
- Clusters are organized by **domains** (frontend, backend, mobile, etc.)
- Mismatch causes poor tag matching → only 2 repos found

### New Structure (6 Steps)

#### **Step 1: Primary Interest (REQUIRED, Single Choice)**
**Question:** "What's your primary area of interest?"

**Options (matching cluster names):**
- 🌐 **Web Frontend** → `frontend` cluster
- ⚙️ **Web Backend** → `backend` cluster  
- 📱 **Mobile** → `mobile` cluster
- 💻 **Desktop** → `desktop` cluster
- 📊 **Data Science** → `data-science` cluster
- 🔧 **DevOps** → `devops` cluster
- 🎮 **Game Development** → `game-dev` cluster
- 🤖 **AI/ML** → `ai-ml` cluster

**Why First?** This directly maps to clusters, ensuring we know which cluster to prioritize.

---

#### **Step 2: Secondary Interests (OPTIONAL, Multiple Choice)**
**Question:** "What other areas interest you?"

**Same options as Step 1, but multiple selection allowed.**

**Why?** Allows cross-cluster recommendations (e.g., Frontend + Mobile = React Native repos).

---

#### **Step 3: Experience Level (REQUIRED, Single Choice)**
**Question:** "What's your experience level?"

**Options:**
- 🌱 Beginner
- 🚀 Intermediate  
- ⭐ Advanced

**Why?** Helps filter repos by complexity (beginner → tutorials, advanced → frameworks).

---

#### **Step 4: Goals/Use Cases (REQUIRED, Multiple Choice)**
**Question:** "What do you want to do with repositories?"

**Options:**
- 📚 Learning New Technology → adds tags: `tutorial`, `course`, `learn`, `guide`
- 🛠️ Building a Project → adds tags: `boilerplate`, `starter`, `template`
- 🤝 Contributing to Open Source → adds tags: `active`, `contributing`, `beginner-friendly`
- 💡 Finding Solutions → adds tags: `library`, `package`, `tool`
- 🔍 Exploring & Research → adds tags: `well-documented`, `popular`

**Why?** Maps directly to project types and helps tag repos correctly.

---

#### **Step 5: Tech Stack (OPTIONAL, Multiple Choice)**
**Question:** "What languages and frameworks do you use?"

**Languages:**
- JavaScript, TypeScript, Python, Java, Go, Rust, C++, C#, PHP, Ruby, Swift, Kotlin, Dart, R, Scala, Elixir

**Frameworks (grouped by cluster):**
- **Frontend:** React, Vue, Angular, Next.js, Nuxt, Svelte
- **Backend:** Express, FastAPI, Django, Flask, Spring, Laravel
- **Mobile:** Flutter, React Native, Ionic, Electron
- **AI/ML:** TensorFlow, PyTorch, Pandas, NumPy

**Why?** Adds granular tags for better matching within clusters.

---

#### **Step 6: Fine-tuning (OPTIONAL)**
**Same as current Step 6:**
- Repository Activity (active, stable, trending, any)
- Popularity Weight (low, medium, high)
- Documentation Importance (nice-to-have, important, critical)

---

## 📋 Step 2: Update Data Model

### Update `UserPreferences` Type
```typescript
export interface UserPreferences {
  // NEW: Primary cluster (required)
  primaryCluster: string; // 'frontend', 'backend', etc.
  
  // NEW: Secondary clusters (optional)
  secondaryClusters: string[];
  
  // Existing
  techStack: string[];
  interests: string[]; // Keep for backward compatibility
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  projectTypes: string[];
  activityPreference: 'active' | 'stable' | 'trending' | 'any';
  popularityWeight: 'low' | 'medium' | 'high';
  documentationImportance: 'nice-to-have' | 'important' | 'critical';
  onboardingCompleted: boolean;
}
```

### Update Supabase Schema
```sql
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS primary_cluster TEXT,
ADD COLUMN IF NOT EXISTS secondary_clusters TEXT[] DEFAULT '{}';
```

---

## 📋 Step 3: Update Recommendation Logic

### Priority Order:
1. **Primary Cluster** → Get best repos from `primaryCluster` cluster
2. **Secondary Clusters** → Supplement with repos from `secondaryClusters`
3. **Tech Stack Tags** → Filter by languages/frameworks within clusters
4. **Goals/Project Types** → Filter by tags (tutorial, boilerplate, etc.)
5. **Experience Level** → Filter by complexity (beginner → tutorials, advanced → frameworks)

### Update `repo-pool.service.ts`
```typescript
async buildPool(preferences: UserPreferences): Promise<Repository[]> {
  // 1. Get repos from PRIMARY cluster first
  if (preferences.primaryCluster) {
    const primaryRepos = await clusterService.getBestOfCluster(
      preferences.primaryCluster,
      100,
      allSeenRepoIds,
      userId
    );
    // Apply tech stack, goals, project type filters
    // ...
  }
  
  // 2. Supplement with secondary clusters
  if (preferences.secondaryClusters?.length > 0) {
    // ...
  }
  
  // 3. Fallback to tag-based search if needed
  // ...
}
```

---

## 📋 Step 4: Repopulate Clusters

### Update `curate-clusters.ts`

#### For Each Cluster:
1. **Base Queries** (cluster-specific):
   - `frontend` → "react tutorial", "vue course", "javascript frontend"
   - `backend` → "express api", "django backend", "python server"
   - etc.

2. **Language + Project Type Combinations:**
   - For each language × each project type:
     - `javascript tutorial`, `javascript boilerplate`, `javascript library`
     - `python tutorial`, `python boilerplate`, `python library`
     - etc.

3. **Framework + Project Type Combinations:**
   - For each relevant framework × each project type:
     - `react tutorial`, `react boilerplate`, `react starter`
     - `django tutorial`, `django boilerplate`, `django api`
     - etc.

4. **Goal-Based Queries:**
   - Learning → `tutorial`, `course`, `learn`, `guide`
   - Building → `boilerplate`, `starter`, `template`
   - Contributing → `beginner-friendly`, `good-first-issue`, `hacktoberfest`
   - Solutions → `library`, `package`, `tool`, `utility`

#### Target Repos Per Cluster:
- **Minimum:** 500 repos per cluster
- **Ideal:** 1000+ repos per cluster
- **Why?** Ensures 50+ repos for every user combination

#### Tag Strategy:
Each repo should have tags like:
```json
{
  "tags": [
    "javascript",           // Language
    "react",                // Framework
    "frontend",             // Cluster
    "tutorial",             // Project type
    "beginner-friendly",    // Experience level
    "learning"              // Goal
  ]
}
```

---

## 📋 Step 5: Testing Checklist

### Test Each Onboarding Combination:
- [ ] Primary: Frontend, Secondary: Mobile, Tech: React, Goal: Learning
- [ ] Primary: Backend, Secondary: DevOps, Tech: Python, Goal: Building
- [ ] Primary: AI/ML, Tech: TensorFlow, Goal: Learning, Experience: Beginner
- [ ] Primary: Data Science, Tech: Pandas, Goal: Finding Solutions
- [ ] Primary: Game Dev, Tech: C++, Goal: Building
- [ ] Primary: Desktop, Tech: Electron, Goal: Contributing

### Verify:
- [ ] Each combination returns 50+ repos
- [ ] No generic repos (facebook/react, etc.)
- [ ] Repos match selected cluster
- [ ] Repos match selected tech stack
- [ ] Repos match selected goals/project types
- [ ] User-specific shuffling works (different users see different repos)

---

## 📋 Step 6: Migration Strategy

### For Existing Users:
1. If `primaryCluster` is missing:
   - Infer from `interests` array (first item → primary)
   - If no interests, infer from `techStack`:
     - React/Vue/Angular → `frontend`
     - Express/Django/Flask → `backend`
     - Flutter/React Native → `mobile`
     - TensorFlow/PyTorch → `ai-ml`
     - etc.

2. Run migration script:
```typescript
// scripts/migrate-user-preferences.ts
// Migrates existing users to new structure
```

---

## 🎯 Success Criteria

✅ **Onboarding starts with cluster selection** (not languages)  
✅ **Each cluster has 500+ repos** (currently 300-500)  
✅ **Every user combination returns 50+ repos** (currently 2)  
✅ **No generic repos shown** (facebook/react, etc.)  
✅ **Tag matching works correctly** (repos match user selections)  
✅ **User-specific shuffling works** (different users see different repos)

---

## 📁 Files to Modify

1. **`src/app/components/OnboardingQuestionnaire.tsx`**
   - Reorder steps (cluster selection first)
   - Add `primaryCluster` and `secondaryClusters` fields

2. **`src/lib/types.ts`**
   - Update `UserPreferences` interface

3. **`src/services/repo-pool.service.ts`**
   - Update `buildPool` to prioritize primary cluster
   - Update tag building logic

4. **`src/services/cluster.service.ts`**
   - Update `detectPrimaryCluster` (if needed)

5. **`scripts/curate-clusters.ts`**
   - Expand search queries
   - Increase repos per cluster to 500+
   - Improve tag generation

6. **`supabase-schema-complete.sql`**
   - Add `primary_cluster` and `secondary_clusters` columns

7. **`src/services/supabase.service.ts`**
   - Update `saveUserPreferences` and `getUserPreferences`

---

## 🚀 Execution Order

1. **Morning:** Redesign onboarding form (Steps 1-6)
2. **Afternoon:** Update data model and services
3. **Evening:** Repopulate clusters with expanded queries
4. **Testing:** Verify all combinations return 50+ repos

---

## 💡 Key Insights

1. **Start with clusters, not languages** → Direct mapping to data structure
2. **Primary + Secondary clusters** → Better coverage for multi-interest users
3. **500+ repos per cluster** → Ensures enough repos for all combinations
4. **Comprehensive tagging** → Better matching (language + framework + project type + goal)
5. **Goal-based tags** → Maps user intent to repo types (learning → tutorials, building → boilerplates)

---

## ❓ Questions to Answer Tomorrow

1. Should we keep the current 6-step structure or simplify to 4-5 steps?
2. Should "Primary Cluster" be required or optional?
3. How many secondary clusters should we allow? (All 8? Or limit to 2-3?)
4. Should we show cluster descriptions in onboarding? (e.g., "Frontend: React, Vue, Angular, etc.")
5. Do we need a "Skip" option, or make onboarding mandatory?
