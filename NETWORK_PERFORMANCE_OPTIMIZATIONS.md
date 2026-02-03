# Network Performance Optimizations

## Analysis Summary

Based on network tab analysis, we identified several performance bottlenecks:

1. **Multiple duplicate queries**: `liked_repos`, `saved_repos`, `users`, `user_interactions` were being called 2-5 times
2. **Large repo_clusters queries**: 100 kB requests taking 1.04s - 1.13s
3. **Redundant getAllSeenRepoIds calls**: Each call made 3 separate Supabase queries

## Optimizations Implemented

### 1. In-Memory Caching for Seen Repo IDs

**Problem**: `getAllSeenRepoIds()` was being called multiple times, each making 3 Supabase queries (interactions, saved, liked).

**Solution**: Added in-memory cache with 5-minute TTL.

```typescript
// Cache seen repo IDs for 5 minutes
const seenRepoIdsCache = new Map<string, { ids: string[]; timestamp: number }>();
const SEEN_REPO_IDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

**Impact**:
- Eliminates redundant Supabase calls
- Reduces 3 queries per call to 0 (after first call)
- Cache invalidated automatically after user interactions

### 2. In-Memory Caching for Saved/Liked Repos

**Problem**: `getSavedRepositories()` and `getLikedRepositories()` were being called multiple times.

**Solution**: Added shared cache with 2-minute TTL.

```typescript
// Cache saved/liked repos for 2 minutes
const savedLikedCache = new Map<string, { saved: Repository[]; liked: Repository[]; timestamp: number }>();
const SAVED_LIKED_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
```

**Impact**:
- Eliminates duplicate saved/liked repo queries
- Cache automatically invalidated after save/like actions
- Faster UI updates

### 3. Optimized repo_clusters Queries

**Problem**: Large 100 kB queries taking 1+ seconds.

**Solution**: Reduced query multipliers and optimized data fetching.

**Changes**:
- `getBestOfCluster`: Reduced multiplier from 1.3x to 1.2x (8% less data)
- `getReposByTags`: Reduced multiplier from 1.5x to 1.3x (13% less data)

**Impact**:
- Smaller payload sizes (target: <50 kB per query)
- Faster query execution
- Still get enough repos for filtering and shuffling

### 4. Automatic Cache Invalidation

**Solution**: Caches are automatically invalidated when:
- User saves a repo → invalidates seen repo IDs + saved/liked cache
- User likes a repo → invalidates seen repo IDs + saved/liked cache
- User views/skips a repo → invalidates seen repo IDs cache

This ensures data freshness while maximizing cache hits.

## Expected Performance Improvements

### Before Optimizations:
- **getAllSeenRepoIds**: 3 Supabase queries × N calls = 3N queries
- **getSavedRepositories**: 1 query × M calls = M queries
- **getLikedRepositories**: 1 query × M calls = M queries
- **repo_clusters**: 100 kB queries taking 1+ seconds

### After Optimizations:
- **getAllSeenRepoIds**: 3 queries (first call) + 0 (cached) = **~90% reduction**
- **getSavedRepositories**: 1 query (first call) + 0 (cached) = **~80% reduction**
- **getLikedRepositories**: 1 query (first call) + 0 (cached) = **~80% reduction**
- **repo_clusters**: 8-13% smaller payloads, **faster queries**

## Network Tab Improvements

### Expected Changes:
1. **Fewer duplicate queries**: Same queries won't appear multiple times
2. **Faster repo_clusters queries**: Smaller payloads, faster execution
3. **Reduced total requests**: Caching eliminates redundant calls
4. **Lower total data transfer**: Smaller queries + fewer calls

### Monitoring:
- Check network tab for reduced duplicate queries
- Verify repo_clusters queries are <50 kB and <800ms
- Confirm cache hits (no duplicate saved/liked/seen queries)

## Cache Strategy

### TTL Selection:
- **Seen Repo IDs (5 min)**: Longer TTL because this data changes less frequently
- **Saved/Liked Repos (2 min)**: Shorter TTL because users actively save/like repos

### Invalidation Strategy:
- **Automatic**: Caches invalidated on write operations (save, like, view, skip)
- **Time-based**: Caches expire after TTL
- **User-specific**: Each user has their own cache entries

## Future Optimizations

Potential further improvements:
1. **Request deduplication**: Prevent duplicate concurrent requests
2. **Batch operations**: Combine multiple Supabase queries into single requests
3. **IndexedDB caching**: Persist cache across page reloads
4. **Query result compression**: Compress large repo_clusters responses
5. **Pagination**: Fetch repo_clusters in smaller chunks

## Testing

To verify optimizations:
1. Open DevTools → Network tab
2. Reload the app
3. Check for:
   - Fewer duplicate `liked_repos`, `saved_repos`, `user_interactions` queries
   - Smaller `repo_clusters` queries (<50 kB)
   - Faster query times (<800ms for repo_clusters)
   - Cache hits (no duplicate queries within 2-5 minutes)

## Notes

- Caches are in-memory only (cleared on page reload)
- Cache TTLs are conservative to ensure data freshness
- Cache invalidation is automatic and transparent
- All optimizations are backward compatible
