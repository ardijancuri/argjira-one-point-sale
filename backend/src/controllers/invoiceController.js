import { Invoice } from '../models/Invoice.js';
import { StockItem } from '../models/StockItem.js';
import { CompanySettings } from '../models/CompanySettings.js';
import { calculateInvoiceItemTotal } from '../utils/calculations.js';
import PDFDocument from 'pdfkit';
import pool from '../utils/db.js';

export const getInvoices = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type || null,
      status: req.query.status || null,
      excludePosInvoices: req.query.excludePosInvoices === 'true' || req.query.excludePosInvoices === true
    };
    
    const invoices = await Invoice.findAll(filters);
    res.json(invoices);
  } catch (error) {
    next(error);
  }
};

export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const items = await Invoice.findItemsByInvoiceId(req.params.id);
    res.json({ ...invoice, items });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { items, type, ...invoiceData } = req.body;
    
    // Calculate item totals
    const calculatedItems = items.map(item => {
      const totals = calculateInvoiceItemTotal(
        parseFloat(item.quantity),
        parseFloat(item.price),
        parseFloat(item.tax_rate || 0)
      );
      return {
        ...item,
        ...totals
      };
    });
    
    // Create invoice
    const invoice = await Invoice.create({
      ...invoiceData,
      type,
      items: calculatedItems
    });
    
    // Update stock based on invoice type
    if (type === 'out') {
      // Subtract from stock
      for (const item of calculatedItems) {
        if (item.stock_item_id) {
          await StockItem.updateQuantity(item.stock_item_id, -parseFloat(item.quantity));
        }
      }
    } else {
      // Add to stock with weighted average
      for (const item of calculatedItems) {
        if (item.stock_item_id) {
          await StockItem.updatePriceWithWeightedAverage(
            item.stock_item_id,
            parseFloat(item.quantity),
            parseFloat(item.price)
          );
        }
      }
    }
    
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
};

export const getUnpaidInvoices = async (req, res, next) => {
  try {
    const { limit } = req.query;
    
    const invoices = await Invoice.findUnpaid(parseInt(limit) || 6);
    res.json(invoices);
  } catch (error) {
    next(error);
  }
};

