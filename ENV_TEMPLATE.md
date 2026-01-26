# Environment Variables Template

Copy the contents below to create your `.env` files.

## Root `.env` (Frontend - Vite)

Create this file at: `GitHub Repository Discovery App/.env`

```env
# ============================================
# GitHub Repository Discovery App - Frontend
# ============================================

# GitHub API Configuration (optional but recommended)
# Get your token from: https://github.com/settings/tokens
# Permissions needed: public_repo (read-only)
# Without token: 60 requests/hour | With token: 5,000 requests/hour
VITE_GITHUB_API_TOKEN=your_github_token_here

# OpenAI API Configuration (required for AI agent feature)
# Get your key from: https://platform.openai.com/api-keys
# Required for: AI-powered repository recommendations
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Backend API URL (if using separate backend server)
# Default: http://localhost:3000/api
VITE_API_URL=http://localhost:3000/api

# ============================================
# Supabase Configuration (REQUIRED for persistent storage)
# ============================================
# Get these from: Supabase Dashboard → Settings → API
# Project URL: https://YOUR_PROJECT_ID.supabase.co
# Replace YOUR_PROJECT_ID with your actual project ID (e.g., hwbdrvbcawcfpbcimblg)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# Anon/Public Key: Copy from "anon public" key in API settings
# This key is safe to use in frontend (it's public)
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ============================================
# Environment
# ============================================
VITE_ENV=development
```

## Server `.env` (Backend - Express)

Create this file at: `GitHub Repository Discovery App/server/.env`

```env
# ============================================
# GitHub Repository Discovery App - Backend
# ============================================

# Server Port (optional, defaults to 3000)
PORT=3000

# GitHub API Configuration (optional but recommended)
# Get your token from: https://github.com/settings/tokens
# Permissions needed: public_repo (read-only)
# Without token: 60 requests/hour | With token: 5,000 requests/hour
GITHUB_TOKEN=your_github_token_here

# OpenAI API Configuration (required for AI agent feature)
# Get your key from: https://platform.openai.com/api-keys
# Required for: AI-powered repository recommendations
OPENAI_API_KEY=your_openai_api_key_here

# OpenAI Model (optional, defaults to gpt-3.5-turbo)
# Options: gpt-3.5-turbo, gpt-4, gpt-4-turbo
# gpt-3.5-turbo is cheaper and recommended for MVP
OPENAI_MODEL=gpt-3.5-turbo

# Node Environment (optional)
NODE_ENV=development
```

## Quick Setup Instructions

1. **Create root `.env` file:**
   - Copy the frontend template above
   - Replace `YOUR_PROJECT_ID` with your Supabase project ID (e.g., `hwbdrvbcawcfpbcimblg`)
   - Add your Supabase anon key from Supabase Dashboard → Settings → API
   - Add your GitHub token (optional but recommended)
   - Add your OpenAI API key (required for AI agent)

2. **Create server `.env` file:**
   - Copy the backend template above
   - Add your GitHub token (optional but recommended)
   - Add your OpenAI API key (required for AI agent)

3. **Restart your servers:**
   ```bash
   # Terminal 1: Frontend
   cd "GitHub Repository Discovery App"
   npm run dev

   # Terminal 2: Backend (if using)
   cd "GitHub Repository Discovery App/server"
   npm run dev
   ```

## Required vs Optional

### Frontend (Root `.env`)
- ✅ **REQUIRED**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (for persistent storage)
- ⚠️ **Recommended**: `VITE_GITHUB_API_TOKEN` (increases rate limits)
- ⚠️ **Required for AI**: `VITE_OPENAI_API_KEY` (needed for AI agent feature)

### Backend (Server `.env`)
- ⚠️ **Recommended**: `GITHUB_TOKEN` (increases rate limits)
- ⚠️ **Required for AI**: `OPENAI_API_KEY` (needed for AI agent feature)
- ℹ️ **Optional**: `PORT`, `OPENAI_MODEL`, `NODE_ENV`

## Getting Your API Keys

### GitHub Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: `public_repo` (read-only)
4. Copy token to `.env` file

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy key to `.env` file
4. Note: You'll be charged per API call (~$0.0015 per query with GPT-3.5 Turbo)

### Supabase Credentials
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

## Security Notes

- ✅ The Supabase `anon` key is safe to use in frontend (it's public)
- ✅ Never commit `.env` files to git (they're in `.gitignore`)
- ✅ Row Level Security (RLS) policies protect your data
- ⚠️ Keep your GitHub and OpenAI tokens secret
