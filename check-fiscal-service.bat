@echo off
echo.
echo ============================================================
echo    FISCAL PRINT SERVICE - STATUS CHECK
echo ============================================================
echo.

cd /d "%~dp0backend"

npm run service:status

echo.
pause