export const getStatistics = async (req, res, next) => {
  try {
    const { type, excludePosInvoices } = req.query;
    
    // Build WHERE clause based on filters
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (type) {
      whereClause += ` AND i.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    // Exclude only POS invoices with sale_type = 'normal' when excludePosInvoices is true and type is 'out'
    // Show: manual invoices (fs.id IS NULL) OR POS invoices with sale_type != 'normal'
    if (excludePosInvoices === 'true' || excludePosInvoices === true) {
      if (type === 'out') {
        // When type is 'out', exclude only normal sales
        whereClause += ` AND (fs.id IS NULL OR fs.sale_type IS NULL OR fs.sale_type != $${paramIndex})`;
        params.push('normal');
        paramIndex++;
      } else {
        // For other types or when type is not specified, use original logic
        whereClause += ` AND (i.type != 'out' OR fs.id IS NULL)`;
      }
    }
    
    // Get invoice totals (without item joins to avoid multiplication)
    // Use corrected balance logic to match frontend display:
    // - If balance > subtotal and total > subtotal, calculate: subtotal - (total - balance)
    // - If balance > subtotal, cap at subtotal
    // - Otherwise use balance as-is
    const invoiceStatsResult = await pool.query(`
      SELECT
        COUNT(i.id) as total_invoices,
        COALESCE(SUM(i.subtotal), 0) as total_amount,
        COALESCE(SUM(
          CASE
            WHEN (
              CASE
                WHEN i.balance > i.subtotal AND i.total > i.subtotal
                  THEN GREATEST(0, i.subtotal - (i.total - i.balance))
                WHEN i.balance > i.subtotal
                  THEN i.subtotal
                ELSE i.balance
              END
            ) <= 0.01 THEN i.subtotal
            ELSE 0
          END
        ), 0) as paid_amount,
        COALESCE(SUM(
          CASE
            WHEN (
              CASE
                WHEN i.balance > i.subtotal AND i.total > i.subtotal
                  THEN GREATEST(0, i.subtotal - (i.total - i.balance))
                WHEN i.balance > i.subtotal
                  THEN i.subtotal
                ELSE i.balance
              END
            ) > 0.01 THEN (
              CASE
                WHEN i.balance > i.subtotal AND i.total > i.subtotal
                  THEN GREATEST(0, i.subtotal - (i.total - i.balance))
                WHEN i.balance > i.subtotal
                  THEN i.subtotal
                ELSE i.balance
              END
            )
            ELSE 0
          END
        ), 0) as unpaid_amount
      FROM invoices i
      LEFT JOIN fiscal_sales fs ON i.id = fs.invoice_id
      WHERE ${whereClause}
    `, params);

    // Get grams/pieces separately (only for 'out' type invoices - sales)
    const itemStatsResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN si.unit = 'gram' THEN ii.quantity ELSE 0 END), 0) as total_grams,
        COALESCE(SUM(CASE WHEN si.unit = 'piece' THEN ii.quantity ELSE 0 END), 0) as total_pieces
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      LEFT JOIN stock_items si ON ii.stock_item_id = si.id
      LEFT JOIN fiscal_sales fs ON i.id = fs.invoice_id
      WHERE ${whereClause} AND i.type = 'out'
    `, params);

    const invoiceStats = invoiceStatsResult.rows[0];
    const itemStats = itemStatsResult.rows[0];

    res.json({
      totalInvoices: parseInt(invoiceStats.total_invoices) || 0,
      totalGrams: parseFloat(itemStats.total_grams) || 0,
      totalPieces: parseFloat(itemStats.total_pieces) || 0,
      totalAmount: parseFloat(invoiceStats.total_amount) || 0,
      paidAmount: parseFloat(invoiceStats.paid_amount) || 0,
      unpaidAmount: parseFloat(invoiceStats.unpaid_amount) || 0
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    await Invoice.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const generateAllPDF = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type || null,
      status: req.query.status || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      excludePosInvoices: req.query.excludePosInvoices === 'true' || req.query.excludePosInvoices === true
    };
    
    const invoices = await Invoice.findAll(filters);
    if (!invoices || !Array.isArray(invoices)) {
      return res.status(500).json({ error: 'Failed to retrieve invoices' });
    }
    
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Nuk u gjetën fatura për këtë filtrim' });
    }
    
    const companySettings = await CompanySettings.get();
    
    // Helper function to format currency
    const formatCurrency = (value) => {
      return parseFloat(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };
    
    // Helper function to calculate corrected balance
    const getCorrectedBalance = (invoice) => {
      const subtotal = parseFloat(invoice.subtotal) || 0;
      const balance = parseFloat(invoice.balance) || 0;
      const oldTotal = parseFloat(invoice.total) || 0;
      
      if (balance > subtotal && oldTotal > subtotal) {
        const paymentsMade = oldTotal - balance;
        return Math.max(0, subtotal - paymentsMade);
      } else if (balance > subtotal) {
        return subtotal;
      }
      return balance;
    };
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="faturat-${date}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add error handler for PDF stream
    doc.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF generation failed' });
      }
    });
    
    // Company Header - Two columns, left aligned
    const headerStartX = 50;
    const headerY = 50;
    const leftColumnX = headerStartX;
    const rightColumnX = 300;
    let leftY = headerY;
    let rightY = headerY;
    
    doc.fontSize(20).font('Helvetica-Bold').text(companySettings?.name || 'Company Name', leftColumnX, leftY);
    leftY += 40;
    
    doc.fontSize(10).font('Helvetica');
    if (companySettings?.nipt) {
      doc.text(`NIPT: ${companySettings.nipt}`, leftColumnX, leftY);
      leftY += 15;
    }
    if (companySettings?.address) {
      doc.text(companySettings.address, leftColumnX, leftY);
      leftY += 15;
    }
    if (companySettings?.country) {
      doc.text(companySettings.country, leftColumnX, leftY);
      leftY += 15;
    }
    
    // Right column
    if (companySettings?.phone) {
      doc.text(`Tel: ${companySettings.phone}`, rightColumnX, rightY);
      rightY += 15;
    }
    if (companySettings?.email) {
      doc.text(`Email: ${companySettings.email}`, rightColumnX, rightY);
      rightY += 15;
    }
    if (companySettings?.bank) {
      doc.text(`Banka: ${companySettings.bank}`, rightColumnX, rightY);
      rightY += 15;
    }
    if (companySettings?.iban) {
      doc.text(`Xhirollogaria (IBAN): ${companySettings.iban}`, rightColumnX, rightY);
      rightY += 15;
    }
    
    // Set Y position for next section
    doc.y = Math.max(leftY, rightY) + 20;
    
    // Report Title
    doc.moveDown(1);
    doc.fontSize(16).font('Helvetica-Bold').text('RAPORT I FATURAVE', headerStartX);
    doc.moveDown(1);
    
    // Report Info
    doc.fontSize(10).font('Helvetica');
    const now = new Date();
    doc.text(`Data: ${now.toLocaleDateString('sq-AL')}`, headerStartX, doc.y);
    doc.text(`Totali i Faturave: ${invoices.length}`, headerStartX, doc.y + 5);
    doc.moveDown(1);
    
    // Table Setup
    const tableStartX = 50;
    const tableTop = doc.y + 10;
    const rowHeight = 20;
    
    // Column widths - adjusted: wider number, narrower client, less spacing
    const colWidths = {
      number: 100,
      type: 40,
      client: 70,
      date: 55,
      dueDate: 55,
      total: 55,
      balance: 55,
      status: 55
    };
    
    // Column X positions
    const spacingAfterNumber = 5; // Space between Nr. and Tipi columns
    const spacingAfterBalance = 10; // Space between Mbetja and Statusi columns
    const colX = {
      number: tableStartX,
      type: tableStartX + colWidths.number + spacingAfterNumber,
      client: tableStartX + colWidths.number + spacingAfterNumber + colWidths.type,
      date: tableStartX + colWidths.number + spacingAfterNumber + colWidths.type + colWidths.client,
      dueDate: tableStartX + colWidths.number + spacingAfterNumber + colWidths.type + colWidths.client + colWidths.date,
      total: tableStartX + colWidths.number + spacingAfterNumber + colWidths.type + colWidths.client + colWidths.date + colWidths.dueDate,
      balance: tableStartX + colWidths.number + spacingAfterNumber + colWidths.type + colWidths.client + colWidths.date + colWidths.dueDate + colWidths.total,
      status: tableStartX + colWidths.number + spacingAfterNumber + colWidths.type + colWidths.client + colWidths.date + colWidths.dueDate + colWidths.total + colWidths.balance + spacingAfterBalance
    };
    
    // Calculate table end X based on last column position and width
    const tableEndX = colX.status + colWidths.status;
    
    // Table Header
    doc.font('Helvetica-Bold').fontSize(9);
    let tableHeaderY = tableTop;
    doc.text('Nr.', colX.number, tableHeaderY, { width: colWidths.number });
    doc.text('Tipi', colX.type, tableHeaderY, { width: colWidths.type });
    doc.text('Klienti', colX.client, tableHeaderY, { width: colWidths.client });
    doc.text('Data', colX.date, tableHeaderY, { width: colWidths.date });
    doc.text('Afati', colX.dueDate, tableHeaderY, { width: colWidths.dueDate });
    doc.text('Totali', colX.total, tableHeaderY, { width: colWidths.total, align: 'right' });
    doc.text('Mbetja', colX.balance, tableHeaderY, { width: colWidths.balance, align: 'right' });
    doc.text('Statusi', colX.status, tableHeaderY, { width: colWidths.status });
    
    // Draw header line
    doc.moveTo(tableStartX, tableHeaderY + 15).lineTo(tableEndX, tableHeaderY + 15).stroke();
    
    // Table Rows
    let yPos = tableHeaderY + 25;
    doc.font('Helvetica').fontSize(8);
    
    invoices.forEach((invoice) => {
      // Check if we need a new page
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
        
        // Redraw header on new page
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Nr.', colX.number, yPos, { width: colWidths.number });
        doc.text('Tipi', colX.type, yPos, { width: colWidths.type });
        doc.text('Klienti', colX.client, yPos, { width: colWidths.client });
        doc.text('Data', colX.date, yPos, { width: colWidths.date });
        doc.text('Afati', colX.dueDate, yPos, { width: colWidths.dueDate });
        doc.text('Totali', colX.total, yPos, { width: colWidths.total, align: 'right' });
        doc.text('Mbetja', colX.balance, yPos, { width: colWidths.balance, align: 'right' });
        doc.text('Statusi', colX.status, yPos, { width: colWidths.status });
        doc.moveTo(tableStartX, yPos + 15).lineTo(tableEndX, yPos + 15).stroke();
        yPos += 25;
        doc.font('Helvetica').fontSize(8);
      }
      
      const invoiceNumber = invoice.number || 'N/A';
      const invoiceType = invoice.type === 'out' ? 'Dalëse' : 'Hyrëse';
      const clientName = invoice.client_name || 'N/A';
      const invoiceDate = invoice.date ? new Date(invoice.date).toLocaleDateString('sq-AL') : 'N/A';
      const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('sq-AL') : 'N/A';
      const invoiceTotal = parseFloat(invoice.subtotal) || parseFloat(invoice.total) || 0;
      const correctedBalance = getCorrectedBalance(invoice);
      const status = correctedBalance > 0.01 ? 'E Papaguar' : 'E Paguar';
      
      doc.text(invoiceNumber, colX.number, yPos, { width: colWidths.number });
      doc.text(invoiceType, colX.type, yPos, { width: colWidths.type });
      doc.text(clientName, colX.client, yPos, { width: colWidths.client });
      doc.text(invoiceDate, colX.date, yPos, { width: colWidths.date });
      doc.text(dueDate, colX.dueDate, yPos, { width: colWidths.dueDate });
      doc.text(formatCurrency(invoiceTotal), colX.total, yPos, { width: colWidths.total, align: 'right' });
      doc.text(formatCurrency(correctedBalance), colX.balance, yPos, { width: colWidths.balance, align: 'right' });
      doc.text(status, colX.status, yPos, { width: colWidths.status });
      
      yPos += rowHeight;
    });
    
    // Summary Section
    doc.moveDown(1);
    const summaryY = doc.y + 20;
    const summaryX = 350;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.subtotal) || parseFloat(inv.total) || 0), 0);
    const totalBalance = invoices.reduce((sum, inv) => sum + getCorrectedBalance(inv), 0);
    const paidAmount = Math.max(0, totalAmount - totalBalance); // Ensure non-negative
    
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Totali i Faturave:', summaryX, summaryY, { width: 120, align: 'right' });
    doc.text(formatCurrency(totalAmount), summaryX + 120, summaryY, { width: 80, align: 'right' });
    
    doc.font('Helvetica').fontSize(10);
    doc.text('Të Paguara:', summaryX, summaryY + 20, { width: 120, align: 'right' });
    doc.text(formatCurrency(paidAmount), summaryX + 120, summaryY + 20, { width: 80, align: 'right' });
    
    doc.text('Të Papaguara:', summaryX, summaryY + 40, { width: 120, align: 'right' });
    doc.text(formatCurrency(totalBalance), summaryX + 120, summaryY + 40, { width: 80, align: 'right' });
    
    // Finalize PDF
    doc.end();
  } catch (error) {
    next(error);
  }
};

