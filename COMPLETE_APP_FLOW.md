# Complete App Flow Documentation - Repoverse

## 📱 Overview

Repoverse is a Flutter-based GitHub repository discovery app with subscription-based premium features. This document outlines the complete flow from app launch to user interaction, including onboarding, paywall integration, recommendation computation, and data flow.

---

## 🚀 1. App Initialization Flow

### 1.1 App Startup (`main.dart`)

```
App Launch
  ↓
WidgetsFlutterBinding.ensureInitialized()
  ↓
Load .env file (Supabase credentials)
  ↓
Initialize Supabase Client
  ↓
Initialize RevenueCat SDK (async, non-blocking)
  ↓
Run App → SplashScreen
```

**Key Components:**
- **Supabase**: Database and backend services
- **RevenueCat**: Subscription management (initialized asynchronously)
- **State Management**: 
  - Riverpod (for trending repos)
  - Provider (for services: AppSupabaseService, RepoService, RevenueCatService)

**Files:**
- `lib/main.dart`
- `lib/services/revenuecat_service.dart` (initialization)

---

## 🎬 2. Splash Screen Flow (`splash_screen.dart`)

### 2.1 Initial Check Flow

```
SplashScreen displays (2 seconds)
  ↓
_checkOnboardingAndSubscription()
  ↓
Get User ID (create if new)
  ↓
Check Onboarding Status:
  ├─ Local Storage (SharedPreferences: 'onboarding_completed')
  └─ Database (app_user_preferences.onboarding_completed)
  ↓
Decision Tree:
  ├─ Onboarding NOT completed
  │   └─ Navigate → OnboardingScreen
  │
  └─ Onboarding completed
      ↓
      Wait for RevenueCat initialization (max 2.5 seconds)
      ↓
      Check Subscription Status:
      ├─ NOT subscribed → Navigate → PaywallScreen (Hard Paywall)
      └─ Subscribed → Navigate → MainTabScreen
```

**Key Logic:**
- **Onboarding Check**: Checks both local storage (fast) and database (accurate)
- **Subscription Check**: Waits for RevenueCat to initialize, then checks `RevenueCatService.isProUser`
- **Hard Paywall**: If onboarding complete but not subscribed, user is blocked until subscription

**Files:**
- `lib/screens/splash_screen.dart`

---

## 📝 3. Onboarding Flow (`onboarding_screen.dart`)

### 3.1 Onboarding Steps

```
OnboardingScreen
  ↓
Step 1: Welcome Screen
  ↓
Step 2: Interests Selection (Primary Cluster)
  ↓
Step 3: Tech Stack Selection (Languages)
  ↓
Step 4: Skill Level Selection
  ↓
Step 5: Goals Selection
  ↓
Step 6: Repo Size Preference
  ↓
Step 7: Current Project (Optional)
  ↓
Complete Onboarding:
  ├─ Save preferences to database
  │   ├─ app_user_preferences table
  │   └─ user_onboarding_data table (new structure)
  ├─ Mark onboarding_completed = true
  └─ Save to SharedPreferences (fallback)
  ↓
_showPaywallAndContinue()
```

### 3.2 Paywall Integration (Last Step of Onboarding)

```
_showPaywallAndContinue(userId)
  ↓
Show PaywallScreen (as modal/fullscreen dialog)
  ↓
User Interaction:
  ├─ Subscribe → Purchase completes
  └─ Skip/Close → Paywall dismissed
  ↓
Continue regardless of subscription status
  ↓
Navigate → RecommendationPreparingScreen
```

**Key Points:**
- Paywall is shown as the **last step** of onboarding
- User can skip paywall and subscribe later
- App continues to recommendation preparation regardless

**Files:**
- `lib/screens/onboarding_screen.dart`
- `lib/screens/paywall_screen.dart`

---

## 💎 4. Paywall & Subscription Flow

### 4.1 Paywall Display

**PaywallScreen Features:**
- **Products**: Monthly ($4.99) and Yearly ($39.99/year with 14-day free trial)
- **Features Display**: 5 feature points with aesthetic icons
- **Auto-renewal Disclaimer**: "Subscription renews automatically unless cancelled at least 24 hours before the end of the period."
- **Legal Links**: Terms, Privacy, Restore Purchases

