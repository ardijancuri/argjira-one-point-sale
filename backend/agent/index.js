/**
 * Argjira POS - Fiscal Printer Agent (Cloud Forwarder)
 * 
 * Run this on the Shop PC where the printer is connected.
 * It polls the Cloud POS for jobs and prints them locally.
 * 
 * Usage: 
 *   node agent/index.js
 */

import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import { TremolFP, centerText } from '../src/lib/tremolAdapter.js';

dotenv.config();

// --- CONFIGURATION ---
const CONFIG = {
    // Cloud POS Config
    API_URL: process.env.CLOUD_API_URL || 'http://localhost:3000', // Change to your Cloud URL
    AUTH_TOKEN: process.env.SERVICE_AUTH_TOKEN || '',
    POLL_INTERVAL: 1000, // Check every 1 second

    // Local Printer Config
    ZFPLAB_HOST: 'localhost',
    ZFPLAB_PORT: 4444,
    FISCAL_COM_PORT: process.env.FISCAL_COM_PORT || 'COM8',
    FISCAL_BAUD_RATE: parseInt(process.env.FISCAL_BAUD_RATE || '115200'),

    // Operator Config
    OPERATOR_PASSWORDS: ['0 ', '0000', '1   ', '0001']
};

console.log('╔══════════════════════════════════════════════╗');
console.log('║        ARGJIRA POS - CLOUD PRINTER AGENT     ║');
console.log('╠══════════════════════════════════════════════╣');
console.log(`║ Cloud URL: ${CONFIG.API_URL.padEnd(33)} ║`);
console.log(`║ Printer:   ${CONFIG.FISCAL_COM_PORT} @ ${CONFIG.FISCAL_BAUD_RATE} baud`.padEnd(46) + '║');
console.log('╚══════════════════════════════════════════════╝');

// --- STATE ---
let printer = null;
let isConnected = false;
let cachedCompanySettings = null;
let headersNeedUpdate = true; // Force header update on first connection

