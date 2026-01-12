import pool from '../utils/db.js';
import { calculateInvoiceTotals } from '../utils/calculations.js';

export class Invoice {
  /**
   * Generate a unique invoice number based on type
   * Format: INV-OUT-YYYYMMDD-HHMMSS or INV-IN-YYYYMMDD-HHMMSS
   */
  static generateInvoiceNumber(type) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const prefix = type === 'out' ? 'INV-OUT' : 'INV-IN';
    return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * Generate a unique supplier invoice number
   * Format: SUP-YYYYMMDD-HHMMSS
   */
  static generateSupplierInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `SUP-${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  static async create(data) {
    const { type, number, supplier_invoice_number, client_id, date, due_date, 
            payment_method, items, description, balance } = data;
    
    // Calculate totals
    const totals = calculateInvoiceTotals(items);
    
    // Use provided balance or default to total (unpaid)
    const invoiceBalance = balance !== undefined ? balance : totals.total;
    const invoiceStatus = invoiceBalance <= 0.01 ? 'paid' : 'unpaid';
    
    // Auto-generate invoice number if not provided
    const invoiceNumber = number || this.generateInvoiceNumber(type);
    
    // Auto-generate supplier invoice number for 'in' type if not provided
    const supplierInvoiceNumber = supplier_invoice_number || 
      (type === 'in' ? this.generateSupplierInvoiceNumber() : null);
    
    const result = await pool.query(
      `INSERT INTO invoices (type, number, supplier_invoice_number, client_id, date, 
                             due_date, payment_method, subtotal, tax_amount, total, balance, 
                             status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [type, invoiceNumber, supplierInvoiceNumber, client_id, date, 
       due_date || null, payment_method || 'bank', totals.subtotal, totals.taxAmount, 
       totals.total, invoiceBalance, invoiceStatus, description || null]
    );
    
    const invoice = result.rows[0];
    
