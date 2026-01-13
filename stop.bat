@echo off
echo Stopping Argjira POS services...
taskkill /FI "WINDOWTITLE eq Argjira POS*" /F 2>nul
echo Done.
pause
