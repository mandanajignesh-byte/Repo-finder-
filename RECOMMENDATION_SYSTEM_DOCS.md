# 🎯 Discovery Page Recommendation System - Complete Backend Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Flow Diagram](#flow-diagram)
4. [Core Functions](#core-functions)
5. [Services Used](#services-used)
6. [User Journey](#user-journey)
7. [API Calls & Queries](#api-calls--queries)
8. [Deduplication Logic](#deduplication-logic)
9. [Loading States](#loading-states)
10. [Error Handling](#error-handling)

---

## 🎯 System Overview

The Discovery Page shows users a **Tinder-style swipeable card interface** with GitHub repositories. The backend fetches repos in **batches of 8-10** based on user preferences.

### Key Principles:
- ✅ **Batch Loading**: Load 8-10 repos at a time (no background processing)
- ✅ **Smart Fallback**: If personalized fails → try random cluster
- ✅ **Deduplication**: Never show same repo twice
- ✅ **Max 3 Retries**: Prevent infinite loops
- ✅ **Database Tracking**: Track all interactions in Supabase

---

## 🗄️ Database Schema

### **Main Tables:**

#### 1. `repos_master` (Primary repo data)
```sql
CREATE TABLE repos_master (
  id BIGINT PRIMARY KEY,
  name TEXT,
  full_name TEXT,
  description TEXT,
  stars INTEGER,
  forks INTEGER,
  language TEXT,
  tags TEXT[],              -- Array of tech tags
  topics TEXT[],            -- Array of GitHub topics
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_commit_date TIMESTAMP,
  open_issues INTEGER,
  license TEXT,
  url TEXT,
  owner_avatar TEXT
);
```

#### 2. `repo_clusters` (Cluster assignments)
```sql
CREATE TABLE repo_clusters (
  id SERIAL PRIMARY KEY,
  repo_id BIGINT REFERENCES repos_master(id),
  cluster_name TEXT,        -- e.g., 'ai-ml', 'frontend', 'mobile'
  cluster_label TEXT,
  created_at TIMESTAMP
);
```

#### 3. `cluster_metadata` (Active clusters)
```sql
CREATE TABLE cluster_metadata (
  id SERIAL PRIMARY KEY,
  cluster_name TEXT UNIQUE,
  cluster_label TEXT,
  description TEXT,
  is_active BOOLEAN,        -- Only active clusters are used
  repo_count INTEGER,
  created_at TIMESTAMP
);
```

#### 4. `user_preferences` (User onboarding data)
```sql
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE,
  primary_cluster TEXT,     -- Single cluster from onboarding
  tech_stack TEXT[],        -- Array of technologies
  goals TEXT[],             -- Array of goals
  onboarding_completed BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### 5. `user_interactions` (Tracking all actions)
```sql
CREATE TABLE user_interactions (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  repo_id BIGINT,
  action TEXT,              -- 'view', 'like', 'save', 'skip', 'share'
  timestamp TIMESTAMP,
  metadata JSONB            -- Additional context
);
```

#### 6. `repo_health` (Health scores)
```sql
CREATE TABLE repo_health (
  repo_id BIGINT PRIMARY KEY REFERENCES repos_master(id),
  health_score DECIMAL,     -- Overall health (0-100)
  activity_score DECIMAL,   -- Recent activity (0-100)
  freshness_score DECIMAL,  -- How recent (0-100)
  calculated_at TIMESTAMP
);
```

#### 7. `repo_badges` (Curated badges)
```sql
CREATE TABLE repo_badges (
  id SERIAL PRIMARY KEY,
  repo_id BIGINT REFERENCES repos_master(id),
  badge_type TEXT,          -- 'well-maintained', 'actively-updated', etc.
  badge_label TEXT,
  created_at TIMESTAMP
);
```

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER OPENS DISCOVERY PAGE                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Check: Has user completed onboarding?           │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
                   YES                 NO
                    │                   │
                    ↓                   ↓
    ┌───────────────────────┐   ┌──────────────────┐
    │ Load Personalized     │   │ Show Onboarding  │
    │ Repos                 │   │ (AppleOnboarding)│
    └───────────────────────┘   └──────────────────┘
                    ↓                   ↓
    ┌───────────────────────┐   ┌──────────────────┐
    │ Try Primary Cluster   │   │ User Completes   │
    │ (from preferences)    │   │ Onboarding       │
    └───────────────────────┘   └──────────────────┘
                    ↓                   ↓
    ┌───────────────────────┐   ┌──────────────────┐
    │ Found >= 3 repos?     │   │ Save Preferences │
    └───────────────────────┘   │ to Supabase      │
                    ↓             └──────────────────┘
            ┌───────┴───────┐           ↓
           YES             NO    ┌──────────────────┐
            │               │    │ Show Loading     │
            ↓               ↓    │ Screen (2s min)  │
    ┌───────────┐   ┌─────────────┐  └──────────────┘
    │ Return    │   │ Try Random  │         ↓
    │ Repos     │   │ Cluster     │  ┌──────────────────┐
    └───────────┘   └─────────────┘  │ Load Personalized│
            ↓               ↓         │ Repos            │
    ┌───────────────────────────┐    └──────────────────┘
    │ Deduplicate (remove       │
    │ already seen repos)       │
    └───────────────────────────┘
                    ↓
    ┌───────────────────────────┐
    │ Show 8-10 Repo Cards      │
    └───────────────────────────┘
                    ↓
    ┌───────────────────────────┐
    │ Track "view" interaction  │
    │ in user_interactions      │
    └───────────────────────────┘
                    ↓
    ┌───────────────────────────┐
    │ User Swipes Cards         │
    │ (Like/Skip/Save)          │
    └───────────────────────────┘
                    ↓
    ┌───────────────────────────┐
    │ Track interaction         │
    │ (like/skip/save)          │
    └───────────────────────────┘
                    ↓
    ┌───────────────────────────┐
    │ Cards < 3 remaining?      │
    └───────────────────────────┘
                    ↓
                   YES
                    ↓
    ┌───────────────────────────┐
    │ Show Loading Screen       │
    │ Load Next Batch (10 repos)│
    └───────────────────────────┘
                    ↓
            (Repeat Forever)
```

---

## 🔧 Core Functions

### **1. `loadPersonalizedRepos(append, retryCount)`**

**Purpose**: Load repos based on user's onboarding preferences

**Parameters**:
- `append` (boolean): If true, add to existing cards. If false, replace all cards.
- `retryCount` (number): Current retry attempt (max 3)

**Flow**:
```javascript
async function loadPersonalizedRepos(append = false, retryCount = 0) {
  // 1. Check retry limit
  if (retryCount >= 3) {
    return loadRandomRepos(append);  // Fallback to random
  }
  
  // 2. Show loading screen
  if (!append) setIsLoadingBatch(true);
  setIsLoadingMore(true);
  
  // 3. Get user ID and seen repos
  const userId = await supabaseService.getOrCreateUserId();
  const seenIds = await supabaseService.getAllSeenRepoIds(userId);
  const excludeIds = [...seenIds, ...currentCardIds];
  
  // 4. Determine batch size
  const batchSize = append ? 10 : 8;
  
  // 5. Try primary cluster (from user preferences)
  let repos = [];
  if (preferences.primaryCluster && repos.length < 3) {
    repos = await clusterService.getBestOfCluster(
      preferences.primaryCluster,
      batchSize * 3,
      excludeIds,
      userId
    );
  }
  
  // 6. Fallback: Try random cluster if not enough repos
  if (repos.length < 3) {
    const randomCluster = getRandomActiveCluster();
    repos = await clusterService.getBestOfCluster(
      randomCluster,
      batchSize * 2,
      excludeIds,
      userId
    );
  }
  
  // 7. Deduplicate
  repos = repos.filter(r => !currentCardIds.includes(r.id)).slice(0, batchSize);
  
  // 8. If 0 repos, retry
  if (repos.length === 0) {
    return loadPersonalizedRepos(append, retryCount + 1);
  }
  
  // 9. Update cards
  if (append) {
    setCards(prev => [...prev, ...repos]);
  } else {
    setCards(repos);
  }
  
  // 10. Track views (background)
  repos.forEach(repo => trackInteraction(repo, 'view'));
  
  // 11. Hide loading
  setIsLoadingMore(false);
  setIsLoadingBatch(false);
}
```

**Database Queries**:
1. `supabaseService.getOrCreateUserId()` → Gets/creates user ID
2. `supabaseService.getAllSeenRepoIds(userId)` → Gets all repo IDs user has seen
3. `clusterService.getBestOfCluster()` → Fetches repos from specific cluster

---

### **2. `loadRandomRepos(append)`**

**Purpose**: Load random repos from any active cluster (fallback/onboarding skip)

**Flow**:
```javascript
async function loadRandomRepos(append = false) {
  // 1. Show loading
  if (!append) setIsLoadingBatch(true);
  setIsLoadingMore(true);
  
  // 2. Get user ID and seen repos
  const userId = await supabaseService.getOrCreateUserId();
  const seenIds = await supabaseService.getAllSeenRepoIds(userId);
  
  // 3. Get random active cluster
  const clusters = await supabase
    .from('cluster_metadata')
    .select('cluster_name')
    .eq('is_active', true);
  
  const randomCluster = clusters[Math.floor(Math.random() * clusters.length)];
  
  // 4. Fetch repos
  const batchSize = append ? 10 : 8;
  const repos = await clusterService.getBestOfCluster(
    randomCluster.cluster_name,
    batchSize * 3,
    seenIds,
    userId
  );
  
  // 5. Deduplicate
  const filtered = repos
    .filter(r => !currentCardIds.includes(r.id))
    .slice(0, batchSize);
  
  // 6. Update cards
  if (append) {
    setCards(prev => [...prev, ...filtered]);
  } else {
    setCards(filtered);
  }
  
  // 7. Track views
  filtered.forEach(repo => trackInteraction(repo, 'view'));
  
  // 8. Hide loading
  setIsLoadingMore(false);
  setIsLoadingBatch(false);
}
```

---

### **3. `handleOnboardingComplete(data)`**

**Purpose**: Save user preferences and load first batch of repos

**Flow**:
```javascript
async function handleOnboardingComplete(data) {
  // 1. Show loading screen (minimum 2 seconds)
  setIsLoadingRecommendations(true);
  const startTime = Date.now();
  
  // 2. Save preferences to database
  await updatePreferences({
    primaryCluster: data.primaryCluster,
    techStack: data.techStack,
    goals: data.goals,
    onboardingCompleted: true
  });
  
  // 3. Load first batch of personalized repos
  await loadPersonalizedRepos(false, 0);
  
  // 4. Ensure minimum 2 second loading screen
  const elapsed = Date.now() - startTime;
  if (elapsed < 2000) {
    await new Promise(resolve => setTimeout(resolve, 2000 - elapsed));
  }
  
  // 5. Hide loading and onboarding
  setIsLoadingRecommendations(false);
  setShowOnboarding(false);
}
```

---

### **4. `handleSwipe(direction, repo)`**

**Purpose**: Handle user swipe actions (like/skip)

**Flow**:
```javascript
async function handleSwipe(direction, repo) {
  // 1. Determine action
  const action = direction === 'right' ? 'like' : 'skip';
  
  // 2. Track interaction in database
  await interactionService.trackInteraction(repo, action, {
    position: currentPosition,
    source: 'discover'
  });
  
  // 3. If liked, add to liked repos
  if (action === 'like') {
    await supabaseService.likeRepository(userId, repo);
    setLikedRepos(prev => [...prev, repo]);
  }
  
  // 4. Remove card from queue
  setCards(prev => prev.filter(c => c.id !== repo.id));
  
  // 5. Check if need to load more
  if (cards.length < 3) {
    await loadPersonalizedRepos(true, 0);  // Append mode
  }
}
```

---

## 🛠️ Services Used

### **1. `clusterService.getBestOfCluster()`**

**Location**: `src/services/cluster.service.ts`

**Purpose**: Fetch best repos from a specific cluster

**SQL Query**:
```sql
SELECT 
  rm.*,
  rh.health_score,
  rh.activity_score,
  rh.freshness_score,
  array_agg(rb.badge_type) as badges
FROM repos_master rm
INNER JOIN repo_clusters rc ON rm.id = rc.repo_id
LEFT JOIN repo_health rh ON rm.id = rh.repo_id
LEFT JOIN repo_badges rb ON rm.id = rb.repo_id
WHERE 
  rc.cluster_name = $1
  AND rm.id NOT IN ($2)  -- Exclude seen repos
  AND rm.stars >= 100    -- Minimum quality threshold
  AND rm.stars <= 30000  -- Maximum popularity threshold
GROUP BY rm.id, rh.health_score, rh.activity_score, rh.freshness_score
ORDER BY 
  rh.health_score DESC,
  rm.stars DESC,
  rm.updated_at DESC
LIMIT $3;
```

**Parameters**:
- `$1`: cluster_name (e.g., 'ai-ml')
- `$2`: Array of excluded repo IDs
- `$3`: Limit (batch size * multiplier)

---

### **2. `supabaseService.getAllSeenRepoIds(userId)`**

**Location**: `src/services/supabase.service.ts`

**Purpose**: Get all repo IDs the user has interacted with

**SQL Query**:
```sql
SELECT DISTINCT repo_id
FROM user_interactions
WHERE user_id = $1
  AND action IN ('view', 'like', 'skip', 'save');
```

**Returns**: Array of repo IDs `[123, 456, 789, ...]`

---

### **3. `interactionService.trackInteraction(repo, action, metadata)`**

**Location**: `src/services/interaction.service.ts`

**Purpose**: Track user interactions in database

**SQL Insert**:
```sql
INSERT INTO user_interactions (user_id, repo_id, action, timestamp, metadata)
VALUES ($1, $2, $3, NOW(), $4);
```

**Actions**:
- `view`: User saw the repo card
- `like`: User swiped right
- `skip`: User swiped left
- `save`: User bookmarked
- `share`: User shared the repo

---

### **4. `supabaseService.getOrCreateUserId()`**

**Purpose**: Get user ID from Supabase auth or create anonymous ID

**Flow**:
```javascript
async function getOrCreateUserId() {
  // 1. Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    return user.id;  // Return authenticated user ID
  }
  
  // 2. Check localStorage for anonymous ID
  let anonymousId = localStorage.getItem('anonymous_user_id');
  
  if (!anonymousId) {
    // 3. Generate new anonymous ID
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('anonymous_user_id', anonymousId);
  }
  
  return anonymousId;
}
```

---

## 🔍 Deduplication Logic

### **Why Deduplication?**
Prevent showing the same repo twice to the user.

### **How It Works**:

```javascript
// 1. Get all repo IDs user has seen (from database)
const seenIds = await supabaseService.getAllSeenRepoIds(userId);
// Example: [123, 456, 789, 1011, ...]

// 2. Get currently displayed card IDs
const currentCardIds = cards.map(c => c.id);
// Example: [1213, 1415, 1617]

// 3. Combine both
const excludeIds = [...seenIds, ...currentCardIds];
// Example: [123, 456, 789, 1011, 1213, 1415, 1617]

// 4. Pass to database query
const repos = await clusterService.getBestOfCluster(
  clusterName,
  limit,
  excludeIds,  // ← Exclude these IDs
  userId
);

// 5. Additional client-side filter (safety net)
const filtered = repos.filter(repo => !excludeIds.includes(repo.id));
```

### **Database Query with Exclusion**:
```sql
WHERE rm.id NOT IN (123, 456, 789, 1011, 1213, 1415, 1617)
```

---

## ⏳ Loading States

### **Three Loading States**:

1. **`isLoadingRecommendations`**
   - **When**: After onboarding completion
   - **Shows**: Full-screen loading with Apple-style animation
   - **Duration**: Minimum 2 seconds

2. **`isLoadingBatch`**
   - **When**: Loading next batch of repos (when cards < 3)
   - **Shows**: Full-screen loading with rotating messages
   - **Duration**: Until repos are fetched and set

3. **`isLoadingMore`**
   - **When**: Background state during any fetch
   - **Shows**: Nothing (internal state)
   - **Purpose**: Prevent duplicate fetches

### **Loading Screen Component**:
```jsx
{isLoadingBatch && <RepoLoadingScreen />}
```

**RepoLoadingScreen** shows:
- Animated circles
- Rotating messages ("Finding perfect repos...", "Analyzing stars...", etc.)
- Progress bar
- Apple-style design

---

## ❌ Error Handling

### **1. Max Retries (Prevent Infinite Loops)**
```javascript
const MAX_RETRIES = 3;
if (retryCount >= MAX_RETRIES) {
  console.warn('Max retries reached, using random repos');
  return loadRandomRepos(append);
}
```

### **2. No Repos Found**
```javascript
if (repos.length === 0) {
  // Retry with incremented count
  return loadPersonalizedRepos(append, retryCount + 1);
}
```

### **3. Database Errors**
```javascript
try {
  // ... fetch repos
} catch (error) {
  console.error('Error loading repos:', error);
  setIsLoadingMore(false);
  setIsLoadingBatch(false);
  
  // Fallback to random repos
  if (retryCount < 3) {
    return loadPersonalizedRepos(append, retryCount + 1);
  } else {
    return loadRandomRepos(append);
  }
}
```

---

## 👤 User Journey

### **Scenario 1: New User (First Time)**

```
1. User opens app
   ↓
2. No preferences found → Show onboarding
   ↓
3. User selects:
   - Primary Interest: "AI & Machine Learning"
   - Tech Stack: ["python", "tensorflow", "pytorch"]
   - Goals: ["learning", "building"]
   ↓
4. Save to database:
   INSERT INTO user_preferences (user_id, primary_cluster, tech_stack, goals, onboarding_completed)
   VALUES ('anon_123', 'ai-ml', ARRAY['python','tensorflow','pytorch'], ARRAY['learning','building'], true);
   ↓
5. Show loading screen (2 seconds minimum)
   ↓
6. Load personalized repos:
   - Try "ai-ml" cluster
   - Filter by tech stack (python/tensorflow/pytorch)
   - Get 8 repos
   ↓
7. Show repo cards
   ↓
8. Track "view" for each repo:
   INSERT INTO user_interactions (user_id, repo_id, action, timestamp)
   VALUES ('anon_123', 456, 'view', NOW());
   ↓
9. User swipes right (like) on repo #456
   ↓
10. Track "like":
    INSERT INTO user_interactions (user_id, repo_id, action, timestamp)
    VALUES ('anon_123', 456, 'like', NOW());
    ↓
11. Add to liked_repos table:
    INSERT INTO liked_repos (user_id, repo_id)
    VALUES ('anon_123', 456);
    ↓
12. Remove card from queue
    ↓
13. Cards remaining: 7
    ↓
14. User continues swiping...
    ↓
15. Cards remaining: 2 (< 3 threshold)
    ↓
16. Show loading screen
    ↓
17. Load next batch (10 repos, append mode)
    ↓
18. Cards remaining: 12
    ↓
19. (Repeat forever)
```

---

### **Scenario 2: Returning User**

```
1. User opens app
   ↓
2. Check preferences:
   SELECT * FROM user_preferences WHERE user_id = 'anon_123';
   Found: { primaryCluster: 'ai-ml', techStack: [...], onboardingCompleted: true }
   ↓
3. Skip onboarding → Load personalized repos immediately
   ↓
4. Get seen repos:
   SELECT DISTINCT repo_id FROM user_interactions WHERE user_id = 'anon_123';
   Returns: [456, 789, 1011, ...] (50 repos already seen)
   ↓
5. Load personalized repos (excluding seen ones)
   ↓
6. Show fresh 8 repos
   ↓
7. Continue as normal...
```

---

### **Scenario 3: User Skips Onboarding**

```
1. User opens app
   ↓
2. Show onboarding
   ↓
3. User clicks "Skip"
   ↓
4. Save onboarding_completed = true (but no preferences)
   INSERT INTO user_preferences (user_id, onboarding_completed)
   VALUES ('anon_123', true);
   ↓
5. Load random repos (no personalization)
   ↓
6. Get random cluster:
   SELECT cluster_name FROM cluster_metadata WHERE is_active = true ORDER BY RANDOM() LIMIT 1;
   Returns: 'frontend'
   ↓
7. Load 8 repos from 'frontend' cluster
   ↓
8. Show cards
   ↓
9. Continue as normal...
```

---

## 🔗 API Calls Summary

### **On Page Load**:
1. `supabase.auth.getUser()` - Check authentication
2. `supabaseService.getOrCreateUserId()` - Get/create user ID
3. `supabase.from('user_preferences').select()` - Get preferences
4. If onboarding completed:
   - `supabaseService.getAllSeenRepoIds(userId)` - Get seen repos
   - `clusterService.getBestOfCluster()` - Fetch repos
   - `interactionService.trackInteraction()` - Track views

### **On Onboarding Complete**:
1. `supabase.from('user_preferences').upsert()` - Save preferences
2. `supabaseService.getAllSeenRepoIds(userId)` - Get seen repos
3. `clusterService.getBestOfCluster()` - Fetch repos
4. `interactionService.trackInteraction()` - Track views

### **On Swipe**:
1. `interactionService.trackInteraction()` - Track action
2. If like: `supabase.from('liked_repos').insert()` - Save like
3. If save: `supabase.from('saved_repos').insert()` - Save bookmark
4. If cards < 3: Load next batch (same as page load)

### **On Load More**:
1. `supabaseService.getAllSeenRepoIds(userId)` - Get seen repos
2. `clusterService.getBestOfCluster()` - Fetch repos
3. `interactionService.trackInteraction()` - Track views

---

## 📊 Performance Optimizations

### **1. Parallel Queries**
```javascript
// Fetch user ID and seen repos in parallel
const [userId, seenIds] = await Promise.all([
  supabaseService.getOrCreateUserId(),
  supabaseService.getAllSeenRepoIds(userId)
]);
```

### **2. Batch Size Multiplier**
```javascript
// Fetch 3x repos to account for deduplication
const repos = await clusterService.getBestOfCluster(
  clusterName,
  batchSize * 3,  // Fetch 24-30 repos
  excludeIds,
  userId
);

// Then slice to exact batch size
const filtered = repos.slice(0, batchSize);  // Return 8-10 repos
```

### **3. Database Indexes**
```sql
-- Speed up cluster queries
CREATE INDEX idx_repo_clusters_cluster_name ON repo_clusters(cluster_name);
CREATE INDEX idx_repo_clusters_repo_id ON repo_clusters(repo_id);

-- Speed up interaction queries
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_repo_id ON user_interactions(repo_id);
CREATE INDEX idx_user_interactions_action ON user_interactions(action);

-- Speed up repo queries
CREATE INDEX idx_repos_master_stars ON repos_master(stars);
CREATE INDEX idx_repos_master_updated_at ON repos_master(updated_at);
```

### **4. Background Tracking**
```javascript
// Track views in background (non-blocking)
repos.forEach(repo => {
  interactionService.trackInteraction(repo, 'view').catch(() => {});
});
```

---

## 🎨 UI States

### **State Management**:
```javascript
const [cards, setCards] = useState<Repository[]>([]);           // Current repo cards
const [savedRepos, setSavedRepos] = useState<Repository[]>([]); // Bookmarked repos
const [likedRepos, setLikedRepos] = useState<Repository[]>([]); // Liked repos
const [showOnboarding, setShowOnboarding] = useState(false);    // Show onboarding?
const [isLoadingMore, setIsLoadingMore] = useState(false);      // Loading state
const [isLoadingBatch, setIsLoadingBatch] = useState(false);    // Batch loading
const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false); // Post-onboarding
```

### **Conditional Rendering**:
```jsx
{showOnboarding && <AppleOnboarding onComplete={handleOnboardingComplete} />}
{isLoadingRecommendations && <RepoLoadingScreen />}
{isLoadingBatch && <RepoLoadingScreen />}
{cards.length > 0 && <RepoCard repo={cards[0]} />}
{cards.length === 0 && !isLoadingBatch && <EmptyState />}
```

---

## 🔐 Security & Privacy

### **1. Row Level Security (RLS)**
All tables have RLS policies:
```sql
-- Allow anonymous reads
CREATE POLICY "Allow anonymous read" ON repos_master
  FOR SELECT USING (true);

-- User can only see their own data
CREATE POLICY "Users can view own interactions" ON user_interactions
  FOR SELECT USING (user_id = auth.uid() OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');
```

### **2. Anonymous Users**
- Generate unique anonymous ID: `anon_1234567890_abc123`
- Store in localStorage
- Track interactions without authentication
- Can upgrade to authenticated user later

### **3. Data Privacy**
- No personal data collected in onboarding
- Only track: preferences, interactions (view/like/skip)
- No IP addresses, no tracking cookies
- User can clear data anytime

---

## 📈 Analytics & Tracking

### **What We Track**:
1. **Views**: Every repo shown to user
2. **Likes**: Right swipes
3. **Skips**: Left swipes
4. **Saves**: Bookmarks
5. **Shares**: Share button clicks
6. **Onboarding**: Completion rate, selected preferences

### **Why We Track**:
- Improve recommendations
- Understand user preferences
- Prevent duplicate recommendations
- Measure engagement

### **Tracking Code**:
```javascript
await interactionService.trackInteraction(repo, 'view', {
  position: 0,              // Card position in queue
  source: 'discover',       // Source page
  timestamp: new Date(),    // When it happened
  metadata: {               // Additional context
    cluster: repo.cluster,
    stars: repo.stars,
    language: repo.language
  }
});
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: "0 repos found"**
**Cause**: Too aggressive deduplication or no repos in cluster
**Solution**: 
- Fallback to random cluster
- Max 3 retries
- Fetch 3x repos to account for deduplication

### **Issue 2: "Infinite loop"**
**Cause**: Retry logic without limit
**Solution**:
- Max 3 retries
- After 3 retries, fallback to random repos
- Never retry more than 3 times

### **Issue 3: "Loading screen disappears too early"**
**Cause**: Loading state set to false before cards are set
**Solution**:
- Set loading to false ONLY after `setCards()` completes
- Ensure minimum 2 second loading screen for onboarding

### **Issue 4: "Same repos appearing again"**
**Cause**: Not tracking views properly
**Solution**:
- Track ALL views in `user_interactions` table
- Fetch seen IDs before every query
- Exclude seen IDs in database query

---

## 🚀 Future Improvements

1. **Collaborative Filtering**: Recommend repos liked by similar users
2. **Content-Based Filtering**: Use repo descriptions/topics for better matching
3. **Trending Repos**: Show trending repos in user's interests
4. **Smart Refresh**: Refresh recommendations after 7 days
5. **A/B Testing**: Test different recommendation algorithms
6. **Machine Learning**: Train ML model on user interactions

---

## 📝 Summary

### **Key Takeaways**:
✅ **Simple & Clean**: No over-engineering, straightforward flow
✅ **Batch Loading**: 8-10 repos at a time, no background processing
✅ **Smart Fallback**: Primary cluster → Random cluster → Max 3 retries
✅ **Deduplication**: Database + client-side filtering
✅ **User Tracking**: All interactions tracked in Supabase
✅ **Error Handling**: Max retries, fallbacks, graceful degradation
✅ **Performance**: Parallel queries, indexes, background tracking

### **Tech Stack**:
- **Frontend**: React, TypeScript, Tailwind CSS, Motion/React
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: React Hooks (useState, useCallback, useEffect)
- **Routing**: React Router
- **Deployment**: Vercel

---

## 📞 Need Help?

This document explains the complete backend flow. Use it to:
- Understand how recommendations work
- Debug issues
- Make improvements
- Explain to other developers

**Last Updated**: March 8, 2026
**Version**: 2.0 (Simplified)
