# Fiscal Print Windows Service

This folder contains scripts to install/uninstall the Fiscal Print Service as a Windows Service.

## Overview

The Fiscal Print Service runs in the background on your main PC (the one with the fiscal printer connected) and automatically processes print jobs from the database queue. This means:

- **No browser needed** - The service runs automatically in the background
- **Auto-start** - Service starts when Windows boots
- **Reliable** - Service restarts automatically if it crashes
- **Network printing** - Other devices can submit print jobs via the API

## Prerequisites

Before installing the service, ensure:

1. **ZFPLab Server is running** on `localhost:4444`
2. **Fiscal printer is connected** via USB/Serial
3. **Backend API is running** on `localhost:3000`
4. **Node.js is installed** on the system

## Configuration

Add the following to your `.env` file in the backend folder:

```env
# Service Authentication Token (generate a random secure string)
SERVICE_AUTH_TOKEN=your-secure-token-here

# Optional: Override defaults
ZFPLAB_HOST=localhost
ZFPLAB_PORT=4444
API_URL=http://localhost:3000
PRINT_POLL_INTERVAL=500
```

### Generating a Service Token

You can generate a secure token using:

```powershell
# PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Installation

### Option 1: Using Batch Files (Recommended)

1. Double-click `install-fiscal-service.bat` in the project root
2. Accept the UAC prompt (Run as Administrator)
3. Wait for installation to complete

### Option 2: Using npm

```powershell
# Run as Administrator
cd backend
npm run service:install
```

## Management

### Check Status

```powershell
# PowerShell
Get-Service FiscalPrintService

# Or use the batch file
check-fiscal-service.bat
```

### Start/Stop/Restart

```powershell
# Start
Start-Service FiscalPrintService

# Stop
Stop-Service FiscalPrintService

# Restart
Restart-Service FiscalPrintService
```

### Windows Services GUI

1. Press `Win + R`
2. Type `services.msc`
3. Find "FiscalPrintService"
4. Right-click for options

## Uninstallation

### Option 1: Using Batch File

Double-click `uninstall-fiscal-service.bat`

### Option 2: Using npm

```powershell
# Run as Administrator
cd backend
npm run service:uninstall
```

## Testing

Before installing as a Windows Service, test manually:

```powershell
cd backend
npm run print-service
```

This runs the service in the console where you can see logs in real-time.

## Logs

### Console Mode

When running with `npm run print-service`, logs appear in the console.

### Windows Service Mode

Logs are written to:
- Windows Event Viewer (Application logs)
- `daemon/` folder in the backend directory

To view Event Viewer logs:
1. Press `Win + R`
2. Type `eventvwr.msc`
3. Navigate to "Windows Logs" > "Application"
4. Filter by Source: "FiscalPrintService"

## Troubleshooting

### Service won't start

1. Check ZFPLab Server is running: `http://localhost:4444`
2. Check printer is connected
3. Verify SERVICE_AUTH_TOKEN in .env matches

### Connection errors

1. Ensure backend API is running: `http://localhost:3000`
2. Check firewall settings
3. Verify network connectivity

### Printer not found

1. Open ZFPLab application
2. Use device detection tool
3. Note the COM port and baud rate
4. Update ZFPLAB settings if needed

### Permission denied

Run installation/uninstallation as Administrator.
