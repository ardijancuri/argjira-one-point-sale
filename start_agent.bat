@echo off
title Argjira Cloud Printer Agent
echo.
echo    STARTING CLOUD PRINTE AGENT...
echo    Make sure ZFPLab Server is running!
echo.
cd backend
node agent/index.js
pause
