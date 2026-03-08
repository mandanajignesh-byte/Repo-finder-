# DiscoveryScreen.tsx Migration Guide
## Phase 4 - Logic Changes ONLY (NO DESIGN CHANGES)

⚠️ **CRITICAL**: This file is too complex to auto-migrate. Follow this guide manually.
⚠️ **DO NOT CHANGE**: Any JSX, className, Tailwind classes, or component structure.

---

## Step 1: Add New Imports (Top of File, Line ~22)

```typescript
// ADD THESE IMPORTS:
import { recommendationEngine } from '@/services/recommendation.engine';
import type { Repo } from '@/types/recommendation';

// KEEP ALL EXISTING IMPORTS - don't remove anything
```

---

## Step 2: Replace State Declarations (Lines ~28-45)

### FIND AND REPLACE:

```typescript
// OLD (around lines 28-45):
const [cards, setCards] = useState<Repository[]>([]);
const [savedRepos, setSavedRepos] = useState<Repository[]>([]);
const [likedRepos, setLikedRepos] = useState<Repository[]>([]);
const [isLoadingBatch, setIsLoadingBatch] = useState(false);
const [isLoadingMore, setIsLoadingMore] = useState(false);
```

### REPLACE WITH:

```typescript
// NEW:
const [cards, setCards] = useState<Repo[]>([]);
const [savedRepos, setSavedRepos] = useState<Repo[]>([]);
const [likedRepos, setLikedRepos] = useState<Repo[]>([]);
const [isLoadingBatch, setIsLoading] = useState(false);
const isFetching = useRef(false);

// KEEP ALL OTHER STATE - don't remove:
// - showSaved, showLiked, showOnboarding, isLoadingSharedRepo
// - sharedRepoError, isSwiping, triggerSwipe, swipeCount
// - showPWAInstallPrompt, isPWAInstalledState, showOnboardingPopup
// - isLoadingRecommendations, loadedRepoCount, skippedRepos, undoEntry
// - showPaywall, paywallType, dailySwipesUsed
```

---

## Step 3: DELETE Old Loading Functions (Lines ~82-243)

### DELETE THESE ENTIRE FUNCTIONS:
- `loadRandomRepos()` (lines ~83-147)
- `loadPersonalizedRepos()` (lines ~150-243)

**DO NOT DELETE** any useEffect hooks or other functions.

---

## Step 4: ADD New Initialization useEffect (After PWA useEffect, ~Line 267)

```typescript
// ADD THIS NEW useEffect (place after PWA tracking useEffect):
useEffect(() => {
  (async () => {
    setIsLoading(true);
    await recommendationEngine.init();
    const batch = await recommendationEngine.loadBatch({
      append: false,
      attempt: 0
    });
    setCards(batch);
    setIsLoading(false);
  })();
}, []); // Run once on mount
```

---

## Step 5: REPLACE handleSwipe Function (Around Line 619+)

### FIND:
```typescript
const handleSkip = useCallback(async (repo?: Repository) => {
  // ... existing code ...
}, [/* deps */]);
```

### REPLACE WITH:

```typescript
const handleSwipe = useCallback(async (
  direction: "left" | "right",
  repo: Repo
) => {
  // Tell engine about the swipe (updates affinity, scores)
  await recommendationEngine.handleSwipe(repo, direction);

  // Update local liked list
  if (direction === "right") {
    setLikedRepos(prev => [...prev, repo]);
  }

  // Remove card from stack
  setCards(prev => {
    const remaining = prev.filter(c => c.id !== repo.id);

    // Preload next batch when running low
    if (
      recommendationEngine.needsPreload(remaining.length) &&
      !isFetching.current
    ) {
      isFetching.current = true;
      recommendationEngine
        .loadBatch({ append: true, attempt: 0 })
        .then(batch => {
          if (batch.length > 0) {
            setCards(c => [...c, ...batch]);
          }
        })
        .finally(() => { isFetching.current = false; });
    }

    return remaining;
  });

  // KEEP ALL EXISTING handleSkip LOGIC BELOW:
  // - Swipe count tracking
  // - PWA install prompt
  // - Onboarding trigger
  // - Usage limit checks
  // Don't remove that code!
}, []);
```

---

## Step 6: ADD handleSave Function (After handleSwipe)

```typescript
const handleSave = useCallback(async (repo: Repo) => {
  await recommendationEngine.handleSave(repo);
  setSavedRepos(prev => [...prev, repo]);

  // KEEP any existing save tracking logic below
}, []);
```

---

## Step 7: UPDATE Card Component Props (Find JSX around line 1200+)

### FIND the RepoCard component:
```typescript
<RepoCard
  repo={cards[0]}
  onSwipe={...}  // Find this prop
  onSave={...}   // Find this prop
  // ... other props
/>
```

### REPLACE ONLY THE PROP VALUES:
```typescript
<RepoCard
  repo={cards[0]}
  onSwipe={(dir) => handleSwipe(dir, cards[0])}
  onSave={() => handleSave(cards[0])}
  // KEEP ALL OTHER PROPS EXACTLY AS THEY ARE
/>
```

---

## Step 8: DELETE Old Preload useEffect (Lines ~568-577)

### FIND AND DELETE:
```typescript
useEffect(() => {
  if (cards.length < 5 && !isLoadingMore && loaded) {
    if (preferences.onboardingCompleted) {
      loadPersonalizedRepos(true);
    } else {
      loadRandomRepos(true);
    }
  }
}, [cards.length, isLoadingMore, preferences.onboardingCompleted, loaded, loadPersonalizedRepos, loadRandomRepos]);
```

**DELETE THIS ENTIRE useEffect** - the new engine handles preloading automatically.

---

## Step 9: REMOVE Old Dependencies

### FIND useEffect hooks that reference these:
- `loadPersonalizedRepos`
- `loadRandomRepos`
- `isLoadingMore`

### REMOVE THOSE DEPENDENCIES from dependency arrays.

---

## Verification Checklist

After making changes:

- [ ] Run `npx tsc --noEmit` - should have ZERO errors
- [ ] Check no JSX or classNames changed
- [ ] Check all existing features still work (PWA prompt, onboarding, undo, etc.)
- [ ] Test: Open app → should load 10 repos
- [ ] Test: Swipe through cards → should preload silently
- [ ] Test: Close and reopen → no duplicate repos

---

## Troubleshooting

### If you see TypeScript errors:
- Check `Repo` type is imported from `@/types/recommendation`
- Check `recommendationEngine` is imported correctly
- Check `isFetching` is `useRef<boolean>(false)` not `useState`

### If repos don't load:
- Check SQL functions ran successfully in Supabase
- Check browser console for errors
- Check `user_tag_affinity` and `repo_scores` tables exist

### If same repos appear:
- Check `markSeen()` is called in `new-interaction.service.ts`
- Check `getAllSeenRepoIds()` returns correct IDs
- Clear browser cache and try again

---

## Files to Run SQL First (Supabase)

Before testing, run this file in Supabase SQL Editor:
📄 `supabase-recommendation-system.sql`

Run each section separately, NOT all at once.
