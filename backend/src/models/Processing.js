import pool from '../utils/db.js';
import { Invoice } from './Invoice.js';
import { v4 as uuidv4 } from 'uuid';

export class Processing {
  /**
   * Create a complete 4-phase processing record
   * Phase 1: Pranim (Receive from client)
   * Phase 2: Dërgim (Send to workshop)
   * Phase 3: Kthim (Return from workshop)
   * Phase 4: Shitje (Sell to client)
   */
  static async create(data) {
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
    } = data;
    
    // Calculate totals
    const total_in = parseFloat(quantity) * parseFloat(price_in);
    const total_workshop = parseFloat(quantity) * parseFloat(price_workshop);
    const subtotal_sale = parseFloat(quantity) * parseFloat(price_sale);
    const tax_rate_value = parseFloat(tax_rate) || 0;
    const tax_amount_sale = subtotal_sale * (tax_rate_value / 100);
    const total_sale = subtotal_sale + tax_amount_sale;
    const profit = subtotal_sale - total_workshop; // Revenue (without tax) - Cost
    
    // Generate invoice numbers if not provided
    const invoiceInNumber = invoice_in || `Doc-${new Date().getFullYear()}-${Date.now()}`;
    const invoiceOutNumber = invoice_out || `FD-${new Date().getFullYear()}-${Date.now()}`;
    const docOutNumber = invoice_out || invoiceOutNumber;
    // Ensure doc_in is provided (should always come from frontend)
    const docInNumber = doc_in || `FletePranimi-${new Date().getFullYear()}-${Date.now()}`;
    
    // Create Invoice IN (from workshop - processing service)
    const invoiceIn = await Invoice.create({
      type: 'in',
      number: invoiceInNumber,
      supplier_invoice_number: invoice_workshop,
      client_id: workshop_id,
      date: date_return,
      due_date: null,
      payment_method: 'bank',
      items: [{
        stock_item_id: null,
        product_name: 'Ari i Përpunuar 585',
        quantity: parseFloat(quantity),
        price: parseFloat(price_workshop),
        tax_rate: 0,
        subtotal: total_workshop,
        taxAmount: 0,
        total: total_workshop
      }],
      description: `Përpunim Qarkullim - Kthim nga Puntoria`
    });
    
    // Create Invoice OUT (to client - sale)
    const invoiceOut = await Invoice.create({
      type: 'out',
      number: invoiceOutNumber,
      client_id: client_id,
      date: date_sale,
      due_date: null,
      payment_method: 'bank',
      items: [{
        stock_item_id: null,
        product_name: 'Ari i Përpunuar 585',
        quantity: parseFloat(quantity),
        price: parseFloat(price_sale),
        tax_rate: tax_rate_value,
        subtotal: subtotal_sale,
        taxAmount: tax_amount_sale,
        total: total_sale
      }],
      description: `Shitje - Ari i Përpunuar`
    });
    
    // Create processing record with all 4 phases
    // Note: We set both old fields (date, receive_price, service_price) and new fields for compatibility
    const result = await pool.query(
      `INSERT INTO processing_records (
        client_id, workshop_id, client_doc,
        doc_in, doc_send, invoice_workshop,
        date, date_in, date_send, date_return, date_sale,
        quantity, receive_price, service_price,
        price_in, total_in,
        price_workshop, total_workshop,
        price_sale, subtotal_sale, tax_amount_sale, total_sale,
        profit, doc_out, invoice_in_id, invoice_out_id,
        status, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        client_id,
        workshop_id,
        client_doc || null,
        docInNumber,
        doc_send || null,
        invoice_workshop || null,
        date_in, // date field (backward compatibility)
        date_in, // date_in field (4-phase)
        date_send || null,
        date_return,
        date_sale,
        parseFloat(quantity),
        parseFloat(price_in), // receive_price (backward compatibility)
        parseFloat(price_sale), // service_price (backward compatibility)
        parseFloat(price_in), // price_in (4-phase)
        total_in,
        parseFloat(price_workshop),
        total_workshop,
        parseFloat(price_sale),
        subtotal_sale,
        tax_amount_sale,
        total_sale,
        profit,
        docOutNumber, // doc_out field
        invoiceIn.id,
        invoiceOut.id,
        'completed',
        description || null
      ]
    );
    
    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT pr.*, 
              c.name as client_name,
              w.name as workshop_name,
              COALESCE(pr.date_in, pr.date) as date_in,
              i_in.status as invoice_in_status,
              i_in.balance as invoice_in_balance,
              i_in.number as invoice_in,
              i_out.status as invoice_status,
              i_out.balance as invoice_balance,
              i_out.number as invoice_out
       FROM processing_records pr
       LEFT JOIN clients c ON pr.client_id = c.id
       LEFT JOIN clients w ON pr.workshop_id = w.id
       LEFT JOIN invoices i_in ON pr.invoice_in_id = i_in.id
       LEFT JOIN invoices i_out ON pr.invoice_out_id = i_out.id
       ORDER BY COALESCE(pr.date_in, pr.date) DESC, pr.created_at DESC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT pr.*, 
              c.name as client_name,
              w.name as workshop_name,
              COALESCE(pr.date_in, pr.date) as date_in,
              i_in.number as invoice_in,
              i_out.number as invoice_out
       FROM processing_records pr
       LEFT JOIN clients c ON pr.client_id = c.id
       LEFT JOIN clients w ON pr.workshop_id = w.id
       LEFT JOIN invoices i_in ON pr.invoice_in_id = i_in.id
       LEFT JOIN invoices i_out ON pr.invoice_out_id = i_out.id
       WHERE pr.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    // Get the processing record to find linked invoices
    const record = await this.findById(id);
    if (!record) {
      throw new Error('Processing record not found');
    }

    // Check if the outgoing invoice (Faturë Dalëse) is unpaid
    if (record.invoice_out_id) {
      const invoiceResult = await pool.query(
        'SELECT status, balance, number FROM invoices WHERE id = $1',
        [record.invoice_out_id]
      );
      
      if (invoiceResult.rows.length > 0) {
        const invoice = invoiceResult.rows[0];
        // Check if invoice is unpaid (status = 'unpaid' OR balance > 0)
        if (invoice.status === 'unpaid' || parseFloat(invoice.balance) > 0.01) {
          throw new Error(`Nuk mund të fshini përpunimin sepse fatura dalëse "${invoice.number}" është e papaguar. Ju lutem paguani faturën fillimisht.`);
        }
      }
    }

    // Store invoice IDs before deleting the processing record
    const invoiceInId = record.invoice_in_id;
    const invoiceOutId = record.invoice_out_id;

    // Delete the processing record first (this removes the foreign key references)
    await pool.query('DELETE FROM processing_records WHERE id = $1', [id]);

    // Now delete the linked invoices (if they exist)
    if (invoiceInId) {
      try {
        await pool.query('DELETE FROM invoices WHERE id = $1', [invoiceInId]);
      } catch (error) {
        // If invoice deletion fails (e.g., has payments), log but don't fail the whole operation
        console.error('Failed to delete invoice_in:', error.message);
      }
    }
    if (invoiceOutId) {
      try {
        await pool.query('DELETE FROM invoices WHERE id = $1', [invoiceOutId]);
      } catch (error) {
        // If invoice deletion fails (e.g., has payments), log but don't fail the whole operation
        console.error('Failed to delete invoice_out:', error.message);
      }
    }
  }
}