export const generatePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const items = await Invoice.findItemsByInvoiceId(req.params.id);
    if (!items || !Array.isArray(items)) {
      return res.status(500).json({ error: 'Failed to retrieve invoice items' });
    }
    const companySettings = await CompanySettings.get();
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.number}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add error handler for PDF stream
    doc.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF generation failed' });
      }
    });
    
    // Company Header - Two columns, left aligned
    const headerStartX = 50;
    const headerY = 50;
    const leftColumnX = headerStartX;
    const rightColumnX = 300;
    let leftY = headerY;
    let rightY = headerY;
    
    doc.fontSize(20).font('Helvetica-Bold').text(companySettings?.name || 'Company Name', leftColumnX, leftY);
    leftY += 40;
    
    doc.fontSize(10).font('Helvetica');
    if (companySettings?.nipt) {
      doc.text(`NIPT: ${companySettings.nipt}`, leftColumnX, leftY);
      leftY += 15;
    }
    if (companySettings?.address) {
      doc.text(companySettings.address, leftColumnX, leftY);
      leftY += 15;
    }
    if (companySettings?.country) {
      doc.text(companySettings.country, leftColumnX, leftY);
      leftY += 15;
    }
    
    // Right column
    if (companySettings?.phone) {
      doc.text(`Tel: ${companySettings.phone}`, rightColumnX, rightY);
      rightY += 15;
    }
    if (companySettings?.email) {
      doc.text(`Email: ${companySettings.email}`, rightColumnX, rightY);
      rightY += 15;
    }
    if (companySettings?.bank) {
      doc.text(`Banka: ${companySettings.bank}`, rightColumnX, rightY);
      rightY += 15;
    }
    if (companySettings?.iban) {
      doc.text(`Xhirollogaria (IBAN): ${companySettings.iban}`, rightColumnX, rightY);
      rightY += 15;
    }
    
    // Set Y position for next section
    doc.y = Math.max(leftY, rightY) + 20;
    
    doc.moveDown(1);
    doc.fontSize(16).font('Helvetica-Bold').text(`FATURË ${invoice.type === 'out' ? 'DALËSE' : 'HYRËSE'}`, headerStartX);
    doc.moveDown(1);
    
    // Invoice Details
    const startX = 50;
    const startY = doc.y;
    let currentY = startY;
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nr. Fature: ${invoice.number}`, startX, currentY);
    currentY += 15;
    doc.text(`Data: ${new Date(invoice.date).toLocaleDateString('sq-AL')}`, startX, currentY);
    currentY += 15;
    if (invoice.due_date) {
      doc.text(`Afati: ${new Date(invoice.due_date).toLocaleDateString('sq-AL')}`, startX, currentY);
      currentY += 15;
    }
    doc.text(`Metoda e Pagesës: ${invoice.payment_method === 'cash' ? 'Cash' : invoice.payment_method === 'card' ? 'Card' : 'Bankë'}`, startX, currentY);
    currentY += 15;
    
    // Client Info
    const clientX = 300;
    currentY = startY;
    doc.font('Helvetica-Bold').text(invoice.type === 'out' ? 'Klienti:' : 'Furnizuesi:', clientX, currentY);
    currentY += 15;
    doc.font('Helvetica').text(invoice.client_name || 'N/A', clientX, currentY);
    currentY += 15;
    if (invoice.client_id_number) {
      doc.text(`ID/NIPT: ${invoice.client_id_number}`, clientX, currentY);
      currentY += 15;
    }
    if (invoice.client_phone) {
      doc.text(`Tel: ${invoice.client_phone}`, clientX, currentY);
      currentY += 15;
    }
    if (invoice.client_email) {
      doc.text(`Email: ${invoice.client_email}`, clientX, currentY);
      currentY += 15;
    }
    if (invoice.client_address) {
      doc.text(`Adresa: ${invoice.client_address}`, clientX, currentY);
    }
    
    // Items Table
    doc.moveDown(2);
    const tableTop = doc.y;
    const itemHeight = 30;
    const tableStartX = 50;
    const tableEndX = 530;
    const tableWidth = tableEndX - tableStartX;
    
    // Column widths and positions - ensure they fit within table
    const colWidths = { name: 250, qty: 60, price: 80, total: 80 };
    const colX = { 
      name: tableStartX, 
      qty: tableStartX + colWidths.name, 
      price: tableStartX + colWidths.name + colWidths.qty, 
      total: tableStartX + colWidths.name + colWidths.qty + colWidths.price
    };
    
    // Table Header
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Artikulli', colX.name, tableTop, { width: colWidths.name });
    doc.text('Sasia', colX.qty, tableTop, { width: colWidths.qty, align: 'right' });
    doc.text('Çmimi', colX.price, tableTop, { width: colWidths.price, align: 'right' });
    doc.text('Totali', colX.total, tableTop, { width: colWidths.total, align: 'right' });
    
    // Draw header line
    doc.moveTo(tableStartX, tableTop + 15).lineTo(tableEndX, tableTop + 15).stroke();
    
    // Table Rows
    let yPos = tableTop + 25;
    doc.font('Helvetica').fontSize(9);
    
    items.forEach((item) => {
      const productName = item.product_name || item.stock_item_name || 'Artikull';
      const quantity = Math.round(parseFloat(item.quantity) || 0).toString();
      const price = parseFloat(item.price).toFixed(2);
      // Calculate total as subtotal (tax is 0, so total = subtotal)
      const itemTotal = parseFloat(item.subtotal) || (parseFloat(item.quantity) * parseFloat(item.price));
      const total = itemTotal.toFixed(2);
      
      doc.text(productName, colX.name, yPos, { width: colWidths.name });
      doc.text(quantity, colX.qty, yPos, { width: colWidths.qty, align: 'right' });
      doc.text(price, colX.price, yPos, { width: colWidths.price, align: 'right' });
      doc.text(total, colX.total, yPos, { width: colWidths.total, align: 'right' });
      
      yPos += itemHeight;
    });
    
    // Totals Section
    // Calculate total as subtotal (tax is 0, so total = subtotal)
    const invoiceTotal = parseFloat(invoice.subtotal) || 0;
    
    // Calculate balance correctly: if balance > subtotal, it includes old tax, so recalculate
    // Balance = subtotal - payments_made, or if balance seems wrong, use subtotal as base
    let invoiceBalance = parseFloat(invoice.balance) || 0;
    const subtotalValue = parseFloat(invoice.subtotal) || 0;
    const oldTotal = parseFloat(invoice.total) || 0;
    
    // If balance is greater than subtotal, it likely includes tax from old invoices
    // Recalculate: balance = subtotal - (old_total - old_balance)
    if (invoiceBalance > subtotalValue && oldTotal > subtotalValue) {
      const paymentsMade = oldTotal - invoiceBalance;
      invoiceBalance = Math.max(0, subtotalValue - paymentsMade);
    } else if (invoiceBalance > subtotalValue) {
      // If balance > subtotal but we can't determine payments, cap it at subtotal
      invoiceBalance = subtotalValue;
    }
    
    doc.moveDown(1);
    const totalsY = doc.y;
    const totalsX = 350;
    
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Totali:', totalsX, totalsY, { width: 100, align: 'right' });
    doc.text(invoiceTotal.toFixed(2), totalsX + 100, totalsY, { width: 80, align: 'right' });
    
    doc.font('Helvetica');
    doc.text('Mbetja:', totalsX, totalsY + 20, { width: 100, align: 'right' });
    doc.text(invoiceBalance.toFixed(2), totalsX + 100, totalsY + 20, { width: 80, align: 'right' });
    
    // Description
    if (invoice.description) {
      doc.moveDown(2);
      const descriptionX = 50;
      const descriptionWidth = 495; // Full width minus margins
      doc.fontSize(9).text(`Shënim: ${invoice.description}`, descriptionX, doc.y, { width: descriptionWidth, align: 'right' });
    }
    
    // Finalize PDF
    doc.end();
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, ...invoiceData } = req.body;
    
    // Get existing invoice to check type and current items
    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // For incoming invoices (Fature Hyrese), check if any payment has been made
    if (existingInvoice.type === 'in') {
      const subtotal = parseFloat(existingInvoice.subtotal) || 0;
      const balance = parseFloat(existingInvoice.balance) || 0;
      const oldTotal = parseFloat(existingInvoice.total) || 0;
      
      // Calculate corrected balance
      let correctedBalance = balance;
      if (balance > subtotal && oldTotal > subtotal) {
        const paymentsMade = oldTotal - balance;
        correctedBalance = Math.max(0, subtotal - paymentsMade);
      } else if (balance > subtotal) {
        correctedBalance = subtotal;
      }
      
      // Calculate paid amount
      const paidAmount = subtotal - correctedBalance;
      
      // If any payment has been made, block editing
      if (paidAmount > 0.01) {
        return res.status(400).json({ 
          error: 'Kjo faturë nuk mund të editohet sepse ka pagesa të regjistruara. Anuloni pagesat para se të editoni.' 
        });
      }
    }
    
    // Process items - create stock items for new manual items
    let processedItems = items || [];
    if (existingInvoice.type === 'in' && processedItems.length > 0) {
      processedItems = await Promise.all(
        processedItems.map(async (item) => {
          // Check if this is a new manual item that needs stock creation
          // Items with needsStockCreation flag or items without stock_item_id
          if (item.needsStockCreation && item.pendingStockData) {
            try {
              // Create stock item with quantity 0
              // The Invoice.update() will add the quantity via weighted average
              const stockData = {
                name: item.pendingStockData.name,
                serial_number: item.pendingStockData.serial_number || null,
                quantity: 0, // Will be updated by Invoice.update()
                karat: item.pendingStockData.karat || null,
                unit: item.pendingStockData.unit || 'piece',
                price: item.pendingStockData.price || 0,
                category: item.pendingStockData.category || 'stoli',
                tax_rate: 0,
              };
              
              const createdStockItem = await StockItem.create(stockData);
              
              // Return item with the new stock_item_id
              return {
                ...item,
                stock_item_id: createdStockItem.id,
              };
            } catch (error) {
              throw new Error(
                `Gabim në krijimin e artikullit "${item.product_name}": ${error.message}`
              );
            }
          }
          return item;
        })
      );
    }
    
    // Calculate item totals
    const calculatedItems = processedItems.map(item => {
      const totals = calculateInvoiceItemTotal(
        parseFloat(item.quantity),
        parseFloat(item.price),
        parseFloat(item.tax_rate || 0)
      );
      return {
        ...item,
        ...totals
      };
    });
    
    // Update invoice using model method
    const updatedInvoice = await Invoice.update(id, {
      ...invoiceData,
      items: calculatedItems
    });
    
    res.json(updatedInvoice);
  } catch (error) {
    next(error);
  }
};