**Purchase Flow:**
```
User selects package (Monthly/Yearly)
  ↓
_handlePurchase()
  ↓
SubscriptionProvider.purchasePackage()
  ↓
RevenueCatService.purchasePackage()
  ↓
RevenueCat SDK processes purchase
  ↓
On Success:
  ├─ Update subscription status
  ├─ Navigate based on context:
  │   ├─ If modal (from onboarding) → Pop back
  │   └─ If replacement (from splash) → Navigate to MainTabScreen
  └─ Emit subscription change event
```

### 4.2 Hard Paywall Logic

**Hard Paywall Implementation:**
- **Splash Screen**: Checks subscription on app restart, shows paywall if not subscribed
- **HardPaywallWrapper**: (Currently not used in main flow, but available)
  - Wraps app content
  - Blocks access if `isProUser = false`
  - Shows paywall instead of app content

**Subscription Status Check:**
```dart
RevenueCatService.isProUser
  ↓
Checks CustomerInfo.entitlements['Repoverse Pro']
  ↓
Returns true if entitlement is active
```

**Files:**
- `lib/screens/paywall_screen.dart`
- `lib/services/revenuecat_service.dart`
- `lib/providers/subscription_provider.dart`
- `lib/widgets/hard_paywall_wrapper.dart`

---

## 🧠 5. Recommendation Computation Flow

### 5.1 Initial Recommendation Computation (`recommendation_preparing_screen.dart`)

```
RecommendationPreparingScreen displays
  ↓
Show loading animation with tips
  ↓
_computeRecommendationsAndNavigate()
  ↓
Trigger Async RPC Call (non-blocking):
  supabaseClient.rpc('precompute_user_recommendations', {
    'p_user_id': userId,
    'p_limit': 500
  })
  ↓
Wait for recommendations (optimized):
  ├─ Initial wait: 1.5 seconds
  ├─ Check interval: 1.5 seconds
  ├─ Max attempts: 8 (total ~16 seconds max)
  └─ Minimum repos required: 50 (proceeds faster)
  ↓
Check repo_recommendations_feed table:
  SELECT repo_id FROM repo_recommendations_feed
  WHERE user_id = userId
  LIMIT 500
  ↓
Decision:
  ├─ 50+ repos found → Proceed immediately
  └─ < 50 repos → Wait and check again
  ↓
Navigate → MainTabScreen
```

### 5.2 Backend Recommendation Computation (SQL Function)

**Function: `precompute_user_recommendations`**

```sql
precompute_user_recommendations(p_user_id, p_limit = 500)
  ↓
1. Generate user vectors (generate_user_vectors)
   - Creates user preference vectors from onboarding data
  ↓
2. Delete old recommendations for user
   DELETE FROM repo_recommendations_feed WHERE user_id = p_user_id
  ↓
3. Get candidate repos (filtered pool):
   - Filter by:
     ├─ Primary cluster (from user preferences)
     ├─ Secondary clusters
     ├─ Tech stack/languages
     └─ Not archived
   - Limit: 10,000 candidate repos
  ↓
4. For each candidate repo:
   ├─ Compute score (compute_repo_score)
   │   ├─ Content match score
   │   ├─ Popularity score
   │   ├─ Activity score
   │   ├─ Freshness score
   │   └─ Quality score
   └─ Rank repos by score
  ↓
5. Insert top 500 repos into repo_recommendations_feed:
   INSERT INTO repo_recommendations_feed (
     user_id,
     repo_id,
     rank,
     final_score,
     ...
   )
  ↓
6. Return count of inserted repos
```

**Key Optimizations:**
- **Async RPC**: Doesn't block UI
- **Fast Proceed**: Only needs 50 repos to start (more load in background)
- **Precomputed Feed**: Fast queries, no joins needed
- **User-specific**: Each user gets personalized recommendations

**Files:**
- `lib/screens/recommendation_preparing_screen.dart`
- Database: `precompute_user_recommendations` function (SQL)

---

## 🔍 6. Discovery Screen Flow (`discovery_screen.dart`)

### 6.1 Initial Load

