# Table Comparison: `repo_clusters` vs `repos`

## Key Differences

### 1. **Data Structure**

#### `repo_clusters` (Old Structure)
- **Stores repos as JSONB** - All repo data in one JSON field
- **Cluster-based organization** - Each row = one repo in one cluster
- **Denormalized** - Same repo can appear multiple times (once per cluster)

```sql
repo_clusters:
  - cluster_name: "frontend"
  - repo_id: "12345"
  - repo_data: { entire repo as JSON }
  - tags: ["react", "javascript"]
  - quality_score: 85
```

#### `repos` (New Structure)
- **Normalized columns** - Each field is a separate column
- **Single source of truth** - Each repo appears once
- **Cluster is just a field** - Not the primary organization

```sql
repos:
  - github_id: 12345
  - name: "react-app"
  - full_name: "owner/react-app"
  - stars: 1000
  - forks: 200
  - language: "JavaScript"
  - cluster: "frontend"
  - recommendation_score: 85.5
  - popularity_score: 90.2
  ...
```

---

## 2. **Query Performance**

### `repo_clusters`
❌ **Slower queries:**
- Must parse JSONB to filter/sort
- Can't index individual fields easily
- Hard to query by stars, language, etc.
- Example: "Get repos with >1000 stars" requires JSON parsing

### `repos`
✅ **Faster queries:**
- Direct column access (no JSON parsing)
- Proper indexes on all fields
- Fast filtering by stars, language, cluster, scores
- Example: "Get repos with >1000 stars" = simple WHERE clause

---

## 3. **Use Cases**

### `repo_clusters` (Current)
✅ **Good for:**
- Pre-curated cluster-based recommendations
- Simple "get best of cluster" queries
- Backward compatibility with existing code

❌ **Not good for:**
- Complex filtering (by stars, language, date)
- Sorting by multiple criteria
- Cross-cluster queries
- Mobile app feeds (needs fast queries)

### `repos` (New)
✅ **Good for:**
- Fast feed queries with filters
- Sorting by scores, stars, dates
- Complex recommendation queries
- Mobile app (cursor pagination)
- Analytics and reporting
- Trending/featured repos

---

## 4. **Data Storage**

### `repo_clusters`
- **One repo = Multiple rows** (if in multiple clusters)
- Example: A React repo might be in both "frontend" and "javascript" clusters
- Storage: More rows, but simpler structure

### `repos`
- **One repo = One row**
- Cluster is just a field (can be queried)
- Storage: Fewer rows, but more columns

---

## 5. **Example Queries**

### Get trending repos

**`repo_clusters`:**
```sql
-- Slow: Must parse JSONB, can't filter by trending easily
SELECT repo_data 
FROM repo_clusters 
WHERE cluster_name = 'frontend'
ORDER BY quality_score DESC
LIMIT 20;
-- Problem: Can't filter by is_trending, stars, etc. easily
```

**`repos`:**
```sql
-- Fast: Direct column access with indexes
SELECT * 
FROM repos 
WHERE is_trending = true
ORDER BY trending_score DESC, recommendation_score DESC
LIMIT 20;
-- Fast: Uses indexes on is_trending and trending_score
```

### Get repos by language and stars

**`repo_clusters`:**
```sql
-- Very slow: Must parse JSONB for every row
SELECT repo_data 
FROM repo_clusters 
WHERE repo_data->>'language' = 'JavaScript'
  AND (repo_data->>'stars')::int > 1000;
-- Problem: No index, must parse JSON for every row
```

**`repos`:**
```sql
-- Fast: Direct column access with indexes
SELECT * 
FROM repos 
WHERE language = 'JavaScript'
  AND stars > 1000
ORDER BY recommendation_score DESC;
-- Fast: Uses indexes on language and stars
```

---

## 6. **Recommendation Scores**

### `repo_clusters`
- Stores `quality_score` (integer)
- Scores calculated during curation
- Limited scoring (just quality)

### `repos`
- Stores **6 precomputed scores:**
  - `popularity_score`
  - `activity_score`
  - `freshness_score`
  - `quality_score`
  - `trending_score`
  - `recommendation_score` (combined)
- Updated regularly
- Enables complex recommendation algorithms

---

## 7. **Mobile App Compatibility**

### `repo_clusters`
❌ **Not ideal:**
- Large JSONB payloads (slow on mobile)
- Hard to implement cursor pagination
- Can't filter efficiently
- Network overhead (sending full JSON)

### `repos`
✅ **Optimized:**
- Small payloads (only needed columns)
- Easy cursor pagination (github_id)
- Fast filtering on server
- Mobile-friendly queries

---

## Summary

| Feature | `repo_clusters` | `repos` |
|---------|----------------|---------|
| **Structure** | JSONB blob | Normalized columns |
| **Query Speed** | Slow (JSON parsing) | Fast (indexed columns) |
| **Storage** | One repo = multiple rows | One repo = one row |
| **Filtering** | Hard (JSON queries) | Easy (SQL WHERE) |
| **Sorting** | Limited | Full SQL sorting |
| **Scores** | Quality only | 6 precomputed scores |
| **Mobile** | Not optimized | Optimized |
| **Use Case** | Simple cluster feeds | Production feeds |

---

## Recommendation

**Keep both tables:**
- `repo_clusters` - For backward compatibility
- `repos` - For new ingestion and mobile app

**Migration path:**
1. New ingestion → `repos` table
2. Mobile app → Query `repos` table
3. Web app → Can use either (gradually migrate to `repos`)
