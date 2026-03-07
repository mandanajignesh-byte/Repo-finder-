# Simplified Recommendation System

## Goal
Load repos in batches of 8-10, with smart fallback hierarchy, max 3 retries.

## Flow

### loadPersonalizedRepos(append, retryCount)
1. Check retry limit (max 3)
2. Get user ID and seen repos
3. Try hierarchy:
   - Primary cluster + tech stack
   - Primary cluster only  
   - Tech stack tags
   - Random cluster
4. Deduplicate
5. Set cards
6. Track views
7. Hide loading

### loadRandomRepos(append)
1. Get random cluster
2. Fetch repos
3. Deduplicate
4. Set cards
5. Track views
6. Hide loading

## Remove
- repoPoolService (complex caching)
- enhancedRecommendationService (over-engineered)
- All duplicate code
- All old fallback logic
- Session tracking
