# 🏗️ System Architecture - Discovery Page

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICE                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Frontend                           │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │ Discovery    │  │ Onboarding   │  │ Profile      │    │ │
│  │  │ Screen       │  │ Screen       │  │ Screen       │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │         ↓                  ↓                  ↓            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │           State Management (React Hooks)            │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │         ↓                  ↓                  ↓            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │                Service Layer                        │  │ │
│  │  │  • clusterService                                   │  │ │
│  │  │  • supabaseService                                  │  │ │
│  │  │  • interactionService                               │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  PostgreSQL Database                        │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │ repos_master │  │ repo_clusters│  │ user_prefs   │    │ │
│  │  │ (22k repos)  │  │ (cluster map)│  │ (onboarding) │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │ repo_health  │  │ repo_badges  │  │ user_inter-  │    │ │
│  │  │ (scores)     │  │ (curated)    │  │ actions      │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │                                                             │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │              Row Level Security (RLS)               │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Supabase Auth                             │ │
│  │  • Anonymous Users                                          │ │
│  │  • GitHub OAuth (optional)                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Loading Recommendations

```
┌─────────────┐
│   USER      │
│  Opens App  │
└─────────────┘
      ↓
┌─────────────────────────────────────────┐
│  DiscoveryScreen.tsx                    │
│  useEffect(() => {                      │
│    checkOnboardingStatus();             │
│  }, []);                                │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  supabaseService.getOrCreateUserId()    │
│  Returns: "anon_123456_abc"             │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  Query: user_preferences table          │
│  SELECT * FROM user_preferences         │
│  WHERE user_id = 'anon_123456_abc'      │
└─────────────────────────────────────────┘
      ↓
      ├─────────────────┬─────────────────┐
      ↓                 ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ onboarding   │  │ onboarding   │  │ No record    │
│ Completed:   │  │ Completed:   │  │ found        │
│ TRUE         │  │ FALSE        │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
      ↓                 ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Load         │  │ Show         │  │ Show         │
│ Personalized │  │ Onboarding   │  │ Onboarding   │
│ Repos        │  │ Screen       │  │ Screen       │
└──────────────┘  └──────────────┘  └──────────────┘
      ↓
┌─────────────────────────────────────────┐
│  loadPersonalizedRepos(false, 0)        │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  setIsLoadingBatch(true)                │
│  Show loading screen                    │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  supabaseService.getAllSeenRepoIds()    │
│  Query: SELECT DISTINCT repo_id         │
│  FROM user_interactions                 │
│  WHERE user_id = 'anon_123456_abc'      │
│  Returns: [123, 456, 789, ...]          │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  clusterService.getBestOfCluster()      │
│  Query: SELECT rm.*, rh.*, rb.*         │
│  FROM repos_master rm                   │
│  JOIN repo_clusters rc ON rm.id = ...  │
│  WHERE rc.cluster_name = 'ai-ml'        │
│    AND rm.id NOT IN (123, 456, 789)     │
│  ORDER BY rh.health_score DESC          │
│  LIMIT 24                               │
│  Returns: [repo1, repo2, ..., repo24]   │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  Deduplicate & Slice                    │
│  repos = repos.filter(...)              │
│         .slice(0, 8)                    │
│  Returns: [repo1, repo2, ..., repo8]    │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  setCards(repos)                        │
│  Update UI with 8 repo cards            │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  Track Views (Background)               │
│  repos.forEach(repo => {                │
│    interactionService.trackInteraction( │
│      repo, 'view', {...}                │
│    )                                    │
│  })                                     │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  setIsLoadingBatch(false)               │
│  Hide loading screen                    │
└─────────────────────────────────────────┘
      ↓
┌─────────────┐
│   USER      │
│  Sees Cards │
└─────────────┘
```

---

## 🎯 Component Hierarchy

