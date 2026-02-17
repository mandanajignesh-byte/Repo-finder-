@echo off
cd /d "%~dp0"
echo ========================================
echo   WEEKLY TRENDING REPOS FETCHER
echo ========================================
echo.
echo Fetching weekly trending repos from GitHub...
echo.
node fetch-daily-trending.js --period=weekly
pause
