@echo off
echo.
echo ============================================================
echo    FISCAL PRINT SERVICE - MANUAL START
echo ============================================================
echo.
echo Starting the Fiscal Print Service in console mode...
echo This is useful for testing before installing as a service.
echo.
echo Press Ctrl+C to stop the service.
echo.
echo ============================================================
echo.

cd /d "%~dp0backend"

echo Starting service...
echo.

npm run print-service
