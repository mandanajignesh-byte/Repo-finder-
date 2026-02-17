@echo off
echo ========================================
echo   Balanced Ingestion - 20,000 Repos
echo ========================================
echo.
echo Starting ingestion process...
echo This will run until all 20,000 repos are ingested.
echo Do not close this window!
echo.
cd /d "%~dp0"
node ingest-balanced.js --cluster=all
echo.
echo ========================================
echo Ingestion completed!
echo ========================================
pause
