@echo off
cd /d "C:\Users\manda\github\RepoFinderMobile"
:loop
cls
echo ========================================
echo   PARALLEL INGESTION MONITOR
echo ========================================
echo.
node check-status.js
echo.
echo Press Ctrl+C to stop monitoring
echo Refreshing in 30 seconds...
timeout /t 30 /nobreak >nul
goto loop
