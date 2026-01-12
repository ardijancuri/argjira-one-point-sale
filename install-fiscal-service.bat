@echo off
echo.
echo ============================================================
echo    FISCAL PRINT SERVICE - INSTALLER
echo ============================================================
echo.
echo This script will install the Fiscal Print Service as a
echo Windows Service that starts automatically with your PC.
echo.
echo REQUIREMENTS:
echo   - Node.js must be installed
echo   - Run this as Administrator
echo   - ZFPLab Server must be running (localhost:4444)
echo   - Backend API must be running (localhost:3000)
echo.
echo ============================================================
echo.
pause

cd /d "%~dp0backend"

echo.
echo Installing Windows Service...
echo.

npm run service:install

echo.
echo ============================================================
echo.
echo Installation complete!
echo.
echo To check service status:
echo   Get-Service FiscalPrintService
echo.
echo To view logs, check Windows Event Viewer:
echo   Application Logs ^> FiscalPrintService
echo.
echo ============================================================
echo.
pause
