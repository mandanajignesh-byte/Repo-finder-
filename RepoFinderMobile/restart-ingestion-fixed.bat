@echo off
echo ========================================
echo   Balanced Ingestion - 20,000 Repos
echo   WITH FIXED ENRICHMENT
echo ========================================
echo.
echo Stopping any existing processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting fresh ingestion...
echo This will run until all 20,000 repos are ingested.
echo Enrichment will now complete properly!
echo Do not close this window!
echo.
cd /d "%~dp0"
node ingest-balanced.js --cluster=all
echo.
echo ========================================
echo Ingestion completed!
echo ========================================
pause
