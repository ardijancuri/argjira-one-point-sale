/**
 * Windows Service Installation Script
 * 
 * Run this script as Administrator to install the Fiscal Print Service
 * as a Windows Service that auto-starts with the system.
 * 
 * Usage:
 *   node service/install-service.js
 *   - or -
 *   npm run service:install
 */

import { Service } from 'node-windows';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the absolute path to the service script
const scriptPath = path.resolve(__dirname, '../src/fiscalPrintService.js');
const envPath = path.resolve(__dirname, '../.env');

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║      FISCAL PRINT SERVICE - WINDOWS SERVICE INSTALLER         ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`Script path: ${scriptPath}`);
console.log(`Env path: ${envPath}`);
console.log('');

// Create a new service object
const svc = new Service({
  name: 'FiscalPrintService',
  description: 'Fiscal Print Background Service - Processes fiscal print jobs from the queue without needing a browser open.',
  script: scriptPath,
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=256'
  ],
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ],
  // Recovery options
  wait: 2,
  grow: 0.5,
  maxRestarts: 3,
});

// Listen for install event
svc.on('install', () => {
  console.log('✅ Service installed successfully!');
  console.log('');
  console.log('Starting service...');
  svc.start();
});

// Listen for already installed event
svc.on('alreadyinstalled', () => {
  console.log('⚠️  Service is already installed.');
  console.log('');
  console.log('To reinstall, first run:');
  console.log('  npm run service:uninstall');
  console.log('');
  console.log('Then run this installer again.');
});

// Listen for start event
svc.on('start', () => {
  console.log('✅ Service started!');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('The Fiscal Print Service is now running as a Windows Service.');
  console.log('');
  console.log('It will:');
  console.log('  • Start automatically when Windows boots');
  console.log('  • Run in the background without a console window');
  console.log('  • Restart automatically if it crashes');
  console.log('');
  console.log('Management commands:');
  console.log('  Get-Service FiscalPrintService     # Check status');
  console.log('  Stop-Service FiscalPrintService    # Stop');
  console.log('  Start-Service FiscalPrintService   # Start');
  console.log('  Restart-Service FiscalPrintService # Restart');
  console.log('');
  console.log('Or use Windows Services GUI:');
  console.log('  services.msc');
  console.log('═══════════════════════════════════════════════════════════════');
});

// Listen for error
svc.on('error', (err) => {
  console.error('❌ Error:', err);
});

// Listen for invalid install
svc.on('invalidinstallation', () => {
  console.error('❌ Invalid installation detected.');
  console.log('');
  console.log('Please run this script as Administrator.');
});

// Install the service
console.log('Installing service...');
console.log('(You may see a UAC prompt - please accept it)');
console.log('');
svc.install();
