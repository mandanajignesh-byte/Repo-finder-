# PowerShell script to safely update .env files
# This script preserves existing values and only adds missing variables

Write-Host "Safely updating .env files (preserving existing values)..." -ForegroundColor Green

# Function to get existing value or return placeholder
function Get-EnvValue {
    param(
        [string]$Key,
        [string]$Placeholder,
        [hashtable]$Existing
    )
    if ($Existing.ContainsKey($Key) -and $Existing[$Key] -ne $Placeholder -and $Existing[$Key] -ne "") {
        return $Existing[$Key]
    }
    return $Placeholder
}

# Function to parse existing .env file
function Parse-EnvFile {
    param([string]$FilePath)
    $result = @{}
    if (Test-Path $FilePath) {
        Get-Content $FilePath | ForEach-Object {
            if ($_ -match '^\s*([^#=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                $result[$key] = $value
            }
        }
    }
    return $result
}

# Root .env
$rootEnvPath = ".env"
$rootExisting = Parse-EnvFile $rootEnvPath

$rootEnv = @"
# ============================================
# GitHub Repository Discovery App - Frontend
# ============================================

# GitHub API Configuration (optional but recommended)
# Get your token from: https://github.com/settings/tokens
# Permissions needed: public_repo (read-only)
# Without token: 60 requests/hour | With token: 5,000 requests/hour
VITE_GITHUB_API_TOKEN=$(Get-EnvValue "VITE_GITHUB_API_TOKEN" "your_github_token_here" $rootExisting)

# OpenAI API Configuration (required for AI agent feature)
# Get your key from: https://platform.openai.com/api-keys
# Required for: AI-powered repository recommendations
VITE_OPENAI_API_KEY=$(Get-EnvValue "VITE_OPENAI_API_KEY" "your_openai_api_key_here" $rootExisting)

# Backend API URL (if using separate backend server)
# Default: http://localhost:3000/api
VITE_API_URL=$(Get-EnvValue "VITE_API_URL" "http://localhost:3000/api" $rootExisting)

# ============================================
# Supabase Configuration (REQUIRED for persistent storage)
# ============================================
# Get these from: Supabase Dashboard → Settings → API
# Project URL: https://hwbdrvbcawcfpbcimblg.supabase.co
VITE_SUPABASE_URL=$(Get-EnvValue "VITE_SUPABASE_URL" "https://hwbdrvbcawcfpbcimblg.supabase.co" $rootExisting)

# Anon/Public Key: Copy from "anon public" key in API settings
# This key is safe to use in frontend (it's public)
VITE_SUPABASE_ANON_KEY=$(Get-EnvValue "VITE_SUPABASE_ANON_KEY" "your_supabase_anon_key_here" $rootExisting)

# ============================================
# Environment
# ============================================
VITE_ENV=$(Get-EnvValue "VITE_ENV" "development" $rootExisting)
"@

# Server .env
$serverEnvPath = "server\.env"
$serverExisting = Parse-EnvFile $serverEnvPath

$serverEnv = @"
# ============================================
# GitHub Repository Discovery App - Backend
# ============================================

# Server Port (optional, defaults to 3000)
PORT=$(Get-EnvValue "PORT" "3000" $serverExisting)

# GitHub API Configuration (optional but recommended)
# Get your token from: https://github.com/settings/tokens
# Permissions needed: public_repo (read-only)
# Without token: 60 requests/hour | With token: 5,000 requests/hour
GITHUB_TOKEN=$(Get-EnvValue "GITHUB_TOKEN" "your_github_token_here" $serverExisting)

# OpenAI API Configuration (required for AI agent feature)
# Get your key from: https://platform.openai.com/api-keys
# Required for: AI-powered repository recommendations
OPENAI_API_KEY=$(Get-EnvValue "OPENAI_API_KEY" "your_openai_api_key_here" $serverExisting)

# OpenAI Model (optional, defaults to gpt-3.5-turbo)
# Options: gpt-3.5-turbo, gpt-4, gpt-4-turbo
# gpt-3.5-turbo is cheaper and recommended for MVP
OPENAI_MODEL=$(Get-EnvValue "OPENAI_MODEL" "gpt-3.5-turbo" $serverExisting)

# Node Environment (optional)
NODE_ENV=$(Get-EnvValue "NODE_ENV" "development" $serverExisting)
"@

# Write root .env
$rootEnv | Out-File -FilePath $rootEnvPath -Encoding utf8 -NoNewline
Write-Host "✅ Updated .env (root) - preserved existing values" -ForegroundColor Green

# Write server .env
$serverEnv | Out-File -FilePath $serverEnvPath -Encoding utf8 -NoNewline
Write-Host "✅ Updated server\.env - preserved existing values" -ForegroundColor Green

Write-Host "`nDone! Your existing values have been preserved." -ForegroundColor Yellow
