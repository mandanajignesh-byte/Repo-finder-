# Trending Repos Setup Instructions

## What's Changed

### 1. Flutter App (Already Updated)
- ✅ Now always uses the **latest available date** from DB (not today's date)
- ✅ No more "0 repos found" because of date mismatch

### 2. SQL Script (Run in Supabase)
Run `trending-cleanup-and-filter.sql` in your Supabase SQL Editor to:
- Delete old trending data (>3 days)
- Create a `blocked_repos` table with generic repos (FB, VS Code, etc.)
- Add `category` column to `trending_repos`
- Create cleanup function

### 3. GitHub Workflow (Deploy to Repo-finder-)
Replace your `.github/workflows/main.yml` with `update-trending-workflow.yml`:
- Fetches trending repos from GitHub API
- Filters out blocked/generic repos (FB, VS Code, Microsoft, etc.)
- Assigns categories based on language
- Stores with **yesterday's date** for daily (since data is from yesterday)
- Auto-deletes data older than 3 days

## Steps to Deploy

### Step 1: Run SQL Script
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `trending-cleanup-and-filter.sql`
3. Run it

### Step 2: Update GitHub Workflow
1. Go to your `Repo-finder-` repository on GitHub
2. Edit `.github/workflows/main.yml`
3. Replace with contents from `update-trending-workflow.yml`
4. Commit and push

### Step 3: Trigger Workflow
1. Go to Actions tab in your `Repo-finder-` repo
2. Click "Update Daily Trending Repos"
3. Click "Run workflow" → "Run workflow" button

### Step 4: Test in App
1. Press `r` in Flutter terminal to hot reload
2. Go to Trending tab
3. Should now show repos!

## Date Logic Explained

| Period Type | App Shows | Workflow Stores As |
|-------------|-----------|-------------------|
| Daily | Latest available from DB | Yesterday's date |
| Weekly | Latest available from DB | 7 days ago |

This way, if the workflow runs at 6 AM today, it stores data with yesterday's date.
The app then shows that data immediately since it uses the latest DB date.

## Blocked Repos
The following repos are filtered out (too generic for discovery):
- facebook/react, facebook/react-native
- microsoft/vscode, microsoft/TypeScript
- google/*, vuejs/vue, angular/angular
- tensorflow/tensorflow, pytorch/pytorch
- kubernetes/kubernetes, docker/*
- and 30+ more...

## Categories
Repos are automatically categorized by language:
- `ai-ml`: Python, Jupyter Notebook
- `web-dev`: TypeScript, JavaScript, Vue, HTML, CSS
- `mobile`: Kotlin, Swift, Dart
- `devops`: Go, Shell, Dockerfile
- `systems`: Rust, C, C++
- `backend`: Java, Ruby, PHP
- `general`: Everything else
