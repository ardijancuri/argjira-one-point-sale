import pool from '../utils/db.js';
import { CompanySettings } from './CompanySettings.js';
import { StockItem } from './StockItem.js';
import { Invoice } from './Invoice.js';

export class FiscalSale {
  static async create(data) {
    const { items, payment_method, with_invoice, client_id, status, sale_type } = data;

    // Validate sale_type
    const validSaleTypes = ['normal', 'wholesale', 'investor'];
    const finalSaleType = validSaleTypes.includes(sale_type) ? sale_type : 'normal';

    // Validate that all items have valid prices
    for (const item of items) {
      const price = parseFloat(item.price);
      if (!item.price || isNaN(price) || price <= 0) {
        throw new Error(`Artikulli "${item.name || 'Unknown'}" ka çmim të pavlefshëm (${item.price}). Çmimi duhet të jetë më i madh se 0.`);
      }
    }

    const total = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseFloat(item.quantity)), 0);

    // Validate stock availability
    for (const item of items) {
      const stockItem = await StockItem.findById(item.stock_item_id);
      if (!stockItem || parseFloat(stockItem.quantity) < parseFloat(item.quantity)) {
        throw new Error(`Nuk ka mjaftueshëm stok për ${stockItem?.name || 'artikullin'}`);
      }
    }
    
    // Format time as HH:mm (exactly 5 characters)
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const time = `${hours}:${minutes}`;
    
    // Use current timestamp to ensure correct date (explicitly set to avoid timezone issues)
    // This ensures the order date matches the actual date when the order was created
    const saleDate = now;
    
    // Create fiscal sale with explicit date
    const result = await pool.query(
      `INSERT INTO fiscal_sales (date, total, payment_method, with_invoice, client_id, time, sale_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [saleDate, total, payment_method, with_invoice || false, client_id || null, time, finalSaleType]
    );
    
    const fiscalSale = result.rows[0];
    
    // Create fiscal sale items and update stock
    for (const item of items) {
      await pool.query(
        `INSERT INTO fiscal_sale_items (fiscal_sale_id, stock_item_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [fiscalSale.id, item.stock_item_id, item.quantity, item.price]
      );
      
      // Update stock quantity
      await StockItem.updateQuantity(item.stock_item_id, -parseFloat(item.quantity));
    }
    
    // Update cash if cash payment
    if (payment_method === 'cash') {
      await CompanySettings.updateCash(total);
    }
    
    // Create invoice if with_invoice is true
    let invoiceId = null;
    if (with_invoice && client_id) {
      // Get fiscal sale items with stock item details
      const saleItems = await this.findItemsBySaleId(fiscalSale.id);
      
      // Convert fiscal sale items to invoice items format
      const invoiceItems = saleItems.map(item => {
        const subtotal = parseFloat(item.quantity) * parseFloat(item.price);
        const taxRate = 0;
        const taxAmount = 0;
        const itemTotal = subtotal;
        
        return {
          stock_item_id: item.stock_item_id,
          product_name: item.stock_item_name || 'Artikull',
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
          tax_rate: taxRate,
          subtotal: subtotal,
          taxAmount: taxAmount,
          total: itemTotal
        };
      });
      
      // Generate invoice number
      const invoiceNumber = `INV-POS-${Date.now()}`;
      
      // Get fiscal sale date in local timezone (avoid UTC conversion issues)
      let saleDate;
      if (fiscalSale.date instanceof Date) {
        const d = fiscalSale.date;
        saleDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        const d = new Date(fiscalSale.date);
        saleDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      
      // Create outgoing invoice
      // If status is "e paguar", set balance to 0, otherwise balance equals total
      const invoiceTotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      const invoiceBalance = status === 'e paguar' ? 0 : invoiceTotal;
      
      const invoice = await Invoice.create({
        type: 'out',
        number: invoiceNumber,
        client_id: client_id,
        date: saleDate,
        due_date: null,
        payment_method: payment_method,
        items: invoiceItems,
        description: `Faturë nga shitje fiskale - ${invoiceNumber}`,
        balance: invoiceBalance
      });
      
      invoiceId = invoice.id;
      
      // Update fiscal sale with invoice_id
      await pool.query(
        `UPDATE fiscal_sales SET invoice_id = $1 WHERE id = $2`,
        [invoiceId, fiscalSale.id]
      );
      
      fiscalSale.invoice_id = invoiceId;
    }
    
    return fiscalSale;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT fs.*, c.name as client_name, c.type as client_type,
             COALESCE(fs.time, TO_CHAR(fs.date, 'HH24:MI')) as time,
             (SELECT COUNT(*) FROM fiscal_sale_items WHERE fiscal_sale_id = fs.id) as items_count,
             i.number as invoice_number
      FROM fiscal_sales fs
      LEFT JOIN clients c ON fs.client_id = c.id
      LEFT JOIN invoices i ON fs.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (filters.date) {
      // Filter by date range in local timezone (00:00:00 to 23:59:59)
      query += ` AND fs.date >= $${paramIndex}::date AND fs.date < ($${paramIndex}::date + INTERVAL '1 day')`;
      params.push(filters.date);
      paramIndex++;
    }
    
    if (filters.clientType === 'retail') {
      // Include retail client sales OR normal sales (which may not have a client)
      query += ` AND (c.type = $${paramIndex} OR fs.sale_type = 'normal')`;
      params.push('retail');
      paramIndex++;
    } else if (filters.clientType) {
      // For other client types, use existing logic
      query += ` AND c.type = $${paramIndex}`;
      params.push(filters.clientType);
      paramIndex++;
    }
    
    query += ' ORDER BY fs.date DESC, fs.time DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findItemsBySaleId(saleId) {
    const result = await pool.query(
      `SELECT fsi.*, si.name as stock_item_name
       FROM fiscal_sale_items fsi
       LEFT JOIN stock_items si ON fsi.stock_item_id = si.id
       WHERE fsi.fiscal_sale_id = $1`,
      [saleId]
    );
    return result.rows;
  }

  /**
   * Return stock items to inventory for a storno (refund) operation
   */
  static async returnStockForStorno(fiscalSaleId) {
    // Get fiscal sale to check payment method and total
    const fiscalSaleResult = await pool.query(
      'SELECT * FROM fiscal_sales WHERE id = $1',
      [fiscalSaleId]
    );
    
    if (fiscalSaleResult.rows.length === 0) {
      throw new Error('Fiscal sale not found');
    }
    
    const fiscalSale = fiscalSaleResult.rows[0];
    
    // Check if sale is already storno'd
    if (fiscalSale.storno === true) {
      throw new Error('Kjo shitje është tashmë e storno\'d. Nuk mund të storno\'het dy herë.');
    }
    
    // Get fiscal sale items
    const saleItems = await this.findItemsBySaleId(fiscalSaleId);
    
    if (saleItems.length === 0) {
      throw new Error('No items found for this fiscal sale');
    }
    
    // Return each item to stock
    for (const item of saleItems) {
      if (item.stock_item_id) {
        await StockItem.updateQuantity(item.stock_item_id, parseFloat(item.quantity));
      }
    }
    
    // If payment was cash, reduce cash (refund)
    if (fiscalSale.payment_method === 'cash') {
      await CompanySettings.updateCash(-parseFloat(fiscalSale.total));
    }
    
    // Mark the sale as storno'd
    await pool.query(
      'UPDATE fiscal_sales SET storno = true, storno_date = CURRENT_TIMESTAMP WHERE id = $1',
      [fiscalSaleId]
    );
    
    // If the sale has an associated invoice, delete it
    // Skip stock return since we've already returned stock from fiscal sale items
    if (fiscalSale.invoice_id) {
      try {
        await Invoice.delete(fiscalSale.invoice_id, true); // true = skipStockReturn
      } catch (invoiceError) {
        // Log error but don't fail the storno operation
        // The invoice might have payments or other constraints
        console.error('Failed to delete invoice during storno:', invoiceError.message);
        // Still continue with storno success
      }
    }
    
    return { success: true, itemsReturned: saleItems.length, storno: true };
  }

  static async getDailyStats(date) {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(total), 0) as total_amount
       FROM fiscal_sales
       WHERE date >= $1::date AND date < ($1::date + INTERVAL '1 day')`,
      [date]
    );
    return result.rows[0];
  }

  /**
   * Generate invoice for an existing fiscal sale
   */
  static async generateInvoice(fiscalSaleId) {
    // Get fiscal sale
    const fiscalSale = await pool.query(
      `SELECT fs.*, c.name as client_name
       FROM fiscal_sales fs
       LEFT JOIN clients c ON fs.client_id = c.id
       WHERE fs.id = $1`,
      [fiscalSaleId]
    );
    
    if (fiscalSale.rows.length === 0) {
      throw new Error('Fiscal sale not found');
    }
    
    const sale = fiscalSale.rows[0];
    
    // Check if invoice already exists
    if (sale.invoice_id) {
      throw new Error('Invoice already exists for this fiscal sale');
    }
    
    // Check if client_id exists
    if (!sale.client_id) {
      throw new Error('Fiscal sale must have a client to generate invoice');
    }
    
    // Get fiscal sale items with stock item details
    const saleItems = await this.findItemsBySaleId(fiscalSaleId);
    
    if (saleItems.length === 0) {
      throw new Error('No items found for this fiscal sale');
    }
    
    // Convert fiscal sale items to invoice items format
    const invoiceItems = saleItems.map(item => {
      const subtotal = parseFloat(item.quantity) * parseFloat(item.price);
      const taxRate = 18; // Default tax rate for POS sales
      const taxAmount = subtotal * (taxRate / 100);
      const itemTotal = subtotal + taxAmount;
      
      return {
        stock_item_id: item.stock_item_id,
        product_name: item.stock_item_name || 'Artikull',
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        tax_rate: taxRate,
        subtotal: subtotal,
        taxAmount: taxAmount,
        total: itemTotal
      };
    });
    
    // Generate invoice number
    const invoiceNumber = `INV-POS-${Date.now()}`;
    
    // Create outgoing invoice
    const invoice = await Invoice.create({
      type: 'out',
      number: invoiceNumber,
      client_id: sale.client_id,
      date: sale.date.toISOString().split('T')[0],
      due_date: null,
      payment_method: sale.payment_method,
      items: invoiceItems,
      description: `Faturë nga shitje fiskale - ${invoiceNumber}`
    });
    
    // Update fiscal sale with invoice_id
    await pool.query(
      `UPDATE fiscal_sales SET invoice_id = $1 WHERE id = $2`,
      [invoice.id, fiscalSaleId]
    );
    
    // Return updated fiscal sale
    const updated = await pool.query(
      `SELECT fs.*, c.name as client_name,
              COALESCE(fs.time, TO_CHAR(fs.date, 'HH24:MI')) as time,
              (SELECT COUNT(*) FROM fiscal_sale_items WHERE fiscal_sale_id = fs.id) as items_count
       FROM fiscal_sales fs
       LEFT JOIN clients c ON fs.client_id = c.id
       WHERE fs.id = $1`,
      [fiscalSaleId]
    );
    
    return updated.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT fs.*, c.name as client_name,
              COALESCE(fs.time, TO_CHAR(fs.date, 'HH24:MI')) as time,
              (SELECT COUNT(*) FROM fiscal_sale_items WHERE fiscal_sale_id = fs.id) as items_count,
              i.number as invoice_number
       FROM fiscal_sales fs
       LEFT JOIN clients c ON fs.client_id = c.id
       LEFT JOIN invoices i ON fs.invoice_id = i.id
       WHERE fs.id = $1`,
      [id]
    );
    return result.rows[0];
  }
}

