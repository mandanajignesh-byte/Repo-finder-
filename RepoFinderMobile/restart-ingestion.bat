@echo off
echo ========================================
echo   Restarting Balanced Ingestion
echo ========================================
echo.
echo Stopping any existing processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *ingest*" 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting fresh ingestion...
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
