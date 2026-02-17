@echo off
cd /d "%~dp0"
echo ========================================
echo   DAILY TRENDING REPOS FETCHER
echo ========================================
echo.
echo Fetching daily trending repos from GitHub...
echo This will:
echo   - Fetch trending repos from GitHub
echo   - Ingest new repos
echo   - Detect underrated gems
echo   - Calculate trending scores
echo.
node fetch-daily-trending.js --period=daily
pause
