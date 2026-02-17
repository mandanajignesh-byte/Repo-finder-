@echo off
echo ========================================
echo   RESTARTING INGESTION
echo   Current: 3,322 repos ingested
echo   Will continue and enrich all repos
echo ========================================
echo.
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo Starting fresh...
echo.
cd /d "%~dp0"
node ingest-balanced.js --cluster=all
pause
