# Onboarding Update - Matched to Actual Repos

## What Changed

### 1. **Onboarding Screen Redesign**
- Updated cluster selection to match actual repos in database
- Added icons and better labels for clusters
- Expanded language list to match all 16 languages in database
- Added validation to require primary cluster and at least one goal

### 2. **Personalized Repo Fetching**
- New `getPersonalizedRepos()` method in `RepoService`
- Fetches repos based on:
  - Primary cluster (required)
  - Preferred languages (optional filter)
  - Goals (filters by matching topics)
- Falls back to cluster-only query if personalized query fails

### 3. **Discovery Screen Updates**
- Now uses `getPersonalizedRepos()` instead of `getReposByCluster()`
- Passes user preferences (languages, goals) to personalize feed
- Better error handling for empty results

## Clusters Available (Matches Database)

1. **Frontend** 🎨
2. **Backend** ⚙️
3. **Mobile** 📱
4. **Desktop** 💻
5. **Data Science** 📊
6. **DevOps** 🚀
7. **Game Dev** 🎮
8. **AI/ML** 🤖

## Languages Available (16 total)

JavaScript, TypeScript, Python, Java, Go, Rust, C++, C#, PHP, Ruby, Swift, Kotlin, Dart, R, Scala, Elixir

## Goals Mapping

- **learning-new-tech** → tutorial, course, learn, guide, example, walkthrough
- **building-project** → boilerplate, starter, template, scaffold, project
- **contributing** → open-source, contributing, contribute
- **finding-solutions** → library, package, sdk, tool, utility
- **exploring** → awesome, curated, list, collection

## Database Schema

The app uses the existing `user_preferences` table. No new tables needed for basic functionality.

If you want to create a separate `app_users` table for better organization, run the SQL in `supabase-app-users-schema.sql` in the parent directory.

## Testing

1. Complete onboarding with:
   - Select a primary cluster (required)
   - Select languages (optional)
   - Select at least one goal (required)

2. Discovery screen should show personalized repos matching your selections

3. If no repos found:
   - Check that repos exist in database for selected cluster
   - Run ingestion script if needed
   - Check Supabase connection
