@echo off
title Argjira POS Server
echo ========================================
echo    ARGJIRA POS - Starting Server
echo ========================================
echo.

cd /d "%~dp0backend"

echo Starting backend server...
set NODE_ENV=production
start "Argjira POS - API" cmd /k "node src/server.js"

echo.
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Starting print agent...
start "Argjira POS - Print Agent" cmd /k "node agent/index.js"

echo.
echo ========================================
echo    Server is running!
echo    Open browser: http://localhost:3000
echo ========================================
echo.

start http://localhost:3000

pause
