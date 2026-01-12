import { Processing } from '../models/Processing.js';
import { CompanySettings } from '../models/CompanySettings.js';
import PDFDocument from 'pdfkit';
import pool from '../utils/db.js';

export const getProcessingRecords = async (req, res, next) => {
  try {
    const records = await Processing.findAll();
    res.json(records);
  } catch (error) {
    next(error);
  }
};

export const getProcessingRecord = async (req, res, next) => {
  try {
    const record = await Processing.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Processing record not found' });
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
};

export const createProcessing = async (req, res, next) => {
  try {
    const {
      // Phase 1
      client_id,
      client_doc,
      date_in,
      quantity,
      price_in,
      doc_in,
      
      // Phase 2
      workshop_id,
      date_send,
      doc_send,
      
      // Phase 3
      date_return,
      invoice_workshop,
      invoice_in,
      price_workshop,
      
      // Phase 4
      date_sale,
      price_sale,
      invoice_out,
      tax_rate,
      
      description
    } = req.body;
    
    // Validate required fields for 4-phase workflow
    if (!client_id || !workshop_id || !quantity || !price_in || !price_workshop || !price_sale) {
      return res.status(400).json({ error: 'Plotësoni të gjitha fushat e detyrueshme për procesin 4-fazor!' });
    }
    
    if (!date_in || !date_return || !date_sale) {
      return res.status(400).json({ error: 'Plotësoni të gjitha datat e detyrueshme!' });
    }
    
    const record = await Processing.create({
      client_id,
      client_doc,
      date_in,
      quantity,
      price_in,
      doc_in,
      workshop_id,
      date_send,
      doc_send,
      date_return,
      invoice_workshop,
      invoice_in,
      price_workshop,
      date_sale,
      price_sale,
      invoice_out,
      tax_rate: tax_rate || 18,
      description
    });
    
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
};

export const deleteProcessing = async (req, res, next) => {
  try {
    await Processing.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getProcessingStatistics = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Build WHERE clause for date filtering
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (dateFrom) {
      whereClause += ` AND COALESCE(pr.date_in, pr.date) >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereClause += ` AND COALESCE(pr.date_in, pr.date) <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }
    
    // Query processing records with invoice balances
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT pr.id) as total_processing,
        COALESCE(SUM(pr.quantity), 0) as total_quantity,
        COALESCE(SUM(pr.total_workshop), 0) as total_workshop_cost,
        COALESCE(SUM(CASE 
          WHEN i_in.id IS NOT NULL 
            AND i_in.balance > 0.01
          THEN i_in.balance
          ELSE 0 
        END), 0) as total_workshop_debt,
        COALESCE(SUM(pr.subtotal_sale), 0) as total_client_sale,
        COALESCE(SUM(pr.total_sale), 0) as total_client_sale_with_tax,
        COALESCE(SUM(CASE 
          WHEN i_out.id IS NOT NULL 
            AND i_out.balance > 0.01
          THEN i_out.balance
          ELSE 0 
        END), 0) as total_client_debt,
        COALESCE(SUM(pr.profit), 0) as total_profit
      FROM processing_records pr
      LEFT JOIN invoices i_in ON pr.invoice_in_id = i_in.id
      LEFT JOIN invoices i_out ON pr.invoice_out_id = i_out.id
      WHERE ${whereClause}
    `, params);
    
    const stats = result.rows[0];
    
    res.json({
      totalProcessing: parseInt(stats.total_processing) || 0,
      totalQuantity: parseFloat(stats.total_quantity) || 0,
      totalWorkshopCost: parseFloat(stats.total_workshop_cost) || 0,
      totalWorkshopDebt: parseFloat(stats.total_workshop_debt) || 0,
      totalClientSale: parseFloat(stats.total_client_sale) || 0,
      totalClientDebt: parseFloat(stats.total_client_debt) || 0,
      totalProfit: parseFloat(stats.total_profit) || 0
    });
  } catch (error) {
    next(error);
  }
};

export const generateProcessingPDF = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Build WHERE clause for date filtering
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (dateFrom) {
      whereClause += ` AND COALESCE(pr.date_in, pr.date) >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereClause += ` AND COALESCE(pr.date_in, pr.date) <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }
    
    // Get processing records with invoice status
    const result = await pool.query(`
      SELECT pr.*, 
              c.name as client_name,
              w.name as workshop_name,
              COALESCE(pr.date_in, pr.date) as date_in,
              i_in.status as invoice_in_status,
              i_in.balance as invoice_in_balance,
              i_out.status as invoice_status,
              i_out.balance as invoice_balance
       FROM processing_records pr
       LEFT JOIN clients c ON pr.client_id = c.id
       LEFT JOIN clients w ON pr.workshop_id = w.id
       LEFT JOIN invoices i_in ON pr.invoice_in_id = i_in.id
       LEFT JOIN invoices i_out ON pr.invoice_out_id = i_out.id
       WHERE ${whereClause}
       ORDER BY COALESCE(pr.date_in, pr.date) DESC, pr.created_at DESC
    `, params);
    
    const records = result.rows;
    
    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'Nuk u gjetën përpunime për këtë filtrim' });
    }
    
    const companySettings = await CompanySettings.get();
    
    // Helper function to format currency (no decimals)
    const formatCurrency = (value) => {
      return Math.round(parseFloat(value || 0)).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    };
    
    // Helper function to format number (no decimals)
    const formatNumber = (value) => {
      return Math.round(parseFloat(value || 0)).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    };
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="perpunime-${date}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Header - uppercase, bold, smaller font, left aligned
    doc.fontSize(16).font('Helvetica-Bold').text('PËRPUNIME TË ARIT', { align: 'left' });
    doc.moveDown(0.5);
    
    // Company details - not bold, left aligned
    doc.font('Helvetica');
    if (companySettings?.name) {
      doc.fontSize(12).text(companySettings.name, { align: 'left' });
    }
    if (companySettings?.address) {
      doc.fontSize(10).text(companySettings.address, { align: 'left' });
    }
    if (companySettings?.phone) {
      doc.fontSize(10).text(`Tel: ${companySettings.phone}`, { align: 'left' });
    }
    
    doc.moveDown(1);
    
    // Date range info
    if (dateFrom || dateTo) {
      doc.fontSize(10).text(
        `Periudha: ${dateFrom || 'Fillimi'} - ${dateTo || 'Fundi'}`,
        { align: 'center' }
      );
      doc.moveDown(0.5);
    }
    
    doc.moveDown(1);
    
    // Table header
    const tableTop = doc.y;
    const itemHeight = 15;
    const pageHeight = 750;
    let currentY = tableTop;
    
    // Table headers - narrower columns with smaller font
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('Data', 50, currentY, { width: 45 });
    doc.text('Klienti', 95, currentY, { width: 70 });
    doc.text('Puntoria', 165, currentY, { width: 60 });
    doc.text('Sasia', 225, currentY, { width: 45, align: 'right' });
    doc.text('Kosto', 270, currentY, { width: 60, align: 'right' });
    doc.text('Totali', 330, currentY, { width: 60, align: 'right' });
    doc.text('Fitimi', 390, currentY, { width: 60, align: 'right' });
    doc.text('Statusi', 460, currentY, { width: 50 });
    
    currentY += itemHeight;
    doc.moveTo(50, currentY).lineTo(510, currentY).stroke();
    
    // Add extra space before first row
    currentY += 5;
    
    // Table rows - smaller font
    doc.font('Helvetica').fontSize(7);
    let totalQuantity = 0;
    let totalCost = 0;
    let totalSale = 0;
    let totalProfit = 0;
    
    for (const record of records) {
      // Check if we need a new page
      if (currentY > pageHeight) {
        doc.addPage();
        currentY = 50;
        
        // Redraw headers
        doc.font('Helvetica-Bold').fontSize(7);
        doc.text('Data', 50, currentY, { width: 45 });
        doc.text('Klienti', 95, currentY, { width: 70 });
        doc.text('Puntoria', 165, currentY, { width: 60 });
        doc.text('Sasia', 225, currentY, { width: 45, align: 'right' });
        doc.text('Kosto', 270, currentY, { width: 60, align: 'right' });
        doc.text('Totali', 330, currentY, { width: 60, align: 'right' });
        doc.text('Fitimi', 390, currentY, { width: 60, align: 'right' });
        doc.text('Statusi', 460, currentY, { width: 50 });
        currentY += itemHeight;
        doc.moveTo(50, currentY).lineTo(510, currentY).stroke();
        // Add extra space before first row on new page
        currentY += 5;
        doc.font('Helvetica');
      }
      
      const date = record.date_in ? new Date(record.date_in).toLocaleDateString('sq-AL') : 'N/A';
      const quantity = parseFloat(record.quantity) || 0;
      const cost = parseFloat(record.total_workshop) || 0;
      const sale = parseFloat(record.total_sale) || 0;
      const profit = parseFloat(record.profit) || 0;
      
      // Determine combined invoice status
      const invoiceInBalance = parseFloat(record.invoice_in_balance) || 0;
      const invoiceInStatus = record.invoice_in_status || 'unpaid';
      const isPaidIn = invoiceInStatus === 'paid' || invoiceInBalance <= 0.01;
      
      const invoiceOutBalance = parseFloat(record.invoice_balance) || 0;
      const invoiceOutStatus = record.invoice_status || 'unpaid';
      const isPaidOut = invoiceOutStatus === 'paid' || invoiceOutBalance <= 0.01;
      
      let statusText = '';
      if (isPaidIn && isPaidOut) {
        statusText = 'E Paguar';
      } else if (isPaidIn && !isPaidOut) {
        statusText = 'Puntoria e Paguar';
      } else if (!isPaidIn && isPaidOut) {
        statusText = 'Klienti e Paguar';
      } else {
        statusText = 'E Papaguar';
      }
      
      totalQuantity += quantity;
      totalCost += cost;
      totalSale += sale;
      totalProfit += profit;
      
      doc.text(date, 50, currentY, { width: 45 });
      doc.text(record.client_name || 'N/A', 95, currentY, { width: 70 });
      doc.text(record.workshop_name || 'N/A', 165, currentY, { width: 60 });
      doc.text(`${formatNumber(quantity)}g`, 225, currentY, { width: 45, align: 'right' });
      doc.text(formatCurrency(cost), 270, currentY, { width: 60, align: 'right' });
      doc.text(formatCurrency(sale), 330, currentY, { width: 60, align: 'right' });
      doc.text(formatCurrency(profit), 390, currentY, { width: 60, align: 'right' });
      doc.text(statusText, 460, currentY, { width: 50 });
      
      currentY += itemHeight;
    }
    
    // Totals
    currentY += 10;
    doc.moveTo(50, currentY).lineTo(510, currentY).stroke();
    currentY += 10;
    
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('TOTALET:', 50, currentY);
    doc.text(`${formatNumber(totalQuantity)}g`, 225, currentY, { width: 45, align: 'right' });
    doc.text(formatCurrency(totalCost), 270, currentY, { width: 60, align: 'right' });
    doc.text(formatCurrency(totalSale), 330, currentY, { width: 60, align: 'right' });
    doc.text(formatCurrency(totalProfit), 390, currentY, { width: 60, align: 'right' });
    
    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Faqja ${i + 1} nga ${pageCount} | Gjeneruar: ${new Date().toLocaleString('sq-AL')}`,
        50,
        doc.page.height - 30,
        { align: 'center', width: 500 }
      );
    }
    
    doc.end();
  } catch (error) {
    next(error);
  }
};

