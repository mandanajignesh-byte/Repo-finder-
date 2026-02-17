@echo off
cd /d "%~dp0"
echo ========================================
echo   ENRICHMENT RUNNER
echo ========================================
echo.
echo Starting enrichment of all repos...
echo This will populate: health, activity, complexity, tech_stack, badges, gems, clusters
echo.
echo The script will run until all repos are enriched.
echo You can close this window - it will continue in the background.
echo.
node enrich-all-repos.js
pause
