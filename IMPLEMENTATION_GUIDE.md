# Backend Implementation Guide

## Quick Start

### 1. Create Database Schema
```bash
# Run in Supabase SQL Editor
supabase-repos-schema.sql
```

### 2. Run Ingestion Pipeline
```bash
npm run ingest-repos
```

### 3. Use Recommendation Queries
See `scripts/recommendation-queries.sql` for optimized feed queries.

## Files Created

- `supabase-repos-schema.sql` - Unified repos table with indexes
- `scripts/ingest-repos.ts` - Ingestion pipeline (fetch → normalize → score → upsert)
- `scripts/recommendation-queries.sql` - Optimized feed queries with cursor pagination
- `BACKEND_ARCHITECTURE.md` - Architecture overview

## Key Features

✅ Precomputed scores (popularity, activity, freshness, quality, trending)  
✅ Cursor pagination for mobile performance  
✅ GIN indexes for fast topic searches  
✅ Batch upserts (100 repos at a time)  
✅ Cluster-based organization  

## Next Steps

1. Run schema migration
2. Ingest initial repos
3. Update Flutter app to use new `repos` table
4. Set up cron jobs for daily ingestion
