# Quick Start Checklist - Store Setup

Use this checklist when setting up the system on a new PC.

## Pre-Setup Checklist

- [ ] Windows 10/11 installed
- [ ] Internet connection available
- [ ] Fiscal printer and cable ready
- [ ] PostgreSQL installation file downloaded
- [ ] Node.js installation file downloaded
- [ ] ZFPLab Server installation file ready

## Installation Steps

### 1. Install Software (30 minutes)
- [ ] Install Node.js (LTS version)
- [ ] Install PostgreSQL (remember password!)
- [ ] Install Git (optional)
- [ ] Install ZFPLab Server

### 2. Setup Project (15 minutes)
- [ ] Copy/clone project to `C:\Projects\argjira-crm`
- [ ] **Option A**: Create Supabase project (see SUPABASE_SETUP.md)
- [ ] **Option B**: Create database `argjira_crm` in pgAdmin (local)
- [ ] Run all migrations from `database/migrations/` folder

### 3. Configure Backend (10 minutes)
- [ ] Create `backend/.env` file
- [ ] **If Supabase**: Set `DATABASE_URL` (connection string)
- [ ] **If Local**: Set database credentials (DB_HOST, DB_PORT, etc.)
- [ ] Generate JWT_SECRET
- [ ] Generate SERVICE_AUTH_TOKEN
- [ ] Run `npm install` in backend folder
- [ ] Test: `npm start` (should start on port 3000)

### 4. Configure Frontend (5 minutes)
- [ ] Create `frontend/.env.local` file
- [ ] Set `VITE_API_URL=http://localhost:3000`
- [ ] Run `npm install` in frontend folder
- [ ] Test: `npm run dev` (should start on port 5173)

### 5. Connect Printer (15 minutes)
- [ ] Connect printer via USB/Serial
- [ ] Power on printer
- [ ] Check Device Manager for COM port
- [ ] Start ZFPLab Server
- [ ] Run device detection in ZFPLab
- [ ] Verify printer is found

### 6. Install Windows Service (5 minutes)
- [ ] Run `install-fiscal-service.bat` as Administrator
- [ ] Verify service is running: `Get-Service FiscalPrintService`
- [ ] Check service auto-starts: `services.msc`

### 7. Network Setup (10 minutes)
- [ ] Find main PC IP: `ipconfig`
- [ ] Configure Windows Firewall (ports 3000, 5173)
- [ ] Update frontend `.env.local` with IP address
- [ ] Test access from phone/tablet

### 8. Final Testing (15 minutes)
- [ ] Login to application
- [ ] Configure company settings (name, address)
- [ ] Test fiscal printer connection
- [ ] Create a test order
- [ ] Verify receipt prints with:
  - [ ] Company name in header
  - [ ] Company address in header
  - [ ] Correct item prices
  - [ ] All items listed

## Daily Startup Procedure

**Every Morning:**
1. Turn on main PC
2. Turn on fiscal printer
3. Wait 30 seconds
4. Start backend: `cd backend && npm start`
5. Start frontend: `cd frontend && npm run dev` (or serve built version)
6. Verify service is running: `Get-Service FiscalPrintService`

## Daily Shutdown Procedure

**Every Evening:**
1. Print Z-Report from POS page
2. Stop backend (Ctrl+C)
3. Stop frontend (Ctrl+C)
4. Turn off fiscal printer
5. Shutdown PC

## Important IP Addresses

**Main PC IP:** ___________________

**Backend URL:** `http://[IP]:3000`  
**Frontend URL:** `http://[IP]:5173`

## Important Passwords

**Supabase Database Password:** ___________________  
**Supabase Connection String:** ___________________  
**JWT Secret:** ___________________  
**Service Auth Token:** ___________________

*(Or if using local PostgreSQL:)*  
**PostgreSQL Password:** ___________________

*(Store these securely!)*

## Troubleshooting Quick Fixes

**Service not running?**
```powershell
Start-Service FiscalPrintService
```

**Printer not found?**
- Restart ZFPLab Server
- Check printer is powered on
- Run device detection again

**Can't access from phone?**
- Check both devices on same WiFi
- Verify firewall allows port 3000
- Check main PC IP address

**Headers not showing?**
- Go to Settings → Update company name/address
- Go to Fiscal Print Server page → Click "Sinkronizo Headers"

## Support Contacts

**Technical Support:** ___________________  
**Printer Support:** ___________________

---

**Setup Date:** _______________  
**Setup By:** _______________  
**Verified By:** _______________