```
App.tsx
│
├── DiscoveryScreen.tsx (Main container)
│   ├── State Management
│   │   ├── cards: Repository[]
│   │   ├── savedRepos: Repository[]
│   │   ├── likedRepos: Repository[]
│   │   ├── showOnboarding: boolean
│   │   ├── isLoadingBatch: boolean
│   │   └── isLoadingRecommendations: boolean
│   │
│   ├── Conditional Rendering
│   │   ├── {showOnboarding && <AppleOnboarding />}
│   │   ├── {isLoadingRecommendations && <RepoLoadingScreen />}
│   │   ├── {isLoadingBatch && <RepoLoadingScreen />}
│   │   └── {cards.length > 0 && <RepoCard />}
│   │
│   ├── Core Functions
│   │   ├── loadPersonalizedRepos()
│   │   ├── loadRandomRepos()
│   │   ├── handleOnboardingComplete()
│   │   ├── handleSwipe()
│   │   └── handleSave()
│   │
│   └── Child Components
│       ├── AppleOnboarding.tsx
│       │   ├── Step 1: Primary Interest
│       │   ├── Step 2: Tech Stack
│       │   └── Step 3: Goals
│       │
│       ├── RepoLoadingScreen.tsx
│       │   ├── Animated Circles
│       │   ├── Rotating Messages
│       │   └── Progress Bar
│       │
│       ├── RepoCard.tsx
│       │   ├── Repo Info (name, description, stars)
│       │   ├── Health Scores (health, activity, freshness)
│       │   ├── Badges (well-maintained, etc.)
│       │   └── Swipe Handlers
│       │
│       └── SignatureCard.tsx
│           └── Glassmorphism wrapper
│
├── ProfileScreen.tsx
│   ├── Edit Preferences
│   ├── View Starred Repos
│   └── GitHub Integration
│
└── Navigation
    ├── Home (Discovery)
    ├── Saved (Bookmarks)
    ├── Liked (Right swipes)
    └── Profile
```

---

## 🗄️ Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         repos_master                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ id (PK)                                                     │ │
│  │ name                                                        │ │
│  │ full_name                                                   │ │
│  │ description                                                 │ │
│  │ stars                                                       │ │
│  │ forks                                                       │ │
│  │ language                                                    │ │
│  │ tags[]                                                      │ │
│  │ topics[]                                                    │ │
│  │ created_at                                                  │ │
│  │ updated_at                                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         ↓ 1:N                    ↓ 1:1                  ↓ 1:N
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ repo_clusters    │   │ repo_health      │   │ repo_badges      │
│ ┌──────────────┐ │   │ ┌──────────────┐ │   │ ┌──────────────┐ │
│ │ id (PK)      │ │   │ │ repo_id (PK) │ │   │ │ id (PK)      │ │
│ │ repo_id (FK) │ │   │ │ health_score │ │   │ │ repo_id (FK) │ │
│ │ cluster_name │ │   │ │ activity_sc. │ │   │ │ badge_type   │ │
│ │ cluster_label│ │   │ │ freshness_sc.│ │   │ │ badge_label  │ │
│ └──────────────┘ │   │ └──────────────┘ │   │ └──────────────┘ │
└──────────────────┘   └──────────────────┘   └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      cluster_metadata                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ id (PK)                                                     │ │
│  │ cluster_name (UNIQUE)                                       │ │
│  │ cluster_label                                               │ │
│  │ description                                                 │ │
│  │ is_active                                                   │ │
│  │ repo_count                                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      user_preferences                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ id (PK)                                                     │ │
│  │ user_id (UNIQUE)                                            │ │
│  │ primary_cluster                                             │ │
│  │ tech_stack[]                                                │ │
│  │ goals[]                                                     │ │
│  │ onboarding_completed                                        │ │
│  │ created_at                                                  │ │
│  │ updated_at                                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         ↓ 1:N
┌─────────────────────────────────────────────────────────────────┐
│                      user_interactions                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ id (PK)                                                     │ │
│  │ user_id                                                     │ │
│  │ repo_id                                                     │ │
│  │ action (view, like, skip, save, share)                     │ │
│  │ timestamp                                                   │ │
│  │ metadata (JSONB)                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        saved_repos                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ id (PK)                                                     │ │
│  │ user_id                                                     │ │
│  │ repo_id                                                     │ │
│  │ created_at                                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        liked_repos                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ id (PK)                                                     │ │
│  │ user_id                                                     │ │
│  │ repo_id                                                     │ │
│  │ created_at                                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  clusterService.ts                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  getBestOfCluster(clusterName, limit, excludeIds, userId)  │  │
│  │  • Query repos_master + repo_clusters                      │  │
│  │  • Join with repo_health for scores                        │  │
│  │  • Join with repo_badges for badges                        │  │
│  │  • Filter by cluster_name                                  │  │
│  │  • Exclude seen repo IDs                                   │  │
│  │  • Order by health_score DESC                              │  │
│  │  • Return Repository[]                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  supabaseService.ts                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  getOrCreateUserId()                                       │  │
│  │  • Check Supabase auth                                     │  │
│  │  • If not authenticated, use anonymous ID                  │  │
│  │  • Return user_id                                          │  │
│  │                                                            │  │
│  │  getAllSeenRepoIds(userId)                                 │  │
│  │  • Query user_interactions                                 │  │
│  │  • Get DISTINCT repo_id                                    │  │
│  │  • Return number[]                                         │  │
│  │                                                            │  │
│  │  getSavedRepositories(userId)                              │  │
│  │  • Query saved_repos                                       │  │
│  │  • Join with repos_master                                  │  │
│  │  • Return Repository[]                                     │  │
│  │                                                            │  │
│  │  getLikedRepositories(userId)                              │  │
│  │  • Query liked_repos                                       │  │
│  │  • Join with repos_master                                  │  │
│  │  • Return Repository[]                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  interactionService.ts                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  trackInteraction(repo, action, metadata)                  │  │
│  │  • Get user_id                                             │  │
│  │  • INSERT INTO user_interactions                           │  │
│  │  • Store in session memory                                 │  │
│  │  • Return void                                             │  │
│  │                                                            │  │
│  │  getSessionInteractions()                                  │  │
│  │  • Return in-memory session history                        │  │
│  │  • Used for real-time filtering                            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎨 State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Initial State (Page Load)                     │
└─────────────────────────────────────────────────────────────────┘
  cards: []
  showOnboarding: false
  isLoadingBatch: false
  isLoadingRecommendations: false
  isLoadingMore: false
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Check User Preferences                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              Completed            Not Completed
                    │                   │
                    ↓                   ↓
