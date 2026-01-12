import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCompanySettings } from './CompanySettingsContext';
import { fiscalPrintAPI } from '../services/api';

const FiscalPrinterContext = createContext(null);

// Operator configuration
const OPERATOR_NUMBER = 1;
const OPERATOR_PASSWORDS = ["0 ", "0000", "1   ", "0001"]; // Self-healing password list

// Connection pooling configuration
const HEALTH_CHECK_INTERVAL = 5000; // 5 seconds
const CONNECTION_TIMEOUT = 30000; // 30 seconds

// Helper function to center text for fiscal printer (48 character width for 80mm paper)
const centerText = (text, width = 48) => {
  if (!text || text.trim().length === 0) return ' '.repeat(width);
  const trimmedText = text.trim();
  if (trimmedText.length >= width) return trimmedText.substring(0, width);
  const leftPad = Math.floor((width - trimmedText.length) / 2);
  const rightPad = width - trimmedText.length - leftPad;
  return " ".repeat(Math.max(0, leftPad)) + trimmedText + " ".repeat(Math.max(0, rightPad));
};



// Generate a simple device ID for tracking
const getDeviceId = () => {
  let deviceId = localStorage.getItem('fiscal_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('fiscal_device_id', deviceId);
  }
  return deviceId;
};

export function FiscalPrinterProvider({ children }) {
  const { settings: companySettings } = useCompanySettings();
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Connection pooling state
  const connectionPool = useRef({
    fp: null,              // Tremol FP instance (reused)
    deviceInfo: null,      // Cached device info (COM port, baud rate)
    lastHeader: null,      // Cached header text (company name + address)
    lastHealthCheck: 0,    // Timestamp of last health check
    isConnecting: false    // Connection lock flag
  });

  const autoConnectAttemptedRef = useRef(false);

  // Get or create the Tremol.FP instance with connection pooling
  const getFP = useCallback(() => {
    // Reuse existing FP instance if available
    if (connectionPool.current.fp) {
      return connectionPool.current.fp;
    }

    // Create new instance if SDK is available
    if (window.Tremol?.FP) {
      connectionPool.current.fp = new window.Tremol.FP();
    }

    return connectionPool.current.fp;
  }, []);

  // Quick health check for connection pooling
  const isConnectionHealthy = useCallback(() => {
    const fp = connectionPool.current.fp;
    if (!fp) return false;

    try {
      const status = fp.ReadStatus();
      return status !== null && status !== undefined;
    } catch (e) {
      return false;
    }
  }, []);

  // Connect to ZFPLab Server with connection pooling
  const connectServer = useCallback(async () => {
    // Prevent concurrent connection attempts
    if (connectionPool.current.isConnecting) {
      return { success: false, error: 'Connection in progress' };
    }

    setIsLoading(true);
    setLastError(null);
    connectionPool.current.isConnecting = true;

    try {
      const fp = getFP();
      if (!fp) {
        throw new Error('Fiscal printer SDK not loaded');
      }
      fp.ServerSetSettings("http://localhost", 4444);
      setIsServerConnected(true);
      return { success: true };
    } catch (error) {
      setLastError(error.message);
      setIsServerConnected(false);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
      connectionPool.current.isConnecting = false;
    }
  }, [getFP]);

  // Find and connect to the printer with connection pooling
  const connectPrinter = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const fp = getFP();
      if (!fp) {
        throw new Error('Fiscal printer SDK not loaded');
      }

      // Ensure server is connected first
      if (!isServerConnected) {
        console.log('Connection pool: Server not connected, connecting first...');
        const serverResult = await connectServer();
        if (!serverResult.success) {
          throw new Error('Failed to connect to ZFPLab Server. Please ensure ZFPLab Server is running on localhost:4444');
        }
      }

      const now = Date.now();

      // FAST PATH: Reuse if recently checked (< 5s ago) and connection healthy
      if (connectionPool.current.deviceInfo &&
        (now - connectionPool.current.lastHealthCheck) < HEALTH_CHECK_INTERVAL) {
        if (isPrinterConnected && isConnectionHealthy()) {
          console.log('Connection pool: Fast path - using cached connection');
          return { success: true, device: connectionPool.current.deviceInfo };
        }
      }

      // MEDIUM PATH: Quick health check if we have device info
      if (connectionPool.current.deviceInfo && isConnectionHealthy()) {
        console.log('Connection pool: Medium path - connection healthy');
        connectionPool.current.lastHealthCheck = now;
        setIsPrinterConnected(true);
        return { success: true, device: connectionPool.current.deviceInfo };
      }

      // SLOW PATH: Full reconnection (only when necessary)
      console.log('Connection pool: Slow path - full reconnection');

      // Use cached device info if available, otherwise scan
      let device = connectionPool.current.deviceInfo;
      if (!device) {
        console.log('Connection pool: Scanning for device...');
        try {
          // Wrap in try-catch as ServerFindDevice might throw or hang
          device = fp.ServerFindDevice();
          if (device) {
            connectionPool.current.deviceInfo = device; // Cache it
            console.log('Connection pool: Device cached:', device);
          } else {
            console.log('Connection pool: No device found by ServerFindDevice');
          }
        } catch (scanError) {
          console.error('Connection pool: Error scanning for device:', scanError);
          throw new Error(`Failed to scan for printer: ${scanError.message || 'Device not found. Please ensure ZFPLab Server is running and printer is connected.'}`);
        }
      }

      if (device) {
        try {
          fp.ServerSetDeviceSerialSettings(device.serialPort, device.baudRate, true);
          // Verify connection with a status read
          const status = fp.ReadStatus();
          if (!status) {
            throw new Error('Printer connection verification failed');
          }
          connectionPool.current.lastHealthCheck = now;
          setIsPrinterConnected(true);

          // Update headers with caching
          await updatePrinterHeadersInternal(fp);

          return { success: true, device };
        } catch (connectionError) {
          console.error('Connection pool: Error setting up device:', connectionError);
          // Clear cached device on connection error
          connectionPool.current.deviceInfo = null;
          throw new Error(`Failed to connect to printer: ${connectionError.message || 'Please check printer connection and ZFPLab Server status.'}`);
        }
      } else {
        throw new Error('No printer device found. Please ensure ZFPLab Server is running and the fiscal printer is connected via USB/Serial.');
      }
    } catch (error) {
      setLastError(error.message);
      setIsPrinterConnected(false);
      // Clear cached device info on error
      connectionPool.current.deviceInfo = null;
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [getFP, isPrinterConnected, isConnectionHealthy, isServerConnected, connectServer]);

  // Internal header update with caching
  const updatePrinterHeadersInternal = useCallback(async (fp) => {
    const companyName = companySettings?.name || 'Argjira';
    const address = companySettings?.address || '';
    const tvshNumber = companySettings?.tvsh_number || '';
    const taxNumber = companySettings?.nipt || companySettings?.tax_number || '';
    const headerKey = `${companyName}|${address}|${tvshNumber}|${taxNumber}|4line_v2`;

    // Skip if header hasn't changed
    if (connectionPool.current.lastHeader === headerKey) {
      console.log('Connection pool: Headers unchanged, skipping');
      return;
    }

    try {
      console.log('Connection pool: Updating 4-line header layout:', { companyName, address, tvshNumber, taxNumber });

      const combinedIds = (tvshNumber && taxNumber)
        ? `TVSH: ${tvshNumber}  NIPT: ${taxNumber}`
        : (tvshNumber ? `TVSH: ${tvshNumber}` : (taxNumber ? `NIPT: ${taxNumber}` : ' '));

      // 4-Line Layout implementation
      // Line 1: Name
      fp.ProgHeader('1', centerText(companyName));
      // Line 2: Address
      fp.ProgHeader('2', centerText(address));
      // Line 3: Blank
      fp.ProgHeader('3', ' ');
      // Line 4: TVSH & NIPT Combined
      fp.ProgHeader('4', centerText(combinedIds));

      // Clear lines 5-8 for a clean header
      for (let i = 5; i <= 8; i++) {
        fp.ProgHeader(i.toString(), ' ');
      }

      connectionPool.current.lastHeader = headerKey; // Cache it
      console.log('Connection pool: 4-line header updated and cached');
    } catch (headerError) {
      console.warn('Failed to update printer headers:', headerError);
    }
  }, [companySettings]);

  // Reset connection pool (force fresh connection on next print)
  const resetConnection = useCallback(() => {
    connectionPool.current = {
      fp: null,
      deviceInfo: null,
      lastHeader: null,
      lastHealthCheck: 0,
      isConnecting: false
    };
    setIsServerConnected(false);
    setIsPrinterConnected(false);
    console.log('Connection pool: Reset complete');
  }, []);

  // Helper function to check and close any open receipt
  const ensureReceiptClosed = useCallback(async () => {
    const fp = getFP();
    if (!fp) return false;

    try {
      fp.CloseNonFiscReceipt();
    } catch (e) {
      // Ignore if not open
    }

    let receiptWasOpen = false;
    let receiptInfo = null;

    try {
      const status = fp.ReadStatus();
      const isFiscalOpen =
        status.OptionFiscalReceiptOpen === 1 ||
        status.OptionFiscalReceiptOpen === true ||
        status.Opened_Fiscal_Receipt === 1 ||
        status.Opened_Fiscal_Receipt === true;

      if (isFiscalOpen) {
        receiptWasOpen = true;
      }
    } catch (e) {
      // Continue
    }

    try {
      receiptInfo = fp.ReadCurrentRecInfo();
      if (receiptInfo.OptionIsReceiptOpened === 1 || receiptInfo.OptionIsReceiptOpened === '1') {
        receiptWasOpen = true;
      }
    } catch (e) {
      if (!receiptWasOpen) {
        return true;
      }
    }

    if (!receiptWasOpen) {
      return true;
    }

    // Close methods
    if (receiptInfo && (receiptInfo.OptionFinalizedPayment === 1 || receiptInfo.OptionFinalizedPayment === '1')) {
      try {
        fp.CloseReceipt();
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 200ms
        return true;
      } catch (e) {
        console.warn('Failed to close finalized receipt:', e);
      }
    }

    try {
      fp.CashPayCloseReceipt();
      await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 200ms
      return true;
    } catch (e) {
      console.warn('CashPayCloseReceipt failed:', e);
    }

    try {
      const sub = fp.Subtotal(1, 1);
      if (sub > 0) {
        fp.PayExactSum("0");
      }
      fp.CloseReceipt();
      await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 200ms
      return true;
    } catch (e) {
      console.warn('Pay and close failed:', e);
    }

    try {
      fp.CloseReceipt();
      await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 200ms
      return true;
    } catch (e) {
      console.warn('Direct close failed:', e);
    }

    try {
      fp.DirectCommand(";");
      await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 200ms
      return true;
    } catch (e) {
      console.error('Emergency cancel failed:', e);
      return false;
    }
  }, [getFP]);

  // Direct printing function (used by print server)
  const printReceiptDirect = useCallback(async (items, paymentMethod = 'cash') => {
    setIsLoading(true);
    setLastError(null);

    try {
      const fp = getFP();
      if (!fp) {
        throw new Error('Fiscal printer SDK not loaded');
      }

      if (!isPrinterConnected) {
        throw new Error('Printer not connected');
      }

      await ensureReceiptClosed();
      await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 300ms

      // Verify receipt is closed
      try {
        const status = fp.ReadStatus();
        const isStillOpen =
          status.OptionFiscalReceiptOpen === 1 ||
          status.OptionFiscalReceiptOpen === true ||
          status.Opened_Fiscal_Receipt === 1 ||
          status.Opened_Fiscal_Receipt === true;

        if (isStillOpen) {
          console.warn('Receipt still appears open, trying force close');
          await ensureReceiptClosed();
          await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 500ms
        }
      } catch (e) {
        console.warn('Could not verify receipt status:', e);
      }

      // Open receipt with self-healing password logic
      let opened = false;

      for (const pass of OPERATOR_PASSWORDS) {
        try {
          fp.OpenReceiptOrStorno(OPERATOR_NUMBER, pass, '1', '0');
          opened = true;
          break;
        } catch (e) {
          const errorMsg = e.message || '';
          const errorStr = errorMsg.toLowerCase();

          const isReceiptOpenError =
            errorStr.includes("already open") ||
            errorStr.includes("0x35") ||
            errorStr.includes("illegal") ||
            errorStr.includes("command: illegal") ||
            errorStr.includes("receipt open") ||
            errorMsg.includes("0x32");

          if (isReceiptOpenError) {
            console.log('Receipt open error detected, attempting to close:', errorMsg);
            await ensureReceiptClosed();
            await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 300ms

            try {
              fp.OpenReceiptOrStorno(OPERATOR_NUMBER, pass, '1', '0');
              opened = true;
              break;
            } catch (e2) {
              console.warn('Retry after close failed:', e2.message);
              await ensureReceiptClosed();
              await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 300ms
              try {
                fp.OpenReceiptOrStorno(OPERATOR_NUMBER, pass, '1', '0');
                opened = true;
                break;
              } catch (e3) {
                throw new Error(`Failed to open receipt after recovery attempts: ${e3.message}`);
              }
            }
          }

          const isPasswordError =
            errorStr.includes("password") ||
            errorStr.includes("0x39") ||
            errorStr.includes("invalid password");

          if (isPasswordError) {
            continue;
          }

          throw e;
        }
      }

      if (!opened) {
        throw new Error("Operator login failed - invalid password");
      }

      // Register items
      for (const item of items) {
        const itemName = (item.name || 'Artikull').substring(0, 20);
        const vatClass = 'А';
        const price = parseFloat(item.cartPrice) || 0;
        const quantity = parseFloat(item.cartQty) || 1;

        fp.SellPLUwithSpecifiedVAT(itemName, vatClass, price, '1', quantity);
      }

      // Payment
      try {
        const hwTotal = fp.Subtotal(1, 1);
        const paymentType = paymentMethod === 'card' ? 1 : 0;
        fp.Payment(paymentType, 0, hwTotal);
      } catch (e) {
        const paymentType = paymentMethod === 'card' ? '1' : '0';
        fp.PayExactSum(paymentType);
      }

      // Close receipt
      fp.CloseReceipt();

      // Update health check timestamp
      connectionPool.current.lastHealthCheck = Date.now();

      return { success: true };
    } catch (error) {
      setLastError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [getFP, isPrinterConnected, ensureReceiptClosed]);

  // Queue-based printing (submits job to API)
  const printReceiptQueued = useCallback(async (items, paymentMethod = 'cash', fiscalSaleId = null) => {
    setIsLoading(true);
    setLastError(null);

    try {
      const response = await fiscalPrintAPI.submitJob({
        type: 'receipt',
        payload: {
          items: items.map(item => ({
            name: item.name,
            cartPrice: item.cartPrice,
            cartQty: item.cartQty
          })),
          paymentMethod
        },
        device_id: getDeviceId(),
        fiscal_sale_id: fiscalSaleId
      });

      if (response.data.success) {
        return {
          success: true,
          jobId: response.data.job.id,
          queued: true,
          message: 'Print job submitted to queue'
        };
      } else {
        throw new Error('Failed to submit print job');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setLastError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Main print receipt function - always uses queued printing (background service)
  const printReceipt = useCallback(async (items, paymentMethod = 'cash', fiscalSaleId = null) => {
    return printReceiptQueued(items, paymentMethod, fiscalSaleId);
  }, [printReceiptQueued]);

  // Direct storno printing (print server only)
  const printStornoReceiptDirect = useCallback(async (items, paymentMethod = 'cash') => {
    setIsLoading(true);
    setLastError(null);

    try {
      const fp = getFP();
      if (!fp) {
        throw new Error('Fiscal printer SDK not loaded');
      }

      if (!isPrinterConnected) {
        throw new Error('Printer not connected');
      }

      await ensureReceiptClosed();
      await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 300ms

      try {
        const status = fp.ReadStatus();
        const isStillOpen =
          status.OptionFiscalReceiptOpen === 1 ||
          status.OptionFiscalReceiptOpen === true ||
          status.Opened_Fiscal_Receipt === 1 ||
          status.Opened_Fiscal_Receipt === true;

        if (isStillOpen) {
          console.warn('Receipt still appears open, trying force close');
          await ensureReceiptClosed();
          await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 500ms
        }
      } catch (e) {
        console.warn('Could not verify receipt status:', e);
      }

      // Open storno receipt
      let opened = false;

      for (const pass of OPERATOR_PASSWORDS) {
        try {
          fp.OpenReceiptOrStorno(OPERATOR_NUMBER, pass, '0', '0');
          opened = true;
          break;
        } catch (e) {
          const errorMsg = e.message || '';
          const errorStr = errorMsg.toLowerCase();

          const isReceiptOpenError =
            errorStr.includes("already open") ||
            errorStr.includes("0x35") ||
            errorStr.includes("illegal") ||
            errorStr.includes("command: illegal") ||
            errorStr.includes("receipt open") ||
            errorMsg.includes("0x32");

          if (isReceiptOpenError) {
            console.log('Receipt open error detected, attempting to close:', errorMsg);
            await ensureReceiptClosed();
            await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 300ms

            try {
              fp.OpenReceiptOrStorno(OPERATOR_NUMBER, pass, '0', '0');
              opened = true;
              break;
            } catch (e2) {
              console.warn('Retry after close failed:', e2.message);
              await ensureReceiptClosed();
              await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 300ms
              try {
                fp.OpenReceiptOrStorno(OPERATOR_NUMBER, pass, '0', '0');
                opened = true;
                break;
              } catch (e3) {
                throw new Error(`Failed to open storno receipt after recovery attempts: ${e3.message}`);
              }
            }
          }

          const isPasswordError =
            errorStr.includes("password") ||
            errorStr.includes("0x39") ||
            errorStr.includes("invalid password");

          if (isPasswordError) {
            continue;
          }

          throw e;
        }
      }

      if (!opened) {
        throw new Error("Operator login failed - invalid password");
      }

      // Register items
      for (const item of items) {
        const itemName = (item.name || 'Artikull').substring(0, 20);
        const vatClass = 'А';
        const price = parseFloat(item.cartPrice) || 0;
        const quantity = parseFloat(item.cartQty) || 1;

        fp.SellPLUwithSpecifiedVAT(itemName, vatClass, price, '1', quantity);
      }

      // Payment
      try {
        const hwTotal = fp.Subtotal(1, 1);
        const paymentType = paymentMethod === 'card' ? 1 : 0;
        fp.Payment(paymentType, 0, hwTotal);
      } catch (e) {
        const paymentType = paymentMethod === 'card' ? '1' : '0';
        fp.PayExactSum(paymentType);
      }

      // Close receipt
      fp.CloseReceipt();

      connectionPool.current.lastHealthCheck = Date.now();

      return { success: true };
    } catch (error) {
      setLastError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [getFP, isPrinterConnected, ensureReceiptClosed]);

  // Queue-based storno printing
  const printStornoReceiptQueued = useCallback(async (items, paymentMethod = 'cash', fiscalSaleId = null) => {
    setIsLoading(true);
    setLastError(null);

    try {
      const response = await fiscalPrintAPI.submitJob({
        type: 'storno',
        payload: {
          items: items.map(item => ({
            name: item.name,
            cartPrice: item.cartPrice,
            cartQty: item.cartQty
          })),
          paymentMethod
        },
        device_id: getDeviceId(),
        fiscal_sale_id: fiscalSaleId
      });

      if (response.data.success) {
        return {
          success: true,
          jobId: response.data.job.id,
          queued: true,
          message: 'Storno job submitted to queue'
        };
      } else {
        throw new Error('Failed to submit storno job');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setLastError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Main storno receipt function - always uses queued printing (background service)
  const printStornoReceipt = useCallback(async (items, paymentMethod = 'cash', fiscalSaleId = null) => {
    return printStornoReceiptQueued(items, paymentMethod, fiscalSaleId);
  }, [printStornoReceiptQueued]);

  // Cancel active receipt
  const cancelReceipt = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const fp = getFP();
      if (!fp) {
        throw new Error('Fiscal printer SDK not loaded');
      }

      if (!isPrinterConnected) {
        throw new Error('Printer not connected');
      }

      try {
        const status = fp.ReadStatus();
        const blockers = [];
        if (status.Printer_not_ready_no_paper) blockers.push('No paper');
        if (status.Printer_not_ready_overheat) blockers.push('Printer overheated');
        if (status.DateTime_not_set) blockers.push('Date/time not set');
        if (status.FM_full) blockers.push('Fiscal memory full');
        if (status.Blocking_after_24_hours_without_report) blockers.push('24h timeout - need Z-report');

        if (blockers.length > 0) {
          console.warn('Printer has blocking conditions:', blockers);
        }
      } catch (e) {
        console.warn('Could not check printer status:', e.message || e);
      }

      try {
        fp.CloseNonFiscReceipt();
      } catch (e) {
        // Ignore
      }

      let receiptIsOpen = false;
      let receiptInfo = null;

      try {
        const status = fp.ReadStatus();
        receiptIsOpen =
          status.OptionFiscalReceiptOpen === 1 ||
          status.OptionFiscalReceiptOpen === true ||
          status.Opened_Fiscal_Receipt === 1 ||
          status.Opened_Fiscal_Receipt === true;
      } catch (e) {
        console.warn('ReadStatus failed:', e.message || e);
      }

      try {
        receiptInfo = fp.ReadCurrentRecInfo();
        if (receiptInfo && (receiptInfo.OptionIsReceiptOpened === 1 || receiptInfo.OptionIsReceiptOpened === '1')) {
          receiptIsOpen = true;
        }
      } catch (e) {
        // Continue
      }

      if (!receiptIsOpen) {
        return {
          success: true,
          message: 'No active receipt found to cancel',
          wasOpen: false
        };
      }

      let canceled = false;
      let cancelMessage = '';

      // Method 1: Close finalized payment
      try {
        if (receiptInfo && receiptInfo.OptionIsReceiptOpened === 1 && receiptInfo.OptionFinalizedPayment === 1) {
          fp.CloseReceipt();
          canceled = true;
          cancelMessage = 'Closed finalized receipt';
        }
      } catch (e) {
        console.warn('Method 1 failed:', e.message || e);
      }

      // Method 2: Pay and close
      if (!canceled) {
        try {
          try {
            const sub = fp.Subtotal(1, 1);
            if (sub > 0) {
              fp.PayExactSum("1");
            }
          } catch (err) {
            fp.PayExactSum("1");
          }
          fp.CloseReceipt();
          canceled = true;
          cancelMessage = 'Paid and closed receipt';
        } catch (e) {
          console.warn('Method 2 failed:', e.message || e);
        }
      }

      // Method 3: Emergency cancel
      if (!canceled) {
        try {
          fp.DirectCommand(";");
          canceled = true;
          cancelMessage = 'Canceled using emergency DirectCommand';
        } catch (e) {
          console.error('Method 3 failed:', e.message || e);
        }
      }

      if (canceled) {
        return {
          success: true,
          message: `Fiskalizimi aktiv u anulua me sukses (${cancelMessage})`,
          wasOpen: true
        };
      } else {
        throw new Error('Failed to cancel receipt. All methods failed.');
      }
    } catch (error) {
      let errorMessage = error.message || String(error);
      setLastError(errorMessage);
      return { success: false, error: errorMessage, wasOpen: true };
    } finally {
      setIsLoading(false);
    }
  }, [getFP, isPrinterConnected]);

  // Print X Report (day status) - direct only
  const printXReport = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const fp = getFP();
      if (!fp) throw new Error('Fiscal printer SDK not loaded');

      fp.PrintDailyReport("X");
      return { success: true };
    } catch (error) {
      setLastError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [getFP]);

  // Print Z Report - direct for print server, queued otherwise
  const printZReportDirect = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const fp = getFP();
      if (!fp) {
        throw new Error('Fiscal printer SDK not loaded');
      }

      if (!isPrinterConnected) {
        throw new Error('Printer not connected');
      }

      await ensureReceiptClosed();

      try {
        const status = fp.ReadStatus();
        const blockers = [];

        if (status.OptionReportSumOverflow === 1) blockers.push("Report sum overflow");
        if (status.OptionInvalidDate === 1) blockers.push("Invalid date");
        if (status.OptionWrongLifeTime === 1) blockers.push("Wrong lifetime");
        if (status.OptionEJNearFull === 1) blockers.push("EJ near full");
        if (status.OptionEJFull === 1) blockers.push("EJ full");
        if (status.OptionFiscalMemoryNearFull === 1) blockers.push("Fiscal memory near full");
        if (status.OptionFiscalMemoryFull === 1) blockers.push("Fiscal memory full");
        if (status.OptionNonFiscalReceiptOpen === 1) blockers.push("Non-fiscal receipt open");
        if (status.OptionFiscalReceiptOpen === 1) {
          await ensureReceiptClosed();
          const status2 = fp.ReadStatus();
          if (status2.OptionFiscalReceiptOpen === 1) {
            blockers.push("Fiscal receipt open - please close manually");
          }
        }

        if (blockers.length > 0) {
          throw new Error(`Printer not ready: ${blockers.join(", ")}`);
        }
      } catch (statusError) {
        console.warn('Status check failed, attempting to print anyway:', statusError);
      }

      fp.PrintDailyReport("Z");
      return { success: true };
    } catch (error) {
      setLastError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [getFP, isPrinterConnected, ensureReceiptClosed]);

  const printZReportQueued = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const response = await fiscalPrintAPI.submitJob({
        type: 'zreport',
        payload: {},
        device_id: getDeviceId(),
        priority: 1 // High priority for Z-report
      });

      if (response.data.success) {
        return {
          success: true,
          jobId: response.data.job.id,
          queued: true,
          message: 'Z-Report job submitted to queue'
        };
      } else {
        throw new Error('Failed to submit Z-report job');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setLastError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const printZReport = useCallback(async () => {
    return printZReportQueued();
  }, [printZReportQueued]);

  // Check printer status
  const checkStatus = useCallback(async () => {
    try {
      const fp = getFP();
      if (!fp) throw new Error('Fiscal printer SDK not loaded');

      const status = fp.ReadStatus();
      const blockers = [];

      if (status.Opened_Fiscal_Receipt) blockers.push("FISCAL RECEIPT OPEN");
      if (status.Opened_Non_fiscal_Receipt) blockers.push("NON-FISCAL RECEIPT OPEN");
      if (status.Printer_not_ready_no_paper) blockers.push("OUT OF PAPER");
      if (status.Blocking_after_24_hours_without_report) blockers.push("24h TIMEOUT (Need Z-Report)");
      if (status.FM_full) blockers.push("FISCAL MEMORY FULL");

      return {
        success: true,
        isReady: blockers.length === 0,
        blockers,
        status
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [getFP]);

  // Update printer headers (explicit call)
  const updatePrinterHeaders = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const fp = getFP();
      if (!fp) throw new Error('Fiscal printer SDK not loaded');
      if (!isPrinterConnected) throw new Error('Printer not connected');

      await ensureReceiptClosed();

      // Force header update by clearing cache
      connectionPool.current.lastHeader = null;
      await updatePrinterHeadersInternal(fp);

      return { success: true, message: 'Headers updated successfully' };
    } catch (error) {
      setLastError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [getFP, isPrinterConnected, ensureReceiptClosed, updatePrinterHeadersInternal]);

  // Force close / recovery function
  const forceClose = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const fp = getFP();
      if (!fp) {
        throw new Error('Fiscal printer SDK not loaded');
      }

      let recovered = false;

      try { fp.CloseNonFiscReceipt(); } catch (e) { /* ignore */ }

      try {
        const info = fp.ReadCurrentRecInfo();
        if (info.OptionIsReceiptOpened === 1 && info.OptionFinalizedPayment === 1) {
          fp.CloseReceipt();
          recovered = true;
        }
      } catch (e) { /* ignore */ }

      if (!recovered) {
        try {
          try {
            const sub = fp.Subtotal(1, 1);
            if (sub > 0) fp.PayExactSum("0");
          } catch (err) {
            fp.PayExactSum("0");
          }
          fp.CloseReceipt();
          recovered = true;
        } catch (e) { /* continue */ }
      }

      if (!recovered) {
        try {
          fp.DirectCommand(";");
          recovered = true;
        } catch (e) { /* ignore */ }
      }

      if (recovered) {
        return { success: true, message: 'Device recovered successfully' };
      } else {
        throw new Error('Auto-recovery failed. Please turn the printer OFF and ON.');
      }
    } catch (error) {
      setLastError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [getFP]);

  // Auto-connect to printer when SDK is available (runs once on mount)
  // Only auto-connect on print server page
  useEffect(() => {
    if (autoConnectAttemptedRef.current) {
      return;
    }
    autoConnectAttemptedRef.current = true;
    // Auto-connect removed - background service handles printing
  }, []);

  const value = {
    // Connection state
    isServerConnected,
    isPrinterConnected,
    isLoading,
    lastError,

    // Connection management
    connectServer,
    connectPrinter,
    resetConnection,

    // Printing functions
    printReceipt,
    printReceiptDirect, // Exposed for print server
    printStornoReceipt,
    printStornoReceiptDirect, // Exposed for print server
    printXReport,
    printZReport,
    printZReportDirect, // Exposed for print server

    // Recovery functions
    forceClose,
    cancelReceipt,
    checkStatus,
    updatePrinterHeaders,

    // Connection pool info (for debugging)
    getConnectionPoolInfo: () => ({
      hasDevice: !!connectionPool.current.deviceInfo,
      lastHealthCheck: connectionPool.current.lastHealthCheck,
      headerCached: !!connectionPool.current.lastHeader
    })
  };

  return (
    <FiscalPrinterContext.Provider value={value}>
      {children}
    </FiscalPrinterContext.Provider>
  );
}

export function useFiscalPrinter() {
  const context = useContext(FiscalPrinterContext);
  if (!context) {
    throw new Error('useFiscalPrinter must be used within a FiscalPrinterProvider');
  }
  return context;
}