```
DiscoveryScreen loads
  ↓
_loadRepos()
  ↓
Get User ID and Preferences
  ↓
Get total seen count (for offset)
  ↓
Try to fetch from precomputed feed (FASTEST):
  repoService.getRecommendedRepos(
    userId: userId,
    limit: 20,
    offset: totalSeenCount
  )
  ↓
Query: repo_recommendations_feed
  SELECT * FROM repo_recommendations_feed
  WHERE user_id = userId
  ORDER BY rank ASC
  LIMIT 20 OFFSET totalSeenCount
  ↓
Fetch full repo data:
  SELECT * FROM repos
  WHERE github_id IN (repo_ids)
  ↓
If feed is empty, fallback to:
  ├─ getPersonalizedRepos() (cluster + tech stack + goals)
  ├─ getPersonalizedRepos() (cluster + tech stack, no goals)
  └─ getReposByCluster() (just cluster)
  ↓
Display repos in CardSwiper
```

### 6.2 Repo Loading Strategy

**Primary Method: Precomputed Feed**
```dart
getRecommendedRepos(userId, limit, offset)
  ↓
Query: repo_recommendations_feed (fast, indexed)
  ↓
Get repo_ids with rank
  ↓
Fetch full repo data using inFilter (optimized)
  ↓
Sort by rank
  ↓
Return Repository objects
```

**Fallback Methods (if feed empty):**
1. **Personalized Repos**: Based on cluster + tech stack + goals
2. **Cluster-based**: Just cluster match
3. **Common clusters**: Fallback to popular clusters

### 6.3 Swipe Interactions

```
User swipes card
  ↓
_onSwipeEnd(direction, index)
  ↓
Record interaction:
  ├─ Save to user_interactions table
  ├─ Update seen repos count
  └─ Track swipe direction (like/pass)
  ↓
Load next batch if needed:
  ├─ If < 5 cards remaining
  └─ Load next 20 repos from feed
  ↓
Pre-cache images for next batch
```

### 6.4 Save Repo Flow

```
User taps save button
  ↓
_handleSave(repo)
  ↓
repoService.saveRepo(repo, userId)
  ↓
Insert into saved_repos table:
  INSERT INTO saved_repos (user_id, repo_id, saved_at)
  ↓
Show success snackbar
  ↓
Update saved repos list (auto-refresh)
```

**Files:**
- `lib/screens/discovery_screen.dart`
- `lib/services/repo_service.dart`

---

## 📊 7. Data Flow & Database Queries

### 7.1 Recommendation Feed Query

**Table: `repo_recommendations_feed`**
```sql
-- Fast query (no joins, indexed)
SELECT 
  repo_id,
  rank,
  final_score,
  repo_name,
  repo_full_name,
  description,
  avatar_url,
  language,
  stars,
  forks,
  badges
FROM repo_recommendations_feed
WHERE user_id = :userId
ORDER BY rank ASC
LIMIT :limit OFFSET :offset
```

**Optimization:**
- Uses `inFilter` for fetching full repo data (faster than OR queries)
- Precomputed scores (no computation at query time)
- Indexed on `user_id` and `rank`

### 7.2 Repo Service Methods

**1. `getRecommendedRepos()`** (Primary - Fast)
- Queries precomputed feed
- Uses offset for pagination
- Falls back to personalized if feed empty

**2. `getPersonalizedRepos()`** (Fallback)
- Filters by cluster, tech stack, goals
- Computes scores on-the-fly
- Slower but more flexible

**3. `getReposByCluster()`** (Simple fallback)
- Just cluster match
- Uses recommendation_score from repos table

### 7.3 User Preferences Query

```sql
SELECT 
  primary_cluster,
  secondary_clusters,
  tech_stack,
  goals,
  experience_level,
  repo_size,
  onboarding_completed
FROM app_user_preferences
WHERE user_id = :userId
```

**Files:**
- `lib/services/repo_service.dart`
- Database: Various tables (repos, repo_recommendations_feed, app_user_preferences, etc.)

---

## 🎯 8. Trending Screen Flow (`trending_screen_v2.dart`)

### 8.1 Trending Repos Loading

```
TrendingScreenV2 loads
  ↓
TrendingProvider (Riverpod) fetches data
  ↓
repoService.getTrendingRepos(periodType: 'daily' | 'weekly')
  ↓
Query trending_repos table:
  SELECT * FROM trending_repos
  WHERE period_type = :periodType
    AND period_date = :targetDate
    AND category IS NOT NULL
  ORDER BY rank ASC
  ↓
Fallback logic:
  ├─ Try latest available date
  ├─ If stale, try yesterday (daily) or 7 days ago (weekly)
  └─ Filter out blocked repos (generic repos)
  ↓
Display in CardSwiper
```

