/**
 * Windows Service Uninstallation Script
 * 
 * Run this script as Administrator to remove the Fiscal Print Service
 * from Windows Services.
 * 
 * Usage:
 *   node service/uninstall-service.js
 *   - or -
 *   npm run service:uninstall
 */

import { Service } from 'node-windows';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the absolute path to the service script
const scriptPath = path.resolve(__dirname, '../src/fiscalPrintService.js');

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║      FISCAL PRINT SERVICE - WINDOWS SERVICE UNINSTALLER       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

// Create a new service object
const svc = new Service({
  name: 'FiscalPrintService',
  script: scriptPath,
});

// Listen for uninstall event
svc.on('uninstall', () => {
  console.log('✅ Service uninstalled successfully!');
  console.log('');
  console.log('The Fiscal Print Service has been removed from Windows Services.');
  console.log('');
  console.log('To reinstall, run:');
  console.log('  npm run service:install');
});

// Listen for already uninstalled event
svc.on('alreadyuninstalled', () => {
  console.log('⚠️  Service is not installed.');
});

// Listen for stop event
svc.on('stop', () => {
  console.log('Service stopped...');
});

// Listen for error
svc.on('error', (err) => {
  console.error('❌ Error:', err);
});

// Stop and uninstall
console.log('Stopping and uninstalling service...');
console.log('(You may see a UAC prompt - please accept it)');
console.log('');

// Stop first, then uninstall
svc.stop();
setTimeout(() => {
  svc.uninstall();
}, 2000);
