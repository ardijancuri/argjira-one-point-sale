@echo off
echo ========================================
echo    ARGJIRA POS - Production Build
echo ========================================
echo.

cd /d "%~dp0"

:: Step 1: Build frontend
echo [1/4] Building frontend...
cd frontend
call npm install
call npm run build
cd ..

:: Step 2: Create Production folder
echo [2/4] Creating Production folder...
if exist "Production" rmdir /s /q "Production"
mkdir "Production"
mkdir "Production\backend"
mkdir "Production\frontend"

:: Step 3: Copy files
echo [3/4] Copying files...

:: Backend
xcopy "backend\src" "Production\backend\src" /E /I /Q
xcopy "backend\agent" "Production\backend\agent" /E /I /Q
copy "backend\package.json" "Production\backend\package.json"
copy "backend\.env.example" "Production\backend\.env.example"

:: Frontend (only dist)
xcopy "frontend\dist" "Production\frontend\dist" /E /I /Q

:: Batch files
copy "start.bat" "Production\start.bat"
copy "stop.bat" "Production\stop.bat"

:: Step 4: Create .env template with actual values
echo [4/4] Creating .env file...
(
echo # DATABASE
echo DB_HOST=aws-1-eu-central-1.pooler.supabase.com
echo DB_PORT=5432
echo DB_NAME=postgres
echo DB_USER=postgres.trqaeizbkqdwpwsmjhlh
echo DB_PASSWORD=MCil1gyKDsSZfvFr
echo DB_SSL=true
echo.
echo # JWT
echo JWT_SECRET=d7cbdc0d23fe9eba767adc9954e20b97
echo JWT_EXPIRES_IN=7d
echo.
echo # SERVER
echo PORT=3000
echo NODE_ENV=production
echo FRONTEND_URL=http://localhost:3000
echo.
echo # FISCAL PRINTER
echo SERVICE_AUTH_TOKEN=e24af59037ecb1ec6c0a3fc71e2b7097a274fc83dec71659c54733b345ae8e51
echo ZFPLAB_HOST=localhost
echo ZFPLAB_PORT=4444
echo API_URL=http://localhost:3000
echo CLOUD_API_URL=http://localhost:3000
echo PRINT_POLL_INTERVAL=500
echo FISCAL_COM_PORT=COM8
echo FISCAL_BAUD_RATE=115200
) > "Production\backend\.env"

echo.
echo ========================================
echo    Build Complete!
echo ========================================
echo.
echo Production folder created at:
echo %~dp0Production
echo.
echo Copy the "Production" folder to USB
echo.
pause