**Key Features:**
- **Riverpod State Management**: Reactive updates
- **Compute() for Isolates**: Smooth scrolling (heavy computation in background)
- **Date Logic**: Always shows latest available data, with smart fallbacks

**Files:**
- `lib/screens/trending_screen_v2.dart`
- `lib/providers/trending_provider.dart`
- `lib/services/repo_service.dart` (getTrendingRepos method)

---

## 💾 9. Saved Repos Flow (`saved_screen.dart`)

### 9.1 Loading Saved Repos

```
SavedScreen loads
  ↓
repoService.loadSavedRepos(userId)
  ↓
Query saved_repos table:
  SELECT * FROM saved_repos
  WHERE user_id = :userId
  ORDER BY saved_at DESC
  ↓
Fetch full repo data:
  SELECT * FROM repos_view (or repos/repos_master)
  WHERE github_id IN (saved_repo_ids)
  ↓
Display in list
```

**Auto-refresh:**
- Listens to RepoService changes
- Automatically updates when repos are saved

**Files:**
- `lib/screens/saved_screen.dart`
- `lib/services/repo_service.dart` (loadSavedRepos method)

---

## 🔄 10. Complete User Journey

### 10.1 New User Flow

```
App Launch
  ↓
Splash Screen (2 seconds)
  ↓
Onboarding NOT completed
  ↓
OnboardingScreen
  ├─ Step 1: Welcome
  ├─ Step 2: Interests
  ├─ Step 3: Tech Stack
  ├─ Step 4: Skill Level
  ├─ Step 5: Goals
  ├─ Step 6: Repo Size
  └─ Step 7: Current Project
  ↓
Save preferences to database
  ↓
Show PaywallScreen (last step)
  ├─ User subscribes → Purchase completes
  └─ User skips → Paywall dismissed
  ↓
RecommendationPreparingScreen
  ├─ Show loading animation
  ├─ Trigger RPC: precompute_user_recommendations (500 repos)
  └─ Wait for 50+ repos (or max 16 seconds)
  ↓
MainTabScreen
  ├─ Discovery Tab (swipe repos)
  ├─ Trending Tab (trending repos)
  ├─ Saved Tab (saved repos)
  └─ Profile Tab (settings)
```

### 10.2 Returning User Flow (Subscribed)

```
App Launch
  ↓
Splash Screen
  ↓
Onboarding completed ✓
  ↓
RevenueCat initialized
  ↓
Subscription check: isProUser = true ✓
  ↓
MainTabScreen (direct access)
```

### 10.3 Returning User Flow (Not Subscribed)

```
App Launch
  ↓
Splash Screen
  ↓
Onboarding completed ✓
  ↓
RevenueCat initialized
  ↓
Subscription check: isProUser = false ✗
  ↓
PaywallScreen (Hard Paywall - blocks access)
  ├─ User subscribes → Navigate to MainTabScreen
  └─ User closes app → Next launch shows paywall again
```

---

## 🗄️ 11. Database Schema Overview

### 11.1 Key Tables

**User Data:**
- `app_user_preferences`: User onboarding preferences
- `user_onboarding_data`: Detailed onboarding data (new structure)
- `saved_repos`: User's saved repositories
- `user_interactions`: Swipe interactions (like/pass)

**Recommendations:**
- `repo_recommendations_feed`: Precomputed recommendations (user_id, repo_id, rank, score)
- `repos`: Full repository data
- `repos_master`: Master repository table
- `repo_cluster_new`: Repository clusters
- `repo_tech_stack`: Repository tech stack mapping

**Trending:**
- `trending_repos`: Daily/weekly trending repositories
- `blocked_repos`: Generic repos to filter out

**Functions:**
- `precompute_user_recommendations(p_user_id, p_limit)`: Computes and stores recommendations
- `generate_user_vectors(p_user_id)`: Creates user preference vectors
- `compute_repo_score(p_user_id, p_repo_id)`: Calculates recommendation score

---

## 🔐 12. RevenueCat Integration

