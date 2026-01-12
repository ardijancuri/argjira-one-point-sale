import { StockItem } from '../models/StockItem.js';
import { CompanySettings } from '../models/CompanySettings.js';
import PDFDocument from 'pdfkit';

export const getStockItems = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category || null,
      search: req.query.search || null
    };
    
    const items = await StockItem.findAll(filters);
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getStockItem = async (req, res, next) => {
  try {
    const item = await StockItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const createStockItem = async (req, res, next) => {
  try {
    const item = await StockItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

export const updateStockItem = async (req, res, next) => {
  try {
    const item = await StockItem.update(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const deleteStockItem = async (req, res, next) => {
  try {
    await StockItem.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getPOSStock = async (req, res, next) => {
  try {
    const items = await StockItem.findForPOS();
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getStockStats = async (req, res, next) => {
  try {
    const stats = await StockItem.getStockStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const generatePDF = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category || null,
      search: req.query.search || null
    };
    
    const items = await StockItem.findAll(filters);
    if (!items || !Array.isArray(items)) {
      return res.status(500).json({ error: 'Failed to retrieve stock items' });
    }
    const companySettings = await CompanySettings.get();
    
    // Calculate statistics
    const calculateStats = () => {
      // STOLI ARI (category: stoli, unit: gram)
      const stoliAri = items.filter(item => item.category === 'stoli' && item.unit === 'gram');
      const stoliAriQuantity = stoliAri.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
      const stoliAriValue = stoliAri.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
      
      // ARI I VJETËR (category: blerje, unit: gram)
      const ariVjeter = items.filter(item => item.category === 'blerje' && item.unit === 'gram');
      const ariVjeterQuantity = ariVjeter.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
      const ariVjeterValue = ariVjeter.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
      
      // AR INVESTUES (category: investues, unit: piece)
      const arInvestues = items.filter(item => item.category === 'investues' && item.unit === 'piece');
      const arInvestuesQuantity = arInvestues.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
      const arInvestuesValue = arInvestues.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
      
      // DIAMANTA (category: dijamant, unit: piece)
      const diamanta = items.filter(item => item.category === 'dijamant' && item.unit === 'piece');
      const diamantaQuantity = diamanta.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
      const diamantaValue = diamanta.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
      
      // VLERA TOTALE (all items)
      const totalValue = items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
      
      return {
        totalItems: items.length,
        stoliAri: { quantity: stoliAriQuantity, value: stoliAriValue },
        ariVjeter: { quantity: ariVjeterQuantity, value: ariVjeterValue },
        arInvestues: { quantity: arInvestuesQuantity, value: arInvestuesValue },
        diamanta: { quantity: diamantaQuantity, value: diamantaValue },
        totalValue
      };
    };

    const stats = calculateStats();
    
    // Helper function to format currency
    const formatCurrency = (value) => {
      return parseFloat(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // Helper function to format currency without decimals
    const formatCurrencyNoDecimals = (value) => {
      return Math.round(parseFloat(value || 0)).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    };

    // Helper function to format whole number (no decimals)
    const formatWholeNumber = (value) => {
      return Math.round(parseFloat(value || 0)).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    };

    // Category name mapping
    const categoryMap = {
      stoli: 'Stoli Ari',
      blerje: 'Ari i Vjetër',
      investues: 'Ar Investues',
      dijamant: 'Diamanta'
    };

    // Create PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="stoqet-${date}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add error handler for PDF stream
    doc.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF generation failed' });
      }
    });
    
    // Header Section
    const headerY = 50;
    
    // Company Info (Left Side)
    doc.fontSize(16).font('Helvetica-Bold').text(companySettings?.name || 'Company Name', 30, headerY);
    let currentY = headerY + 25;
    doc.fontSize(8).font('Helvetica');
    if (companySettings?.address) {
      doc.text(companySettings.address, 30, currentY);
      currentY += 12;
    }
    if (companySettings?.country) {
      doc.text(companySettings.country, 30, currentY);
      currentY += 12;
    }
    if (companySettings?.phone || companySettings?.email) {
      const contact = [companySettings?.phone && `Tel: ${companySettings.phone}`, companySettings?.email].filter(Boolean).join(' • ');
      doc.text(contact, 30, currentY);
      currentY += 12;
    }
    if (companySettings?.bank) {
      doc.text(`Banka: ${companySettings.bank}`, 30, currentY);
      currentY += 12;
    }
    if (companySettings?.iban) {
      doc.text(`Xhirollogaria (IBAN): ${companySettings.iban}`, 30, currentY);
      currentY += 12;
    }
    if (companySettings?.nipt) {
      doc.text(`NIPT: ${companySettings.nipt}`, 30, currentY);
    }
    
    // Report Details (Right Side)
    const rightX = 350;
    doc.fontSize(18).font('Helvetica-Bold').text('STOQET NË DISPOZICION', rightX, headerY, { align: 'right', width: 200 });
    // Add more space after title to prevent overlap (title is 18pt, so need ~25-30pt for line height)
    let rightY = headerY + 45;
    const now = new Date();
    doc.fontSize(10).font('Helvetica');
    // Format date as MM/DD/YYYY
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    doc.text(`${month}/${day}/${year}`, rightX, rightY, { align: 'right', width: 200 });
    rightY += 15;
    // Format time as HH:MM AM/PM
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    doc.text(`${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`, rightX, rightY, { align: 'right', width: 200 });
    rightY += 15;
    doc.text(`Artikuj: ${stats.totalItems}`, rightX, rightY, { align: 'right', width: 200 });
    
    // Summary Section
    doc.moveDown(2);
    const summaryY = doc.y;
    const summaryBoxWidth = 90;
    const summaryBoxHeight = 50;
    const summaryGap = 5;
    const summaryStartX = 30;
    
    // STOLI ARI
    doc.rect(summaryStartX, summaryY, summaryBoxWidth, summaryBoxHeight).stroke('#f97316');
    doc.fontSize(8).font('Helvetica-Bold').text('STOLI ARI', summaryStartX + 5, summaryY + 5, { width: summaryBoxWidth - 10 });
    doc.fontSize(10).font('Helvetica-Bold').text(`${formatWholeNumber(stats.stoliAri.quantity)}g`, summaryStartX + 5, summaryY + 15, { width: summaryBoxWidth - 10 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#f97316').text(`${formatCurrencyNoDecimals(stats.stoliAri.value)} MKD`, summaryStartX + 5, summaryY + 30, { width: summaryBoxWidth - 10 });
    doc.fillColor('black');
    
    // ARI I VJETËR
    const box2X = summaryStartX + summaryBoxWidth + summaryGap;
    doc.rect(box2X, summaryY, summaryBoxWidth, summaryBoxHeight).stroke('#92400e');
    doc.fontSize(8).font('Helvetica-Bold').text('ARI I VJETËR', box2X + 5, summaryY + 5, { width: summaryBoxWidth - 10 });
    doc.fontSize(10).font('Helvetica-Bold').text(`${formatWholeNumber(stats.ariVjeter.quantity)}g`, box2X + 5, summaryY + 15, { width: summaryBoxWidth - 10 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#92400e').text(`${formatCurrencyNoDecimals(stats.ariVjeter.value)} MKD`, box2X + 5, summaryY + 30, { width: summaryBoxWidth - 10 });
    doc.fillColor('black');
    
    // AR INVESTUES
    const box3X = box2X + summaryBoxWidth + summaryGap;
    doc.rect(box3X, summaryY, summaryBoxWidth, summaryBoxHeight).stroke('#f97316');
    doc.fontSize(8).font('Helvetica-Bold').text('AR INVESTUES', box3X + 5, summaryY + 5, { width: summaryBoxWidth - 10 });
    doc.fontSize(10).font('Helvetica-Bold').text(`${formatWholeNumber(stats.arInvestues.quantity)} copë`, box3X + 5, summaryY + 15, { width: summaryBoxWidth - 10 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#f97316').text(`${formatCurrencyNoDecimals(stats.arInvestues.value)} MKD`, box3X + 5, summaryY + 30, { width: summaryBoxWidth - 10 });
    doc.fillColor('black');
    
    // DIAMANTA
    const box4X = box3X + summaryBoxWidth + summaryGap;
    doc.rect(box4X, summaryY, summaryBoxWidth, summaryBoxHeight).stroke('#ec4899');
    doc.fontSize(8).font('Helvetica-Bold').text('DIAMANTA', box4X + 5, summaryY + 5, { width: summaryBoxWidth - 10 });
    doc.fontSize(10).font('Helvetica-Bold').text(`${formatWholeNumber(stats.diamanta.quantity)} copë`, box4X + 5, summaryY + 15, { width: summaryBoxWidth - 10 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ec4899').text(`${formatCurrencyNoDecimals(stats.diamanta.value)} MKD`, box4X + 5, summaryY + 30, { width: summaryBoxWidth - 10 });
    doc.fillColor('black');
    
    // VLERA TOTALE
    const box5X = box4X + summaryBoxWidth + summaryGap;
    doc.rect(box5X, summaryY, summaryBoxWidth, summaryBoxHeight).stroke('#10b981');
    doc.fontSize(8).font('Helvetica-Bold').text('VLERA TOTALE', box5X + 5, summaryY + 5, { width: summaryBoxWidth - 10 });
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#10b981').text(`${formatCurrencyNoDecimals(stats.totalValue)} MKD`, box5X + 5, summaryY + 20, { width: summaryBoxWidth - 10 });
    doc.fillColor('black');
    
    // Table Section
    doc.moveDown(3);
    const tableTop = doc.y;
    const itemHeight = 18;
    const tableStartX = 30;
    const tableEndX = 565; // Full width with 30pt margins (595 - 30*2 = 535, plus buffer)
    
    // Column widths - adjusted to fit within page boundaries
    const colWidths = {
      num: 20,
      produkti: 90,
      serial: 55,
      karat: 30,
      sasia: 45,
      njesia: 45,
      cmimi: 65,
      totali: 70,
      kategoria: 55
    };
    
    // Spacing between columns
    const spacingAfterSasia = 5;
    const spacingAfterTotali = 10;
    
    const colX = {
      num: tableStartX,
      produkti: tableStartX + colWidths.num,
      serial: tableStartX + colWidths.num + colWidths.produkti,
      karat: tableStartX + colWidths.num + colWidths.produkti + colWidths.serial,
      sasia: tableStartX + colWidths.num + colWidths.produkti + colWidths.serial + colWidths.karat,
      njesia: tableStartX + colWidths.num + colWidths.produkti + colWidths.serial + colWidths.karat + colWidths.sasia + spacingAfterSasia,
      cmimi: tableStartX + colWidths.num + colWidths.produkti + colWidths.serial + colWidths.karat + colWidths.sasia + spacingAfterSasia + colWidths.njesia,
      totali: tableStartX + colWidths.num + colWidths.produkti + colWidths.serial + colWidths.karat + colWidths.sasia + spacingAfterSasia + colWidths.njesia + colWidths.cmimi,
      kategoria: tableStartX + colWidths.num + colWidths.produkti + colWidths.serial + colWidths.karat + colWidths.sasia + spacingAfterSasia + colWidths.njesia + colWidths.cmimi + colWidths.totali + spacingAfterTotali
    };
    
    // Table Header
    doc.font('Helvetica-Bold').fontSize(7);
    doc.text('#', colX.num, tableTop, { width: colWidths.num });
    doc.text('PRODUKTI', colX.produkti, tableTop, { width: colWidths.produkti });
    doc.text('NR. SERIK', colX.serial, tableTop, { width: colWidths.serial });
    doc.text('KARATI', colX.karat, tableTop, { width: colWidths.karat });
    doc.text('SASIA', colX.sasia, tableTop, { width: colWidths.sasia, align: 'right' });
    doc.text('NJËSIA', colX.njesia, tableTop, { width: colWidths.njesia });
    doc.text('ÇMIMI', colX.cmimi, tableTop, { width: colWidths.cmimi, align: 'right' });
    doc.text('TOTALI', colX.totali, tableTop, { width: colWidths.totali, align: 'right' });
    doc.text('KATEGORIA', colX.kategoria, tableTop, { width: colWidths.kategoria });
    
    // Draw header line - extend to the end of the last column
    const headerLineEndX = colX.kategoria + colWidths.kategoria;
    doc.moveTo(tableStartX, tableTop + 12).lineTo(headerLineEndX, tableTop + 12).stroke();
    
    // Table Rows
    let yPos = tableTop + 20;
    doc.font('Helvetica').fontSize(7);
    
    items.forEach((item, index) => {
      // Check if we need a new page
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      const itemNum = index + 1;
      const produkti = item.name || '-';
      const serial = item.serial_number || '-';
      const karat = item.karat || '-';
      const sasia = formatWholeNumber(item.quantity);
      const njesia = item.unit === 'gram' ? 'Gram' : 'Copë';
      const cmimi = `${formatCurrency(item.price)} MKD`;
      const totali = `${formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0))} MKD`;
      const kategoria = categoryMap[item.category] || item.category;
      
      doc.text(itemNum.toString(), colX.num, yPos, { width: colWidths.num });
      doc.text(produkti, colX.produkti, yPos, { width: colWidths.produkti });
      doc.text(serial, colX.serial, yPos, { width: colWidths.serial });
      doc.text(karat, colX.karat, yPos, { width: colWidths.karat });
      doc.text(sasia, colX.sasia, yPos, { width: colWidths.sasia, align: 'right' });
      doc.text(njesia, colX.njesia, yPos, { width: colWidths.njesia });
      doc.text(cmimi, colX.cmimi, yPos, { width: colWidths.cmimi, align: 'right' });
      doc.text(totali, colX.totali, yPos, { width: colWidths.totali, align: 'right' });
      doc.text(kategoria, colX.kategoria, yPos, { width: colWidths.kategoria });
      
      yPos += itemHeight;
    });
    
    // Finalize PDF
    doc.end();
  } catch (error) {
    next(error);
  }
};

