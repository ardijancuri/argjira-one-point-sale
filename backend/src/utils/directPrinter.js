/**
 * Direct Fiscal Printer Integration
 * 
 * This module provides DIRECT printing to the fiscal printer without needing
 * a separate print service. Perfect for local development and simple setups.
 * 
 * Just run: npm run dev
 * 
 * The printer will be accessed directly through ZFPLab when sales are made.
 */

import { TremolFP, centerText } from '../lib/tremolAdapter.js';

// Configuration from environment
const CONFIG = {
    ZFPLAB_HOST: process.env.ZFPLAB_HOST || 'localhost',
    ZFPLAB_PORT: parseInt(process.env.ZFPLAB_PORT || '4444'),
    FISCAL_COM_PORT: process.env.FISCAL_COM_PORT || null,  // e.g., 'COM4'
    FISCAL_BAUD_RATE: parseInt(process.env.FISCAL_BAUD_RATE || '115200'),
    ENABLED: process.env.DIRECT_PRINT_ENABLED !== 'false', // Enabled by default
    OPERATOR_NUMBER: 1,
    OPERATOR_PASSWORDS: ['0 ', '0000', '1   ', '0001'],
};

// Connection state (kept alive for performance)
let fp = null;
let isConnected = false;
let lastConnectionAttempt = 0;

/**
 * Get or create printer connection
 */
async function getConnection() {
    // If connected, return existing connection
    if (fp && isConnected) {
        try {
            await fp.ReadStatus();
            return fp;
        } catch {
            isConnected = false;
        }
    }

    // Avoid rapid reconnection attempts
    const now = Date.now();
    if (now - lastConnectionAttempt < 2000) {
        throw new Error('Printer reconnection in progress, please wait...');
    }
    lastConnectionAttempt = now;

    // Create new connection
    console.log('[DirectPrinter] Connecting to ZFPLab...');
    fp = new TremolFP();
    fp.ServerSetSettings(CONFIG.ZFPLAB_HOST, CONFIG.ZFPLAB_PORT);

    // Check ZFPLab is accessible
    try {
        await fp._request('GET', '/');
    } catch (error) {
        throw new Error(`ZFPLab server not accessible at ${CONFIG.ZFPLAB_HOST}:${CONFIG.ZFPLAB_PORT}`);
    }

    // Use configured COM port or auto-detect
    let deviceInfo;
    if (CONFIG.FISCAL_COM_PORT) {
        deviceInfo = {
            serialPort: CONFIG.FISCAL_COM_PORT,
            baudRate: CONFIG.FISCAL_BAUD_RATE
        };
        console.log(`[DirectPrinter] Using configured port: ${CONFIG.FISCAL_COM_PORT} @ ${CONFIG.FISCAL_BAUD_RATE}`);
    } else {
        deviceInfo = await fp.ServerFindDevice();
        if (!deviceInfo) {
            throw new Error('No fiscal printer found. Set FISCAL_COM_PORT=COM8 in .env');
        }
        console.log(`[DirectPrinter] Auto-detected: ${deviceInfo.serialPort} @ ${deviceInfo.baudRate}`);
    }

    // Configure serial connection
    await fp.ServerSetDeviceSerialSettings(
        deviceInfo.serialPort,
        deviceInfo.baudRate,
        true // Keep port open
    );

    // Verify connection
    await fp.ReadStatus();
    isConnected = true;
    console.log(`[DirectPrinter] ✅ Connected to ${deviceInfo.serialPort}`);

    return fp;
}

/**
 * Ensure any open receipt is closed before starting new operation
 */
async function ensureReceiptClosed(printer) {
    try {
        const info = await printer.ReadCurrentRecInfo();
        if (info && info.OptionIsReceiptOpened === 1) {
            if (info.OptionFinalizedPayment === 1) {
                await printer.CloseReceipt();
            } else {
                await printer.CancelReceipt();
            }
            await sleep(50);
        }
    } catch {
        // No receipt open, ignore
    }
}

/**
 * Open fiscal receipt
 */