### 12.1 Configuration

**Constants:**
- API Key: `test_AicJXufprKBUEFVnpevpTRDgDfq` (test mode)
- Entitlement: `Repoverse Pro`
- Products: `monthly`, `yearly`
- Offering: `default`

### 12.2 Subscription Status Flow

```
RevenueCatService.initialize()
  ↓
Configure Purchases SDK
  ↓
Fetch CustomerInfo
  ↓
Check entitlements['Repoverse Pro']
  ↓
Update isProUser status
  ↓
Listen for updates (purchases, restores)
  ↓
Emit subscription changes via stream
```

### 12.3 Purchase Flow

```
User selects package
  ↓
SubscriptionProvider.purchasePackage()
  ↓
RevenueCatService.purchasePackage()
  ↓
RevenueCat SDK processes purchase
  ↓
On Success:
  ├─ Update CustomerInfo
  ├─ Update isProUser = true
  ├─ Emit subscription change
  └─ Navigate based on context
```

**Files:**
- `lib/services/revenuecat_service.dart`
- `lib/providers/subscription_provider.dart`

---

## 📈 13. Performance Optimizations

### 13.1 Recommendation Loading

1. **Precomputed Feed**: Fast queries, no computation
2. **Offset Pagination**: Continue from where user left off
3. **Batch Loading**: Load 20 repos at a time
4. **Image Pre-caching**: Pre-cache next batch images
5. **Async RPC**: Don't block UI during computation

### 13.2 UI Optimizations

1. **Riverpod + compute()**: Heavy computation in isolates
2. **IndexedStack**: Keep screens alive (no rebuilds)
3. **CachedNetworkImage**: Image caching
4. **Lazy Loading**: Load repos as needed
5. **Optimized Queries**: Use `inFilter` instead of OR queries

### 13.3 State Management

- **Riverpod**: For trending repos (reactive)
- **Provider**: For services (AppSupabaseService, RepoService)
- **ChangeNotifier**: For service state updates

---

## 🎨 14. UI/UX Flow

### 14.1 Discovery Screen

- **Card Swiper**: Swipeable cards with gestures
- **Haptic Feedback**: On swipe actions
- **Image Pre-caching**: Smooth image loading
- **Appreciation Messages**: When loading next batch
- **Empty States**: When no repos available

### 14.2 Paywall Screen

- **Apple-style Design**: Clean, minimal aesthetic
- **Feature Points**: 5 features with icons
- **Subscription Plans**: Monthly and Yearly cards
- **Free Trial Display**: Shows 14-day trial for yearly
- **Auto-renewal Disclaimer**: Required text at bottom

---

## 🔍 15. Error Handling & Fallbacks

### 15.1 Recommendation Fallbacks

```
Primary: Precomputed feed
  ↓ (if empty)
Fallback 1: Personalized repos (cluster + tech + goals)
  ↓ (if empty)
Fallback 2: Personalized repos (cluster + tech, no goals)
  ↓ (if empty)
Fallback 3: Cluster-based repos
  ↓ (if empty)
Fallback 4: Common clusters
```

### 15.2 Network Error Handling

- Detects network errors
- Shows appropriate messages
- Retries with exponential backoff
- Graceful degradation

### 15.3 Subscription Error Handling

- RevenueCat initialization failures don't block app
- Purchase errors show user-friendly messages
- Restore purchases available
- Subscription status checked on app launch

---

## 📝 Summary

### Key Flows:

1. **App Launch** → Splash → Check onboarding/subscription → Route accordingly
2. **Onboarding** → Collect preferences → Show paywall → Compute recommendations
3. **Recommendations** → Precompute 500 repos → Store in feed → Fast queries
4. **Discovery** → Load from feed → Swipe interactions → Save repos
5. **Subscription** → RevenueCat integration → Hard paywall on restart if not subscribed

### Key Technologies:

- **Flutter**: UI framework
- **Supabase**: Backend/database
- **RevenueCat**: Subscription management
- **Riverpod + Provider**: State management
- **SQL Functions**: Recommendation computation

### Key Optimizations:

- Precomputed recommendations (fast queries)
- Async RPC calls (non-blocking)
- Image pre-caching
- Batch loading
- Smart fallbacks

---

**Last Updated**: February 2026
**Version**: 1.0
