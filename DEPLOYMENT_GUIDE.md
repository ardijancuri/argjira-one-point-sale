# Complete Deployment Guide - Fiscal Printing System

This guide will walk you through setting up the entire fiscal printing system on a new PC in your store.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Install Required Software](#step-1-install-required-software)
3. [Step 2: Clone/Download the Project](#step-2-clonedownload-the-project)
4. [Step 3: Database Setup](#step-3-database-setup)
5. [Step 4: Backend Configuration](#step-4-backend-configuration)
6. [Step 5: Frontend Configuration](#step-5-frontend-configuration)
7. [Step 6: Install ZFPLab Server](#step-6-install-zfplab-server)
8. [Step 7: Connect Fiscal Printer](#step-7-connect-fiscal-printer)
9. [Step 8: Install Windows Service](#step-8-install-windows-service)
10. [Step 9: Network Configuration](#step-9-network-configuration)
11. [Step 10: Testing & Verification](#step-10-testing--verification)
12. [Step 11: Daily Operations](#step-11-daily-operations)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Hardware Requirements
- **Main PC** (with fiscal printer):
  - Windows 10/11
  - 4GB RAM minimum (8GB recommended)
  - USB port for fiscal printer
  - Network connection (Ethernet or WiFi)

- **Fiscal Printer**:
  - Tremol/DAVID fiscal printer
  - USB or Serial cable
  - Power supply

- **Other Devices** (optional):
  - Tablets, phones, or other PCs for order taking
  - Must be on the same network as main PC

### Software Requirements
- Node.js (v18 or higher)
- **Supabase account** (cloud database) OR PostgreSQL (v14 or higher) for local setup
- ZFPLab Server (from Tremol)
- Git (optional, for cloning)

**Note**: This guide uses **Supabase** (cloud PostgreSQL) which eliminates the need to install PostgreSQL locally. If you prefer local PostgreSQL, see the alternative steps.

---

## Step 1: Install Required Software

### 1.1 Install Node.js

1. Download Node.js from: https://nodejs.org/
2. Choose the **LTS version** (recommended)
3. Run the installer:
   - Check "Automatically install necessary tools"
   - Complete the installation
4. Verify installation:
   ```powershell
   node --version
   npm --version
   ```
   Should show versions like `v18.x.x` and `9.x.x`

### 1.2 Setup Supabase Database (Recommended)

**Option A: Using Supabase (Cloud Database - Recommended)**

1. Go to https://supabase.com
2. Sign up for a free account (or log in if you have one)
3. Click "New Project"
4. Fill in project details:
   - **Name**: `argjira-crm` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is sufficient for most stores
5. Wait 2-3 minutes for project to be created
6. Once ready, go to **Settings** → **Database**
7. Find your connection details:
   - **Host**: `db.xxxxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: (the one you set)
8. **Copy the connection string** (URI format) - you'll need it later

**Option B: Local PostgreSQL (Alternative)**

If you prefer local database:
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer:
   - **Important**: Remember the password you set for the `postgres` user
   - Port: `5432` (default)
   - Locale: `English, United States`
3. Complete the installation
4. Verify installation:
   - Open "pgAdmin 4" from Start Menu
   - Connect using the password you set

### 1.3 Install Git (Optional)

1. Download from: https://git-scm.com/download/win
2. Run installer with default options
3. Verify:
   ```powershell
   git --version
   ```

---

## Step 2: Clone/Download the Project

### Option A: Using Git (Recommended)

```powershell
# Navigate to where you want the project
cd C:\Projects

# Clone the repository
git clone <your-repository-url> argjira-crm

# Navigate into project
cd argjira-crm
```

### Option B: Copy from USB/Network

1. Copy the entire project folder to: `C:\Projects\argjira-crm`
2. Open PowerShell in that folder

---

## Step 3: Database Setup

### 3.1 Run Migrations on Supabase

**If using Supabase:**

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open each migration file from `database/migrations/` folder in order:
   - `001_initial_schema.sql`
   - `002_...`
   - `003_...`
   - ... (all migration files)
5. Copy and paste each file's content into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify each migration ran successfully (green checkmark)

**Alternative: Using Supabase CLI (Advanced)**

If you have Supabase CLI installed:
```powershell
# Install Supabase CLI (optional)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3.2 Run Migrations on Local PostgreSQL

**If using local PostgreSQL:**

1. Open **pgAdmin 4**
2. Right-click "Databases" → "Create" → "Database"
3. Name: `argjira_crm`
4. Owner: `postgres`
5. Click "Save"
6. Right-click `argjira_crm` database → "Query Tool"
7. Open each file from `database/migrations/` folder in order
8. Execute each file (F5)

---

## Step 4: Backend Configuration

### 4.1 Create Backend .env File

1. Navigate to `backend` folder
2. Create a file named `.env` (no extension)
3. Add the following content:

**Option A: Using Supabase (Recommended)**

```env
# Supabase Database Connection (use connection string)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
# OR use individual parameters:
# DB_HOST=db.xxxxx.supabase.co
# DB_PORT=5432
# DB_NAME=postgres
# DB_USER=postgres
# DB_PASSWORD=your_supabase_password
# DB_SSL=true

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_here

# Server
PORT=3000
NODE_ENV=production

# Fiscal Print Service
SERVICE_AUTH_TOKEN=your_service_auth_token_here
ZFPLAB_HOST=localhost
ZFPLAB_PORT=4444
API_URL=http://localhost:3000

# Company Info (optional, will be loaded from database)
COMPANY_NAME=
COMPANY_ADDRESS=
```

**Option B: Using Local PostgreSQL**

```env
# Local Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=argjira_crm
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_here

# Server
PORT=3000
NODE_ENV=production

# Fiscal Print Service
SERVICE_AUTH_TOKEN=your_service_auth_token_here
ZFPLAB_HOST=localhost
ZFPLAB_PORT=4444
API_URL=http://localhost:3000

# Company Info (optional, will be loaded from database)
COMPANY_NAME=
COMPANY_ADDRESS=
```

**How to get Supabase Connection String:**

1. Go to your Supabase project dashboard
2. Click **Settings** → **Database**
3. Scroll to **Connection string** section
4. Select **URI** tab
5. Copy the connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
6. Replace `[YOUR-PASSWORD]` with your actual database password
7. Paste into `.env` as `DATABASE_URL`

**Generate secure tokens:**

```powershell
# Generate JWT_SECRET
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('hex'));"

# Generate SERVICE_AUTH_TOKEN
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('hex'));"
```

### 4.2 Install Backend Dependencies

```powershell
cd C:\Projects\argjira-crm\backend
npm install
```

### 4.3 Test Backend

```powershell
# Start backend server
npm start
```

You should see:
```
Server running on port 3000
Database connected
```

**Keep this terminal open** - the backend must be running.

---

## Step 5: Frontend Configuration

### 5.1 Create Frontend .env File

1. Navigate to `frontend` folder
2. Create a file named `.env.local`
3. Add:

```env
VITE_API_URL=http://localhost:3000
```

### 5.2 Install Frontend Dependencies

```powershell
# Open a NEW terminal window
cd C:\Projects\argjira-crm\frontend
npm install
```

### 5.3 Build Frontend (Production)

```powershell
npm run build
```

This creates a `dist` folder with production files.

### 5.4 Serve Frontend (Development)

For testing, you can run:

```powershell
npm run dev
```

This starts the frontend on `http://localhost:5173`

---

## Step 6: Install ZFPLab Server

### 6.1 Download ZFPLab Server

1. Contact Tremol support or download from their website
2. Get the latest version of ZFPLab Server

### 6.2 Install ZFPLab Server

1. Run the installer
2. Install to default location: `C:\Program Files\ZFPLab\`
3. Complete the installation

### 6.3 Start ZFPLab Server

1. Open ZFPLab Server from Start Menu
2. It should appear in the system tray (bottom-right)
3. Right-click the tray icon → "Settings"
4. Verify:
   - Port: `4444`
   - Server is running

### 6.4 Configure ZFPLab to Auto-Start

1. Press `Win + R`
2. Type: `shell:startup`
3. Create a shortcut to ZFPLab Server in this folder
4. Now ZFPLab will start with Windows

---

## Step 7: Connect Fiscal Printer

### 7.1 Physical Connection

1. **Turn OFF the fiscal printer**
2. Connect USB/Serial cable to printer
3. Connect other end to PC
4. **Turn ON the fiscal printer**
5. Wait 10 seconds for Windows to detect it

### 7.2 Check Device Manager

1. Press `Win + X` → "Device Manager"
2. Expand "Ports (COM & LPT)"
3. Look for your printer (e.g., "USB Serial Port (COM8)")
4. **Note the COM port number** (e.g., COM8)

### 7.3 Configure ZFPLab Server

1. Open ZFPLab Server
2. Go to "Device" → "Find Device" or "Scan"
3. Wait for detection (10-30 seconds)
4. It should find your printer and show:
   - COM Port: `COM8` (or your port)
   - Baud Rate: `115200` (usually)

### 7.4 Test Connection

1. In ZFPLab, try to read printer status
2. If successful, you're connected!
3. If not, check:
   - Cable connection
   - Printer is powered on
   - Correct COM port selected

---

## Step 8: Install Windows Service

### 8.1 Generate Service Auth Token

```powershell
cd C:\Projects\argjira-crm\backend
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('hex'));"
```

Copy the output and add it to `backend/.env` as `SERVICE_AUTH_TOKEN`

### 8.2 Install Service

**IMPORTANT**: Run PowerShell as Administrator

```powershell
# Right-click PowerShell → "Run as Administrator"
cd C:\Projects\argjira-crm\backend
npm run service:install
```

Or use the batch file:

1. Right-click `install-fiscal-service.bat` → "Run as Administrator"
2. Accept UAC prompt
3. Wait for installation

### 8.3 Verify Service

```powershell
# Check service status
Get-Service FiscalPrintService

# Should show: Status: Running
```

### 8.4 Configure Service Auto-Start

The service should already be set to auto-start. Verify:

1. Press `Win + R` → `services.msc`
2. Find "FiscalPrintService"
3. Right-click → "Properties"
4. Startup type should be "Automatic"

---

## Step 9: Network Configuration

### 9.1 Find Main PC IP Address

```powershell
# In PowerShell
ipconfig

# Look for "IPv4 Address" under your network adapter
# Example: 192.168.100.4
```

**Write down this IP address** - you'll need it for other devices.

### 9.2 Configure Windows Firewall

1. Press `Win + R` → `wf.msc`
2. Click "Inbound Rules" → "New Rule"
3. Rule Type: "Port"
4. Protocol: TCP
5. Port: `3000` (Backend API)
6. Action: "Allow the connection"
7. Name: "Argjira Backend API"
8. Repeat for port `5173` (Frontend, if needed)

### 9.3 Update Frontend for Network Access

Edit `frontend/.env.local`:

```env
# For network access, use the main PC's IP
VITE_API_URL=http://192.168.100.4:3000
```

Rebuild frontend:

```powershell
cd frontend
npm run build
```

### 9.4 Access from Other Devices

**On tablets/phones/other PCs:**

1. Connect to the same WiFi network
2. Open browser
3. Go to: `http://192.168.100.4:5173` (or your frontend URL)
4. You should see the login page

---

## Step 10: Testing & Verification

### 10.1 Test Backend API

```powershell
# Test if backend is running
curl http://localhost:3000/api/health
# Or open in browser: http://localhost:3000/api/company-settings
```

### 10.2 Test Frontend

1. Open browser: `http://localhost:5173`
2. You should see the login page
3. Log in with your credentials

### 10.3 Test Fiscal Printer Connection

1. Go to Settings page
2. Find "Fiscal Printer" section
3. Click "Test Connection"
4. Should show: "Connection successful"

### 10.4 Test Print Service

1. Check service logs:
   ```powershell
   # View recent logs
   Get-EventLog -LogName Application -Source FiscalPrintService -Newest 10
   ```

2. Or check service status:
   ```powershell
   Get-Service FiscalPrintService
   ```

### 10.5 Test Complete Print Flow

1. Go to POS page
2. Add items to cart
3. Complete an order
4. Check if fiscal receipt prints automatically
5. Verify:
   - Company name appears in header
   - Company address appears in header
   - Item prices are correct (not 0)
   - Receipt prints successfully

---

## Step 11: Daily Operations

### 11.1 Starting the System

**Every morning:**

1. **Turn on the main PC**
2. **Turn on the fiscal printer**
3. **Wait 30 seconds** for everything to start:
   - Windows Service starts automatically
   - ZFPLab Server starts automatically
   - Backend should be running (or start it manually)

4. **Start Backend** (if not running):
   ```powershell
   cd C:\Projects\argjira-crm\backend
   npm start
   ```

5. **Start Frontend** (if using dev mode):
   ```powershell
   cd C:\Projects\argjira-crm\frontend
   npm run dev
   ```

   Or serve the built version (production).

### 11.2 End of Day - Z-Report

**Every evening:**

1. Go to POS page
2. Click "Mbyll Fiskalizimin Ditor" (Close Daily Fiscal)
3. This prints the Z-Report automatically
4. Keep the Z-Report for your records

### 11.3 Monitoring

**Check service status:**
```powershell
Get-Service FiscalPrintService
```

**View service logs:**
- Windows Event Viewer → Application Logs → FiscalPrintService
- Or check: `backend/logs/` folder (if logging to file)

---

## Troubleshooting

### Problem: Backend won't start

**Check:**
1. PostgreSQL is running
2. Database credentials in `.env` are correct
3. Port 3000 is not in use
4. Run: `npm install` again

### Problem: Fiscal printer not found

**Check:**
1. ZFPLab Server is running (system tray)
2. Printer is powered on
3. USB/Serial cable is connected
4. Run device detection in ZFPLab
5. Restart ZFPLab Server

### Problem: Service won't start

**Check:**
1. SERVICE_AUTH_TOKEN is set in `.env`
2. Backend API is running on port 3000
3. ZFPLab Server is running
4. Check Event Viewer for errors

**Reinstall service:**
```powershell
# As Administrator
cd backend
npm run service:uninstall
npm run service:install
```

### Problem: Headers not showing

**Check:**
1. Company settings are configured (Settings page)
2. Company name and address are filled in
3. Service logs show headers being updated
4. Try manual header sync in Fiscal Print Server page

### Problem: Prices showing as 0

**Check:**
1. Items have `cartPrice` field
2. Service logs show correct prices
3. Check the payload in database: `fiscal_print_jobs` table

### Problem: Can't access from other devices

**Check:**
1. All devices on same network
2. Windows Firewall allows port 3000
3. Main PC IP address is correct
4. Frontend `.env.local` has correct API URL

### Problem: Service keeps stopping

**Check:**
1. Event Viewer for crash logs
2. ZFPLab Server is running
3. Printer is connected
4. Backend API is accessible

**Restart service:**
```powershell
Restart-Service FiscalPrintService
```

---

## Quick Reference Commands

```powershell
# Backend
cd backend
npm start                    # Start backend
npm run dev                  # Start with auto-reload

# Frontend
cd frontend
npm run dev                  # Development server
npm run build                # Production build

# Service
npm run service:install      # Install Windows Service
npm run service:uninstall    # Remove Windows Service
npm run service:status       # Check service status
npm run print-service        # Run service manually (testing)

# Service Management
Get-Service FiscalPrintService           # Check status
Start-Service FiscalPrintService        # Start
Stop-Service FiscalPrintService         # Stop
Restart-Service FiscalPrintService       # Restart
```

---

## Support & Maintenance

### Regular Maintenance

1. **Weekly**: Check service logs for errors
2. **Monthly**: Update dependencies (`npm update`)
3. **As needed**: Update company settings if changed

### Backup

**Important files to backup:**
- `backend/.env` (contains secrets)
- Database (use pgAdmin backup)
- Company settings (stored in database)

### Updates

When updating the software:

1. Stop the service: `Stop-Service FiscalPrintService`
2. Stop backend: `Ctrl+C` in backend terminal
3. Pull latest code: `git pull` (or copy new files)
4. Install dependencies: `npm install` (in both backend and frontend)
5. Run migrations if needed
6. Restart backend
7. Restart service: `Start-Service FiscalPrintService`

---

## Success Checklist

Before going live, verify:

- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Database connection works
- [ ] ZFPLab Server is running
- [ ] Fiscal printer is detected
- [ ] Windows Service is installed and running
- [ ] Test print works (receipt prints)
- [ ] Headers show company name and address
- [ ] Prices are correct (not 0)
- [ ] Can access from other devices on network
- [ ] Z-Report prints correctly
- [ ] Service auto-starts with Windows

---

**Congratulations!** Your fiscal printing system is now set up and ready to use! 🎉

For questions or issues, refer to the troubleshooting section or check the service logs.
