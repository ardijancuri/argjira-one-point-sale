@echo off
echo.
echo ============================================================
echo    FISCAL PRINT SERVICE - UNINSTALLER
echo ============================================================
echo.
echo This script will remove the Fiscal Print Service from
echo Windows Services.
echo.
echo ============================================================
echo.
pause

cd /d "%~dp0backend"

echo.
echo Removing Windows Service...
echo.

npm run service:uninstall

echo.
echo ============================================================
echo.
echo Uninstallation complete!
echo.
echo The Fiscal Print Service has been removed from Windows.
echo.
echo ============================================================
echo.
pause