    // Insert invoice items
    for (const item of items) {
      await pool.query(
        `INSERT INTO invoice_items (invoice_id, stock_item_id, product_name, quantity, price, 
                                    tax_rate, subtotal, tax_amount, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [invoice.id, item.stock_item_id || null, item.product_name || null, item.quantity, 
         item.price, item.tax_rate, item.subtotal, item.taxAmount, item.total]
      );
    }
    
    return invoice;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT i.*, c.name as client_name, c.type as client_type
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN fiscal_sales fs ON i.id = fs.invoice_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (filters.type) {
      query += ` AND i.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }
    
    // Exclude only POS invoices with sale_type = 'normal' when excludePosInvoices is true and type is 'out'
    // Show: manual invoices (fs.id IS NULL) OR POS invoices with sale_type != 'normal'
    if (filters.excludePosInvoices && filters.type === 'out') {
      query += ` AND (fs.id IS NULL OR fs.sale_type IS NULL OR fs.sale_type != $${paramIndex})`;
      params.push('normal');
      paramIndex++;
    }
    
    if (filters.status === 'unpaid') {
      query += ' AND i.balance > 0';
    } else if (filters.status === 'paid') {
      query += ' AND i.balance = 0';
    }
    
    if (filters.dateFrom) {
      query += ` AND i.date >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }
    
    if (filters.dateTo) {
      query += ` AND i.date <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }
    
    query += ' ORDER BY i.date DESC, i.created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT i.*, c.name as client_name, c.id_number as client_id_number, 
              c.phone as client_phone, c.email as client_email, c.address as client_address
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findItemsByInvoiceId(invoiceId) {
    const result = await pool.query(
      `SELECT ii.*, si.name as stock_item_name, si.serial_number
       FROM invoice_items ii
       LEFT JOIN stock_items si ON ii.stock_item_id = si.id
       WHERE ii.invoice_id = $1
       ORDER BY ii.created_at`,
      [invoiceId]
    );
    return result.rows;
  }

  static async findUnpaid(limit = 6) {
    const result = await pool.query(
      `SELECT i.*, c.name as client_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.balance > 0
       ORDER BY i.date DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async updateBalance(id, amount) {
    const result = await pool.query(
      `UPDATE invoices 
       SET balance = balance - $1, 
           status = CASE WHEN (balance - $1) <= 0.01 THEN 'paid'::invoice_status ELSE 'unpaid'::invoice_status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [amount, id]
    );
    return result.rows[0];
  }

  static async delete(id, skipStockReturn = false) {
    // Get invoice to check type before deletion
    const invoice = await this.findById(id);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // If it's an outgoing invoice (sale), return items to stock before deletion
    // Skip stock return if flag is set (e.g., when deleting from storno context where stock is already returned)
    if (invoice.type === 'out' && !skipStockReturn) {
      const { StockItem } = await import('./StockItem.js');
      
      // Get invoice items
      const invoiceItems = await this.findItemsByInvoiceId(id);
      
      // Return each item to stock
      for (const item of invoiceItems) {
        if (item.stock_item_id) {
          await StockItem.updateQuantity(item.stock_item_id, parseFloat(item.quantity));
        }
      }
    }
    
    // Delete the invoice (this will cascade delete invoice_items due to ON DELETE CASCADE)
    await pool.query('DELETE FROM invoices WHERE id = $1', [id]);
  }

  static async update(id, data) {
    const { type, number, supplier_invoice_number, client_id, date, due_date, 
            payment_method, items, description } = data;
    
    // Get existing invoice and items
    const existingInvoice = await this.findById(id);
    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }
    
    const existingItems = await this.findItemsByInvoiceId(id);
    
    // Calculate new totals
    const totals = calculateInvoiceTotals(items || []);
    
    // Calculate new balance based on payments already made
    // paid_amount = old_total - old_balance (how much was paid)
    // new_balance = new_total - paid_amount (remaining to pay)
    const oldTotal = parseFloat(existingInvoice.subtotal) || parseFloat(existingInvoice.total) || 0;
    const oldBalance = parseFloat(existingInvoice.balance) || 0;
    const paidAmount = Math.max(0, oldTotal - oldBalance);
    const newBalance = Math.max(0, totals.total - paidAmount);
    const newStatus = newBalance <= 0.01 ? 'paid' : 'unpaid';
    
    // Update invoice including balance and status
    const result = await pool.query(
      `UPDATE invoices 
       SET type = $1, number = $2, supplier_invoice_number = $3, client_id = $4, 
           date = $5, due_date = $6, payment_method = $7, subtotal = $8, 
           tax_amount = $9, total = $10, description = $11, balance = $12, 
           status = $13::invoice_status, updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [type || existingInvoice.type, number || existingInvoice.number, 
       supplier_invoice_number || existingInvoice.supplier_invoice_number,
       client_id || existingInvoice.client_id, date || existingInvoice.date,
       due_date || existingInvoice.due_date, payment_method || existingInvoice.payment_method,
       totals.subtotal, totals.taxAmount, totals.total, description || existingInvoice.description,
       newBalance, newStatus, id]
    );
    
    const updatedInvoice = result.rows[0];
    
    // Delete old items
    await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
    
    // Insert new items
    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO invoice_items (invoice_id, stock_item_id, product_name, quantity, price, 
                                      tax_rate, subtotal, tax_amount, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, item.stock_item_id || null, item.product_name || null, item.quantity, 
           item.price, item.tax_rate, item.subtotal, item.taxAmount, item.total]
        );
      }
    }
    
    // Handle stock adjustments for outgoing invoices (sales)
    if (existingInvoice.type === 'out') {
      const { StockItem } = await import('./StockItem.js');
      
      // Restore stock from old items
      for (const oldItem of existingItems) {
        if (oldItem.stock_item_id) {
          await StockItem.updateQuantity(oldItem.stock_item_id, parseFloat(oldItem.quantity));
        }
      }
      
      // Subtract stock from new items
      if (items && items.length > 0) {
        for (const newItem of items) {
          if (newItem.stock_item_id) {
            await StockItem.updateQuantity(newItem.stock_item_id, -parseFloat(newItem.quantity));
          }
        }
      }
    }
    
    // Handle stock adjustments for incoming invoices (purchases)
    if (existingInvoice.type === 'in') {
      const { StockItem } = await import('./StockItem.js');
      
      // Step 1: Reverse old stock additions using weighted average reversal
      for (const oldItem of existingItems) {
        if (oldItem.stock_item_id) {
          await StockItem.reverseWeightedAverageUpdate(
            oldItem.stock_item_id,
            parseFloat(oldItem.quantity),
            parseFloat(oldItem.price)
          );
        }
      }
      
      // Step 2: Apply new stock additions with weighted average
      if (items && items.length > 0) {
        for (const newItem of items) {
          if (newItem.stock_item_id) {
            await StockItem.updatePriceWithWeightedAverage(
              newItem.stock_item_id,
              parseFloat(newItem.quantity),
              parseFloat(newItem.price)
            );
          }
        }
      }
    }
    
    // Sync total to linked fiscal sale (POS order) if exists
    const fiscalSaleResult = await pool.query(
      'SELECT id FROM fiscal_sales WHERE invoice_id = $1',
      [id]
    );
    
    if (fiscalSaleResult.rows.length > 0) {
      // Update fiscal sale total to match invoice total
      await pool.query(
        'UPDATE fiscal_sales SET total = $1 WHERE invoice_id = $2',
        [totals.total, id]
      );
    }
    
    return updatedInvoice;
  }
}

