/**
 * Windows Service Status Check Script
 * 
 * Run this script to check the status of the Fiscal Print Service.
 * 
 * Usage:
 *   node service/check-service.js
 *   - or -
 *   npm run service:status
 */

import { exec } from 'child_process';

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║      FISCAL PRINT SERVICE - STATUS CHECK                      ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

// Use PowerShell to get service status
const command = 'powershell -Command "Get-Service -Name FiscalPrintService -ErrorAction SilentlyContinue | Format-List Name,Status,StartType"';

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.log('Service Status: NOT INSTALLED');
    console.log('');
    console.log('To install the service, run:');
    console.log('  npm run service:install');
    console.log('');
    return;
  }
  
  if (stdout.trim()) {
    console.log('Service found:');
    console.log('');
    console.log(stdout);
    console.log('');
    console.log('Management commands:');
    console.log('  Stop:     Stop-Service FiscalPrintService');
    console.log('  Start:    Start-Service FiscalPrintService');
    console.log('  Restart:  Restart-Service FiscalPrintService');
    console.log('');
  } else {
    console.log('Service Status: NOT INSTALLED');
    console.log('');
    console.log('To install the service, run:');
    console.log('  npm run service:install');
    console.log('');
  }
});

// Also check if ZFPLab is running
console.log('Checking ZFPLab Server...');

import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 4444,
  path: '/',
  method: 'GET',
  timeout: 3000
}, (res) => {
  console.log(`  ZFPLab Server: RUNNING (port 4444)`);
});

req.on('error', () => {
  console.log(`  ZFPLab Server: NOT RUNNING`);
  console.log('');
  console.log('  ⚠️  Please start ZFPLab Server before running the print service.');
});

req.on('timeout', () => {
  req.destroy();
  console.log(`  ZFPLab Server: TIMEOUT (may not be running)`);
});

req.end();
