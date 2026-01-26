# PowerShell script to create .env files
# Run this script: .\setup-env.ps1

Write-Host "Creating .env files..." -ForegroundColor Green

# Root .env file
$rootEnv = @"
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
# Project URL: https://hwbdrvbcawcfpbcimblg.supabase.co
VITE_SUPABASE_URL=https://hwbdrvbcawcfpbcimblg.supabase.co

# Anon/Public Key: Copy from "anon public" key in API settings
# This key is safe to use in frontend (it's public)
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ============================================
# Environment
# ============================================
VITE_ENV=development
"@

# Server .env file
$serverEnv = @"
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
"@

# Write root .env
$rootEnv | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
Write-Host "✅ Created .env (root)" -ForegroundColor Green

# Write server .env
$serverEnv | Out-File -FilePath "server\.env" -Encoding utf8 -NoNewline
Write-Host "✅ Created server\.env" -ForegroundColor Green

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Open .env and add your Supabase anon key" -ForegroundColor Cyan
Write-Host "2. (Optional) Add GitHub token and OpenAI API key" -ForegroundColor Cyan
Write-Host "3. Run the SQL schema in Supabase (see SUPABASE_SETUP.md)" -ForegroundColor Cyan
Write-Host "4. Restart your dev server" -ForegroundColor Cyan