async function openReceipt(printer, receiptType = '1') {
    await ensureReceiptClosed(printer);
    await sleep(100);

    for (const pass of CONFIG.OPERATOR_PASSWORDS) {
        try {
            await printer.OpenReceiptOrStorno(CONFIG.OPERATOR_NUMBER, pass, receiptType, '0');
            return true;
        } catch {
            continue; // Try next password
        }
    }

    throw new Error('Failed to open receipt - operator password rejected');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Print a fiscal receipt
 * 
 * @param {Object[]} items - Array of items to print
 * @param {string} paymentMethod - 'cash' or 'card'
 * @param {Object} companySettings - Optional company settings for header
 * @returns {Object} Result with success status
 */
export async function printFiscalReceipt(items, paymentMethod = 'cash', companySettings = null) {
    if (!CONFIG.ENABLED) {
        console.log('[DirectPrinter] Disabled - skipping print');
        return { success: true, skipped: true };
    }

    if (!items || items.length === 0) {
        throw new Error('No items to print');
    }

    const printer = await getConnection();

    console.log(`[DirectPrinter] Printing receipt with ${items.length} items...`);

    // Update headers if company settings provided
    if (companySettings?.name) {
        try {
            await printer.ProgHeader('2', centerText(companySettings.name));
            if (companySettings.address) {
                await printer.ProgHeader('3', centerText(companySettings.address));
            }
        } catch {
            // Header update failed, continue anyway
        }
    }

    // Open receipt
    await openReceipt(printer, '1');
    await sleep(100);

    // Add items
    for (const item of items) {
        const itemName = (item.name || 'Item').substring(0, 36);
        const price = parseFloat(item.cartPrice || item.price || 0);
        const quantity = parseFloat(item.cartQty || item.quantity || 1);
        const vatClass = 'А';

        await printer.SellPLUwithSpecifiedVAT(itemName, vatClass, price, '1', quantity);
    }

    // Payment
    const paymentType = paymentMethod === 'card' ? '1' : '0';

    try {
        const hwTotal = await printer.Subtotal(1, 1);
        await printer.Payment(paymentType, '0', hwTotal);
    } catch {
        await printer.PayExactSum(paymentType);
    }

    // Close receipt
    await printer.CloseReceipt();
    await sleep(200);

    console.log('[DirectPrinter] ✅ Receipt printed successfully');
    return { success: true };
}

/**
 * Print a storno (refund) receipt
 */
export async function printStornoReceipt(items, paymentMethod = 'cash') {
    if (!CONFIG.ENABLED) {
        console.log('[DirectPrinter] Disabled - skipping storno');
        return { success: true, skipped: true };
    }

    const printer = await getConnection();

    console.log(`[DirectPrinter] Printing storno with ${items.length} items...`);

    await openReceipt(printer, '0'); // '0' = storno
    await sleep(100);

    for (const item of items) {
        const itemName = (item.name || 'Item').substring(0, 36);
        const price = parseFloat(item.cartPrice || item.price || 0);
        const quantity = parseFloat(item.cartQty || item.quantity || 1);
        const vatClass = 'А';

        await printer.SellPLUwithSpecifiedVAT(itemName, vatClass, price, '1', quantity);
    }

    const paymentType = paymentMethod === 'card' ? '1' : '0';

    try {
        const hwTotal = await printer.Subtotal(1, 1);
        await printer.Payment(paymentType, '0', hwTotal);
    } catch {
        await printer.PayExactSum(paymentType);
    }

    await printer.CloseReceipt();
    await sleep(200);

    console.log('[DirectPrinter] ✅ Storno printed successfully');
    return { success: true };
}

/**
 * Print Z-Report (daily closing)
 */
export async function printZReport() {
    if (!CONFIG.ENABLED) {
        return { success: true, skipped: true };
    }

    const printer = await getConnection();
    console.log('[DirectPrinter] Printing Z-Report...');

    await printer.PrintDailyReport('Z');
    await sleep(500);

    console.log('[DirectPrinter] ✅ Z-Report printed');
    return { success: true };
}

/**
 * Print X-Report (daily summary without zeroing)
 */
export async function printXReport() {
    if (!CONFIG.ENABLED) {
        return { success: true, skipped: true };
    }

    const printer = await getConnection();
    console.log('[DirectPrinter] Printing X-Report...');

    await printer.PrintDailyReport('X');
    await sleep(500);

    console.log('[DirectPrinter] ✅ X-Report printed');
    return { success: true };
}

/**
 * Check if printer is available
 */
export async function testConnection() {
    try {
        const printer = await getConnection();
        const status = await printer.ReadStatus();
        return {
            success: true,
            connected: true,
            port: CONFIG.FISCAL_COM_PORT || 'auto-detected',
            status
        };
    } catch (error) {
        return {
            success: false,
            connected: false,
            error: error.message
        };
    }
}

/**
 * Check if direct printing is enabled
 */
export function isEnabled() {
    // FORCE FALSE FOR TESTING CLOUD AGENT
    return false;
    // return CONFIG.ENABLED;
}

export default {
    printFiscalReceipt,
    printStornoReceipt,
    printZReport,
    printXReport,
    testConnection,
    isEnabled
};
