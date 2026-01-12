import pool from '../utils/db.js';
import { Invoice } from './Invoice.js';

export class Payment {
  static async create(data) {
    const { invoice_id, amount, date, note } = data;
    
    // Create payment record
    const result = await pool.query(
      `INSERT INTO payments (invoice_id, amount, date, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [invoice_id, amount, date, note || null]
    );
    
    // Update invoice balance
    await Invoice.updateBalance(invoice_id, amount);
    
    return result.rows[0];
  }

  static async findAllByInvoiceId(invoiceId) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE invoice_id = $1 ORDER BY date DESC, created_at DESC',
      [invoiceId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async delete(id) {
    const payment = await this.findById(id);
    if (!payment) throw new Error('Payment not found');
    
    // Restore invoice balance
    await pool.query(
      `UPDATE invoices 
       SET balance = balance + $1,
           status = CASE WHEN (balance + $1) >= 0.01 THEN 'unpaid'::invoice_status ELSE 'paid'::invoice_status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [payment.amount, payment.invoice_id]
    );
    
    await pool.query('DELETE FROM payments WHERE id = $1', [id]);
  }

  static async findLastByInvoiceId(invoiceId) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC LIMIT 1',
      [invoiceId]
    );
    return result.rows[0];
  }
}

