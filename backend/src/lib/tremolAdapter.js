/**
 * Tremol SDK Adapter for Node.js
 * 
 * This module provides a Node.js-compatible interface to communicate with
 * the ZFPLab server, replicating the functionality of the browser-based
 * Tremol SDK (fp_core.js and fp.js).
 * 
 * The ZFPLab server accepts HTTP requests and communicates with the
 * fiscal printer via USB/Serial.
 */

import http from 'http';

/**
 * Custom error class for Tremol/ZFPLab errors
 */
export class TremolError extends Error {
  constructor(message, code = 0, ste1 = 0, ste2 = 0) {
    super(message);
    this.name = 'TremolError';
    this.code = code;
    this.ste1 = ste1;
    this.ste2 = ste2;
  }
}

/**
 * Tremol Fiscal Printer class for Node.js
 */
export class TremolFP {
  constructor(clientId = 'ArgjiraAgent') {
    this.clientId = clientId;
    this.serverHost = 'localhost';
    this.serverPort = 4444;
    this.serverUrl = 'http://localhost:4444/';
    this.deviceInfo = null;
  }

  /**
   * Set ZFPLab server connection settings
   * @param {string} host - Server hostname or IP
   * @param {number} port - Server port (default 4444)
   */
  ServerSetSettings(host, port) {
    this.serverHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.serverPort = port || 4444;
    this.serverUrl = `http://${this.serverHost}:${this.serverPort}/`;
  }

  /**
   * Get current server settings
   */
  ServerGetSettings() {
    return {
      ipaddress: this.serverHost,
      tcpport: this.serverPort
    };
  }

