# Environment Setup Guide

## Problem
Scripts need `.env.local` file but it doesn't exist.

## Solution

### Step 1: Create `.env.local` file

**Location:** `C:\Users\manda\github\GitHub Repository Discovery App\.env.local`

### Step 2: Add Required Variables

Copy this template and fill in your values:

```env
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# GitHub API Token (Optional but Recommended)
VITE_GITHUB_API_TOKEN=your_github_token_here
GITHUB_TOKEN=your_github_token_here
```

### Step 3: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### Step 4: Get Your GitHub Token (Optional)

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scope: `public_repo` (read-only)
4. Copy token to `VITE_GITHUB_API_TOKEN` and `GITHUB_TOKEN`

## Quick PowerShell Command

Run this in PowerShell (from project root):

```powershell
cd "C:\Users\manda\github\GitHub Repository Discovery App"

# Create .env.local file
@"
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_GITHUB_API_TOKEN=your_github_token_here
GITHUB_TOKEN=your_github_token_here
"@ | Out-File -FilePath .env.local -Encoding utf8
```

Then edit `.env.local` and replace the placeholder values.

## Verify Setup

After creating `.env.local`, run:
```powershell
npm run ingest-repos
```

If it still fails, check:
- File is named exactly `.env.local` (not `.env.local.txt`)
- File is in project root directory
- Variables have no quotes around values
- No extra spaces before/after `=`