┌──────────────────────────┐   ┌──────────────────────────┐
│  Load Recommendations    │   │  Show Onboarding         │
└──────────────────────────┘   └──────────────────────────┘
  cards: []                       cards: []
  showOnboarding: false           showOnboarding: true
  isLoadingBatch: true            isLoadingBatch: false
  isLoadingRecommendations: false isLoadingRecommendations: false
  isLoadingMore: true             isLoadingMore: false
                    ↓                   ↓
┌──────────────────────────┐   ┌──────────────────────────┐
│  Fetch Repos             │   │  User Completes          │
└──────────────────────────┘   └──────────────────────────┘
                    ↓                   ↓
┌──────────────────────────┐   ┌──────────────────────────┐
│  Set Cards               │   │  Save Preferences        │
└──────────────────────────┘   └──────────────────────────┘
  cards: [repo1, ..., repo8]    cards: []
  showOnboarding: false          showOnboarding: true
  isLoadingBatch: false          isLoadingBatch: false
  isLoadingRecommendations: false isLoadingRecommendations: true
  isLoadingMore: false           isLoadingMore: false
                    ↓                   ↓
┌──────────────────────────┐   ┌──────────────────────────┐
│  Show Cards              │   │  Load Recommendations    │
└──────────────────────────┘   └──────────────────────────┘
                    ↓                   ↓
┌──────────────────────────┐   ┌──────────────────────────┐
│  User Swipes             │   │  Set Cards               │
└──────────────────────────┘   └──────────────────────────┘
  cards: [repo2, ..., repo8]    cards: [repo1, ..., repo8]
  (removed repo1)                showOnboarding: false
                                 isLoadingBatch: false
                                 isLoadingRecommendations: false
                    ↓                   ↓