  /**
   * Make HTTP request to ZFPLab server
   * @private
   */
  _request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.serverUrl);
      if (this.clientId) {
        url.searchParams.set('client', this.clientId);
      }

      const options = {
        hostname: this.serverHost,
        port: this.serverPort,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'text/plain',
        },
        timeout: 30000
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new TremolError(`HTTP error ${res.statusCode}`, res.statusCode));
            return;
          }
          resolve(body);
        });
      });

      req.on('error', (err) => {
        reject(new TremolError(`Connection error: ${err.message}`, -1));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new TremolError('Request timeout', -2));
      });

      if (data) {
        req.write(data);
      }
      req.end();
    });
  }

  /**
   * Parse XML response from ZFPLab
   * @private
   */
  _parseXML(xmlString) {
    // Simple XML parser for ZFPLab responses
    const getTagValue = (xml, tag) => {
      const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : null;
    };

    const getAttr = (xml, tag, attr) => {
      const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : null;
    };

    // Check for error response
    const resCode = getAttr(xmlString, 'Res', 'Code');
    if (resCode && resCode !== '0') {
      const errMsg = getTagValue(xmlString, 'Message') || 'Unknown error';
      const ste1 = parseInt(getAttr(xmlString, 'Err', 'STE1') || '0', 16);
      const ste2 = parseInt(getAttr(xmlString, 'Err', 'STE2') || '0', 16);
      throw new TremolError(errMsg, parseInt(resCode), ste1, ste2);
    }

    return { xmlString, getTagValue, getAttr };
  }

  /**
   * Parse result values from XML response
   * @private
   */
  _parseResultValues(xmlString) {
    const result = {};
    const regex = /<Res[^>]*Name="([^"]*)"[^>]*Value="([^"]*)"[^>]*Type="([^"]*)"[^>]*\/>/g;
    let match;

    while ((match = regex.exec(xmlString)) !== null) {
      const [, name, value, type] = match;
      if (name === 'Reserve') continue;

      switch (type) {
        case 'Number':
        case 'Decimal':
        case 'Decimal_with_format':
        case 'Decimal_plus_80h':
          result[name] = parseFloat(value);
          break;
        case 'Status':
          result[name] = value === '1' ? 1 : 0;
          break;
        case 'Null':
          result[name] = null;
          break;
        default:
          result[name] = value === '@' ? null : value;
      }
    }

    return result;
  }

  /**
   * Escape string for XML
   * @private
   */
  _escapeXML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Execute a command on the fiscal printer
   * @param {string} commandName - Name of the command
   * @param {...any} args - Command arguments (name, value pairs)
   */
  async do(commandName, ...args) {
    // Build XML command
    let xml = `<Command Name="${commandName}">`;

    if (args.length > 0) {
      xml += '<Args>';
      for (let i = 0; i < args.length; i += 2) {
        const name = args[i];
        const value = args[i + 1];
        if (name === undefined || value === undefined) continue;
        xml += `<Arg Name="${name}" Value="${this._escapeXML(value)}" />`;
      }
      xml += '</Args>';
    }
    xml += '</Command>';

    const response = await this._request('POST', '/', xml);
    this._parseXML(response); // Check for errors
    return this._parseResultValues(response);
  }

  /**
   * Find connected fiscal printer device
   */
  async ServerFindDevice() {
    try {
      const response = await this._request('GET', '/finddevice');

      // Parse the response to get COM port and baud rate
      const comMatch = response.match(/<com>([^<]*)<\/com>/);
      const baudMatch = response.match(/<baud>([^<]*)<\/baud>/);

      if (comMatch && comMatch[1]) {
        this.deviceInfo = {
          serialPort: comMatch[1],
          baudRate: baudMatch ? parseInt(baudMatch[1]) : 115200,
          isWorkingOnTcp: false
        };
        return this.deviceInfo;
      }
      return null;
    } catch (error) {
      console.error('ServerFindDevice error:', error.message);
      return null;
    }
  }

  /**
   * Get current device settings from server
   */
  async ServerGetDeviceSettings() {
    const response = await this._request('GET', '/settings');

    const getValue = (xml, tag) => {
      const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return match ? match[1] : null;
    };

    return {
      isWorkingOnTcp: getValue(response, 'tcp') === '1',
      serialPort: getValue(response, 'com'),
      baudRate: parseInt(getValue(response, 'baud') || '115200'),
      ipaddress: getValue(response, 'ip'),
      tcpPort: parseInt(getValue(response, 'port') || '0'),
      keepPortOpen: getValue(response, 'keepPortOpen') === '1'
    };
  }

  /**
   * Configure serial port settings
   */
  async ServerSetDeviceSerialSettings(serialPort, baudRate, keepPortOpen = true) {
    const path = `/settings(com=${serialPort},baud=${baudRate},keepPortOpen=${keepPortOpen ? '1' : '0'},tcp=0)`;
    await this._request('GET', path);
  }

  /**
   * Close device connection
   */
  async ServerCloseDeviceConnection() {
    await this._request('GET', '/clientremove(who=me)');
  }

  // ============================================================
  // Fiscal Printer Commands
  // ============================================================

  /**
   * Read printer status
   */
  async ReadStatus() {
    return await this.do('ReadStatus');
  }

  /**
   * Read current receipt information
   */
  async ReadCurrentRecInfo() {
    return await this.do('ReadCurrentRecInfo');
  }

  /**
   * Program header line
   * @param {string} lineNum - Header line number ('1'-'8')
   * @param {string} text - Header text
   */
  async ProgHeader(lineNum, text) {
    return await this.do('ProgHeader', 'OptionHeaderLine', lineNum, 'HeaderText', text);
  }

  /**
   * Read header line value
   * @param {string} lineNum - Header line number ('1'-'8')
   * @returns {Object} - { HeaderText: string }
   */
  async ReadHeader(lineNum) {
    return await this.do('ReadHeader', 'OptionHeaderLine', lineNum);
  }

  /**
   * Open fiscal receipt or storno
   * @param {number} operNum - Operator number (1-20)
   * @param {string} operPass - Operator password (4 characters)
   * @param {string} receiptType - '1' for sale, '0' for storno
   * @param {string} printType - '0' step by step, '2' postponed
   */
  async OpenReceiptOrStorno(operNum, operPass, receiptType, printType) {
    return await this.do('OpenReceiptOrStorno',
      'OperNum', operNum,
      'OperPass', operPass,
      'OptionReceiptType', receiptType,
      'OptionPrintType', printType
    );
  }

  /**
   * Sell item with specified VAT
   * @param {string} name - Item name (max 36 chars)
   * @param {string} vatClass - VAT class ('А', 'Б', 'В', 'Г')
   * @param {number} price - Item price
   * @param {string} goodsType - '1' macedonian, '0' import
   * @param {number} quantity - Quantity
   * @param {number} discountPercent - Discount percentage (optional)
   * @param {number} discountValue - Discount value (optional)
   */
  async SellPLUwithSpecifiedVAT(name, vatClass, price, goodsType = '1', quantity = 1, discountPercent, discountValue) {
    const args = [
      'NamePLU', name,
      'OptionVATClass', vatClass,
      'Price', price,
      'OptionGoodsType', goodsType,
      'Quantity', quantity
    ];
    if (discountPercent !== undefined) args.push('DiscAddP', discountPercent);
    if (discountValue !== undefined) args.push('DiscAddV', discountValue);

    return await this.do('SellPLUwithSpecifiedVAT', ...args);
  }

  /**
   * Get subtotal
   * @param {number} printOption - Print option
   * @param {number} displayOption - Display option
   */
  async Subtotal(printOption = 1, displayOption = 1) {
    const result = await this.do('Subtotal',
      'OptionPrinting', printOption,
      'OptionDisplay', displayOption
    );
    return result.SubTotal || result;
  }

  /**
   * Register payment
   * @param {string} paymentType - '0' cash, '1' card, '2' voucher, '3' credit
   * @param {string} changeOption - '0' with change, '1' without
   * @param {number} amount - Payment amount
   */
  async Payment(paymentType, changeOption, amount) {
    return await this.do('Payment',
      'OptionPaymentType', paymentType,
      'OptionChange', changeOption,
      'Amount', amount
    );
  }

  /**
   * Pay exact sum and close receipt
   * @param {string} paymentType - '0' cash, '1' card
   */
  async PayExactSum(paymentType) {
    return await this.do('PayExactSum', 'OptionPaymentType', paymentType);
  }

  /**
   * Close the current receipt
   */
  async CloseReceipt() {
    return await this.do('CloseReceipt');
  }

  /**
   * Cancel the current fiscal receipt
   */
  async CancelReceipt() {
    return await this.do('CancelReceipt');
  }

  /**
   * Print daily report (Z or X)
   * @param {string} zeroing - 'Z' for zeroing, 'X' without zeroing
   */
  async PrintDailyReport(zeroing) {
    return await this.do('PrintDailyReport', 'OptionZeroing', zeroing);
  }

  /**
   * Print text in receipt
   * @param {string} text - Text to print
   */
  async PrintText(text) {
    return await this.do('PrintText', 'Text', text);
  }

  /**
   * Feed paper by one line
   */
  async PaperFeed() {
    return await this.do('PaperFeed');
  }

  /**
   * Cut paper (if supported)
   */
  async CutPaper() {
    return await this.do('CutPaper');
  }

  /**
   * Open cash drawer
   */
  async CashDrawerOpen() {
    return await this.do('CashDrawerOpen');
  }

  /**
   * Read diagnostic info
   */
  async ReadDiagnostics() {
    return await this.do('ReadDiagnostics');
  }
}

/**
 * Helper function to center text for printer (48 char width for 80mm paper)
 */
export function centerText(text, width = 48) {
  if (!text || text.trim().length === 0) return ' '.repeat(width);
  const trimmedText = text.trim();
  if (trimmedText.length >= width) return trimmedText.substring(0, width);
  const leftPad = Math.floor((width - trimmedText.length) / 2);
  const rightPad = width - trimmedText.length - leftPad;
  return ' '.repeat(Math.max(0, leftPad)) + trimmedText + ' '.repeat(Math.max(0, rightPad));
}

export default TremolFP;
