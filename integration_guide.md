# DAVID FP (Tremol ZFP) Integration Guide

This guide outlines the professional best practices for integrating the DAVID FP fiscal printer into your POS application using the ZFP SDK, based on real-world implementation findings.

---

## 1. Architecture Overview

The integration uses a **Client-Server-Device** architecture. Browsers cannot access COM ports directly, so the **ZFPLab Server** acts as the bridge.

```mermaid
graph LR
    A[Web/POS App] -- HTTP (Localhost:4444) --> B[ZFPLab Server]
    B -- COM/USB/LAN --> C[DAVID FP Printer]
```

**Key Files:**
*   `fp_core.js`: Core communication layer (DO NOT MODIFY).
*   `fp.js`: Main API wrapper (Tremol ZFP Object).
*   `ZFPLabServerWindows`: Background service installation folder.

---

## 2. Prerequisites & Setup

1.  **Run ZFPLab Server:** Ensure the middleware is running in the background. It listens on port `4444` by default.
2.  **Scripts:** Include the libraries in your HTML:
    ```html
    <script src="Libs/JS/fp_core.js"></script>
    <script src="Libs/JS/fp.js"></script>
    ```

---

## 3. Core Implementation (Sales Workflow)

### Step 1: Initialization & Connection
Always wrap your calls in `try...catch`.

```javascript
const fp = new Tremol.FP();
// Connect to the local middleware server
fp.ServerSetSettings("http://localhost", 4444);

// Find and connect to the physical serial device
const device = fp.ServerFindDevice();
if (device) {
    fp.ServerSetDeviceSerialSettings(device.serialPort, device.baudRate, true);
}
```

### Step 2: Professional Operator Login
One common pitfall is the **operator password format**. Many David FP printers require a space after the password (e.g., `"0 "` instead of `"0"`).

```javascript
// A "self-healing" login approach
const passwords = ["0 ", "0000", "1   "];
let loginSuccess = false;

for (const pass of passwords) {
    try {
        fp.OpenReceiptOrStorno(1, pass, '1', '0'); // 1=Fiscal, 0=Step-by-step
        loginSuccess = true;
        break;
    } catch (e) {
        // Continue if it's a password error, throw if it's a hardware error
    }
}
```

### Step 3: Registering Items
Names should be truncated to **20 characters**. VAT classes must match your printer's configuration (usually 'A' or 'B' in Cyrillic).

```javascript
const name = "Espresso".substring(0, 20);
const vat = Tremol.Enums.OptionVATClass.VAT_Class_A; // 'А'
const price = 120.00;
const quantity = 1;

fp.SellPLUwithSpecifiedVAT(name, vat, price, quantity);
```

### Step 4: Robust Payment & Closing
Avoid sending a manual `0` for payment amount as it may cause an "Input Register Overflow". **Always query the hardware for the exact subtotal** before finalizing.

```javascript
try {
    // 1. Ask hardware for the EXACT sum it expects
    const hwTotal = fp.Subtotal(1, 1);
    
    // 2. Pay exactly that sum (0, 0 means Cash, No Change calc)
    fp.Payment(0, 0, hwTotal); 
} catch(e) {
    // Fallback: Use automatic exact sum payment
    fp.PayExactSum("1"); 
}

fp.CloseReceipt();
```

---

## 4. Emergency Recovery (Crucial)

Fiscal printers are state-based. If a transaction crashes (paper out, power cut), the printer stays "Blocked." You MUST implement a **Force Close** recovery function.

### Standard Recovery Logic:
1.  **Close Non-Fiscal**: Ensures any open text session is ended.
2.  **Read Status**: Check if a receipt is open.
3.  **Check Payment State**: If payment is already done but receipt is still open, just call `CloseReceipt()`.
4.  **Pay Residue**: If a subtotal exists, call `PayExactSum("1")` then `CloseReceipt()`.
5.  **Direct Cancel**: Send a hardware "Cancel" command `fp.DirectCommand(";")` as a last resort.

---

## 5. Administrative Functions

### Daily Reports
*   **X-Report (Status)**: `fp.PrintDailyReport("X")` - Shows current day totals without resetting.
*   **Z-Report (End of Day)**: `fp.PrintDailyReport("Z")` - Finalizes the day and resets totals. Required every 24 hours.

### Programming Headers
To update the shop name and address stored in the printer:
```javascript
fp.ProgHeader('1', "MY SHOP NAME");
fp.ProgHeader('2', "STREET ADDRESS");
```

---

## 6. Centering for 79mm Paper

For standard 80mm/79mm thermal rolls (like the David FP), the usable width is typically **42 characters**. To center text perfectly:

```javascript
function centerText(text, width = 42) {
    if (text.length >= width) return text.substring(0, width);
    const leftPad = Math.floor((width - text.length) / 2);
    const rightPad = width - text.length - leftPad;
    return " ".repeat(leftPad) + text + " ".repeat(rightPad);
}

// Usage inside a non-fiscal receipt or manual text block
fp.PrintText(centerText("FISKALNA SMETKA"));
```

---

## Appendix: Common Error Codes
*   **0x32 (Command not allowed)**: Usually means you're trying to open a receipt when one is already open, or vice-versa.
*   **0x35 (Receipt Already Open)**: Call recovery/force close.
*   **0x37 (Bill Payment Finished)**: The printer is waiting for a `CloseReceipt()` command.
*   **0x39 (Invalid Password)**: Verify if your operator password needs trailing spaces (e.g., `"0 "`).

---

## 7. Advanced Features & Compliance

The following production-grade features are important to implement:

### Storno (Refund) Mode
To open a storno receipt, change the `OptionReceiptType` parameter in `OpenReceiptOrStorno`.
*   **Fiscal Sale:** `receiptType = '1'`
*   **Storno (Refund):** `receiptType = '0'`

### Date Formatting for Periodic Reports
The printer hardware expects dates in the format `DDMMYY` (Day, Month, Year).
```javascript
function formatFiscalDate(htmlDate) { // input: "2025-12-19"
    const parts = htmlDate.split('-');
    return parts[2] + parts[1] + parts[0].substring(2); // output: "191225"
}

// Usage
fp.PrintDetailedFMReportByDate(start, end);
```

### Granular Status Checking
Don't just check if the printer is "connected." Use `fp.ReadStatus()` to check for specific hardware blocks:
*   `sts.Printer_not_ready_no_paper`: Out of paper.
*   `sts.Blocking_after_24_hours_without_report`: Printer is locked until a Z-Report is printed.
*   `sts.Opened_Fiscal_Receipt`: A transaction is currently in progress.

### Customer Display (External)
High-quality display management requires manually padding strings to exactly 20 characters per line.
```javascript
const line1 = "THANK YOU!".padEnd(20, " ");
const line2 = " ".repeat(20);
fp.DisplayTextLines1and2(line1 + line2);

// Revert to clock after delay
setTimeout(() => fp.DisplayDateTime(), 5000);
```

---

## 8. Summary of Physical Calibration
*   **Paper Width:** 79mm (Calibrated to 42 characters).
*   **Operator Password:** Default verified as `"0 "` (trailing space is mandatory for some firmware).
*   **Protocol Port:** 4444.
*   **Baud Rate:** 115200.