┌──────────────────────────┐   ┌──────────────────────────┐
│  Cards < 3?              │   │  Show Cards              │
└──────────────────────────┘   └──────────────────────────┘
                    ↓
                   YES
                    ↓
┌──────────────────────────┐
│  Load More (Append)      │
└──────────────────────────┘
  cards: [repo2, repo3]
  showOnboarding: false
  isLoadingBatch: true
  isLoadingRecommendations: false
  isLoadingMore: true
                    ↓
┌──────────────────────────┐
│  Fetch 10 More Repos     │
└──────────────────────────┘
                    ↓
┌──────────────────────────┐
│  Append to Cards         │
└──────────────────────────┘
  cards: [repo2, repo3, repo9, ..., repo18]
  showOnboarding: false
  isLoadingBatch: false
  isLoadingRecommendations: false
  isLoadingMore: false
                    ↓
            (Repeat Forever)
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
│  • Source code                                                   │
│  • Automatic deploys on push to master                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel Platform                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Build Process                                             │ │
│  │  • npm install                                             │ │
│  │  • npm run build (Vite)                                    │ │
│  │  • Generate static files                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Environment Variables                                     │ │
│  │  • VITE_SUPABASE_URL                                       │ │
│  │  • VITE_SUPABASE_ANON_KEY                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  CDN Distribution                                          │ │
│  │  • Global edge network                                     │ │
│  │  • Automatic HTTPS                                         │ │
│  │  • Custom domain support                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  • React app loads                                               │
│  • Connects to Supabase                                          │
│  • Fetches recommendations                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  • No sensitive data stored                                      │
│  • Anonymous user IDs in localStorage                            │
│  • HTTPS only                                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase (Backend)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Row Level Security (RLS)                                  │ │
│  │  • Anonymous users can read repos_master                   │ │
│  │  • Users can only see their own interactions               │ │
│  │  • Users can only modify their own preferences             │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Authentication                                            │ │
│  │  • Anonymous users (default)                               │ │
│  │  • GitHub OAuth (optional)                                 │ │
│  │  • JWT tokens                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  API Security                                              │ │
│  │  • Rate limiting                                           │ │
│  │  • API key validation                                      │ │
│  │  • CORS configuration                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Optimizations

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Optimizations                        │
│  • React.memo() for expensive components                         │
│  • useCallback() for stable function references                  │
│  • useMemo() for computed values                                 │
│  • Lazy loading for routes                                       │
│  • Code splitting (Vite)                                         │
│  • Image optimization (WebP)                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Backend Optimizations                         │
│  • Database indexes on frequently queried columns                │
│  • Parallel queries (Promise.all)                                │
│  • Batch size multiplier (fetch 3x, return 1x)                   │
│  • Background tracking (non-blocking)                            │
│  • Connection pooling                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Caching Strategy                              │
│  • Browser cache for static assets                               │
│  • Service worker for PWA                                        │
│  • localStorage for user preferences                             │
│  • In-memory session cache for interactions                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Design Decisions

### **1. Why Batch Loading?**
- **User Experience**: Smooth, predictable loading
- **Performance**: Reduce database load
- **Control**: Prevent overwhelming users with too many repos

### **2. Why Max 3 Retries?**
- **Prevent Infinite Loops**: Safety mechanism
- **Fallback to Random**: Always show something
- **User Experience**: Don't make users wait forever

### **3. Why Database Tracking?**
- **Persistent**: Survives page refreshes
- **Cross-Device**: Works on multiple devices
- **Analytics**: Understand user behavior
- **Deduplication**: Never show same repo twice

### **4. Why Simplified Services?**
- **Maintainability**: Easy to understand and debug
- **Performance**: Less overhead, faster execution
- **Reliability**: Fewer moving parts = fewer bugs

---

## 📝 Summary

This architecture is designed for:
✅ **Simplicity**: Easy to understand and maintain
✅ **Performance**: Fast loading, efficient queries
✅ **Scalability**: Can handle millions of repos and users
✅ **Reliability**: Fallbacks, error handling, retry logic
✅ **User Experience**: Smooth loading, no duplicates, personalized

**Last Updated**: March 8, 2026
**Version**: 2.0 (Simplified)