// --- API CLIENT ---
async function apiRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(CONFIG.API_URL + path);
        const client = url.protocol === 'https:' ? https : http;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.AUTH_TOKEN}`
            }
        };

        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// --- FETCH COMPANY SETTINGS (fallback) ---
async function fetchCompanySettings() {
    try {
        const res = await apiRequest('GET', '/api/company-settings');
        if (res && res.settings) {
            cachedCompanySettings = res.settings;
            return cachedCompanySettings;
        }
    } catch (err) {
        // Silent fail - settings come from job payload
    }
    return null;
}

// --- CHECK IF FISCAL DAY IS CLOSED ---
async function isFiscalDayClosed(fp) {
    try {
        const status = await fp.ReadStatus();
        // Day is closed if no open fiscal receipt and no uncommitted data
        const dayOpen = status.Opened_Fiscal_Receipt === 1 ||
                       status.OptionFiscalReceiptOpen === 1 ||
                       status.FM_fiscalization_done === 0;
        return !dayOpen;
    } catch (e) {
        return false; // Assume day is open if we can't check
    }
}

// --- PROGRAM HEADERS ---
// IMPORTANT: Headers can ONLY be saved permanently when fiscal day is CLOSED
async function programHeaders(fp, settings, force = false) {
    if (!settings) {
        console.log('[Agent] No company settings available for headers');
        return false;
    }

    const { name, address, tvsh_number, nipt, tax_number } = settings;
    const taxId = nipt || tax_number || '';
    const companyName = name || 'Argjira';
    const companyAddress = address || '';

    let line3 = '';
    if (tvsh_number && taxId) {
        line3 = 'TVSH:' + tvsh_number + ' NIPT:' + taxId;
    } else if (tvsh_number) {
        line3 = 'TVSH: ' + tvsh_number;
    } else if (taxId) {
        line3 = 'NIPT: ' + taxId;
    }

    // Only log and attempt if forced (after Z-report) or day is closed
    if (!force) {
        // Skip silently if day is likely open - headers won't save anyway
        return false;
    }

    console.log('[Agent] Programming headers (day closed - will save permanently):');
    console.log('  Line 1: "' + companyName + '"');
    console.log('  Line 2: "' + companyAddress + '"');
    console.log('  Line 3: (blank)');
    console.log('  Line 4: "' + line3 + '"');

    try {
        await fp.ProgHeader('1', centerText(companyName, 48));
        console.log('[Agent]   ✓ Line 1 set');
        await fp.ProgHeader('2', centerText(companyAddress, 48));
        console.log('[Agent]   ✓ Line 2 set');
        await fp.ProgHeader('3', ' ');
        console.log('[Agent]   ✓ Line 3 set (blank)');
        if (line3) {
            await fp.ProgHeader('4', centerText(line3, 48));
            console.log('[Agent]   ✓ Line 4 set');
        } else {
            await fp.ProgHeader('4', ' ');
        }
        for (let i = 5; i <= 8; i++) {
            await fp.ProgHeader(i.toString(), ' ');
        }
        headersNeedUpdate = false;
        console.log('[Agent] ✅ Headers saved permanently!');
        return true;
    } catch (err) {
        console.error('[Agent] ❌ Header programming failed:', err.message);
        if (err.message.includes('uncommited report') || err.message.includes('Denied')) {
            console.log('[Agent] ℹ️  Headers can only be saved when fiscal day is CLOSED (after Z-report)');
        }
        return false;
    }
}

// --- PRINTER CONNECTION ---
async function connectPrinter() {
    if (isConnected && printer) return printer;

    console.log('[Agent] Connecting to local printer...');
    printer = new TremolFP();
    printer.ServerSetSettings(CONFIG.ZFPLAB_HOST, CONFIG.ZFPLAB_PORT);

    try {
        // Force specific COM port for speed
        await printer.ServerSetDeviceSerialSettings(
            CONFIG.FISCAL_COM_PORT,
            CONFIG.FISCAL_BAUD_RATE,
            true
        );
        await printer.ReadStatus(); // Verify connection
        isConnected = true;
        headersNeedUpdate = true; // Force header update after reconnection
        console.log('[Agent] ✅ Printer connected!');

        // Read and display current headers from printer memory
        console.log('[Agent] Reading current headers from printer...');
        try {
            for (let i = 1; i <= 4; i++) {
                const h = await printer.ReadHeader(i.toString());
                console.log('[Agent]   Stored Line ' + i + ': "' + (h.HeaderText || '').trim() + '"');
            }
        } catch (e) {
            console.log('[Agent]   Could not read headers:', e.message);
        }

        // Program headers immediately after connection
        if (cachedCompanySettings) {
            console.log('[Agent] Programming headers after connection...');
            await programHeaders(printer, cachedCompanySettings);
        }

        return printer;
    } catch (err) {
        console.error(`[Agent] Printer connection failed: ${err.message}`);
        isConnected = false;
        throw err;
    }
}

// --- PRINTING LOGIC ---
async function printJob(job) {
    const timestamp = new Date().toISOString();
    console.log(`\n========================================`);
    console.log(`[Agent] ${timestamp}`);
    console.log(`[Agent] Processing job #${job.id} (${job.type})...`);
    console.log(`========================================\n`);

    // Infinite retry loop until success (or manual intervention)
    while (true) {
        try {
            const fp = await connectPrinter();
            const { payload } = job;

            // Ensure any open receipt is cancelled first
            try { await fp.CancelReceipt(); await new Promise(r => setTimeout(r, 100)); } catch { }

            // Get company settings from payload or cache
            const settings = payload.companySettings || cachedCompanySettings;
            if (payload.companySettings) {
                cachedCompanySettings = payload.companySettings;
            }

            // Always program headers before receipts
            if (settings && (job.type === 'receipt' || job.type === 'storno' || headersNeedUpdate)) {
                await programHeaders(fp, settings);
            }

            if (job.type === 'receipt' || job.type === 'storno') {
                const isStorno = job.type === 'storno';
                const receiptType = isStorno ? '0' : '1'; // 0=Storno, 1=Sale

                // 1. Open Receipt
                let opened = false;
                let lastError = null;

                for (const pass of CONFIG.OPERATOR_PASSWORDS) {
                    try {
                        await fp.OpenReceiptOrStorno(1, pass, receiptType, '0');
                        opened = true;
                        break;
                    } catch (err) {
                        lastError = err;
                    }
                }

                if (!opened) {
                    // Provide the specific error if available, otherwise generic
                    const msg = lastError ? lastError.message : `Invalid operator password for ${job.type}`;
                    throw new Error(msg);
                }

                // 2. Add Items
                console.log(`[Agent] Printing ${payload.items.length} items (${isStorno ? 'STORNO' : 'SALE'}):`);
                for (const item of payload.items) {
                    const name = (item.name || 'Item').substring(0, 36);
                    const price = parseFloat(item.cartPrice || item.price || 0);
                    const qty = parseFloat(item.cartQty || item.quantity || 1);
                    console.log(`[Agent]   -> "${name}" price=${price} (cartPrice=${item.cartPrice}, price=${item.price}) qty=${qty}`);
                    await fp.SellPLUwithSpecifiedVAT(name, 'А', price, '1', qty);
                }

                // 3. Payment & Close
                const payType = payload.paymentMethod === 'card' ? '1' : '0';
                try {
                    const total = await fp.Subtotal(1, 1);
                    await fp.Payment(payType, '0', total);
                } catch {
                    await fp.PayExactSum(payType);
                }
                await fp.CloseReceipt();
            }
            else if (job.type === 'zreport') {
                await fp.PrintDailyReport('Z');

                // CRITICAL: Program headers IMMEDIATELY after Z-report
                // This is when the fiscal day is CLOSED and headers can be
                // saved PERMANENTLY to the printer's non-volatile memory.
                console.log('[Agent] Z-Report complete. Programming headers permanently...');
                await new Promise(r => setTimeout(r, 1000)); // Wait for printer to finish

                const settings = cachedCompanySettings;
                if (settings) {
                    const success = await programHeaders(fp, settings, true); // force=true
                    if (success) {
                        // Verify by reading back
                        try {
                            const h4 = await fp.ReadHeader('4');
                            console.log('[Agent] ✅ Verified Line 4 saved:', h4.HeaderText || '(empty)');
                        } catch (e) {
                            console.log('[Agent] Could not verify header:', e.message);
                        }
                    }
                } else {
                    // Try to get settings from API as fallback
                    await fetchCompanySettings();
                    if (cachedCompanySettings) {
                        await programHeaders(fp, cachedCompanySettings, true);
                    }
                }
            }
            else if (job.type === 'xreport') {
                await fp.PrintDailyReport('X');
            }
            else if (job.type === 'setheaders') {
                // Manual header programming - only works when day is closed!
                const settings = payload.companySettings || cachedCompanySettings;
                if (settings) {
                    await programHeaders(fp, settings, true); // force=true
                }
            }
            else if (job.type === 'cash') {
                const amount = parseFloat(payload.amount || 0);
                if (payload.action === 'in') {
                    // Cash In (Received on Account)
                    await fp.do('ReceivedOnAccount', 'Amount', amount);
                } else if (payload.action === 'out') {
                    // Cash Out (Paid Out)
                    await fp.do('PaidOut', 'Amount', amount);
                }
            }

            // Report Success
            await apiRequest('PUT', `/api/fiscal-print/jobs/${job.id}/complete`);
            console.log(`[Agent] ✅ Job #${job.id} DONE`);
            return; // Exit the function (and loop)

        } catch (error) {
            console.error(`[Agent] ⚠️ Job #${job.id} failed: ${error.message}`);
            console.log(`[Agent] Retrying in 5 seconds... (Printer might be offline)`);

            // Wait 5 seconds before retrying
            await new Promise(r => setTimeout(r, 5000));

            // Force printer reconnection next attempt
            isConnected = false;
            printer = null;
        }
    }
}

// --- MAIN LOOP ---
async function start() {
    while (true) {
        try {
            if (!CONFIG.AUTH_TOKEN) {
                console.error('[Agent] SERVICE_AUTH_TOKEN missing in .env!');
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            // 1. Claim Job
            const res = await apiRequest('POST', '/api/fiscal-print/jobs/claim');

            if (res && res.job) {
                await printJob(res.job);
            } else {
                // No job, wait
                process.stdout.write('.');
            }
        } catch (err) {
            console.error(`\n[Agent] Poll error: ${err.message}`);
            // Wait longer on error (e.g. internet down)
            await new Promise(r => setTimeout(r, 5000));
        }

        // Poll interval
        await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL));
    }
}

start();
