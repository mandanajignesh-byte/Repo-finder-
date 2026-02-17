@echo off
cd /d "C:\Users\manda\github\RepoFinderMobile"
echo ========================================
echo Parallel Ingestion with Multiple Tokens
echo ========================================
echo.
echo Starting parallel ingestion with 10 API keys...
echo This will be MUCH faster than single-token ingestion!
echo.
echo Running in FOREGROUND mode - you'll see all output below:
echo.
pause
node ingest-balanced-parallel.js --cluster=all
pause
