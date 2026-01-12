import pool from '../utils/db.js';
import { Invoice } from './Invoice.js';
import { StockItem } from './StockItem.js';
import { CompanySettings } from './CompanySettings.js';

export class Production {
  /**
   * Create a production record
   * This converts accumulated gold to finished products
   */
  static async create(data) {
    const {
      workshop_id,
      source_category,
      product_name,
      send_date,
      return_date,
      invoice_workshop,
      quantity,
      material_cost,
      labor_price,
      labor_tax_rate,
      labor_cost,
      total_cost,
      cost_per_gram
    } = data;
    
    // Create production record
    const result = await pool.query(
      `INSERT INTO productions (
        workshop_id, source_category, product_name,
        send_date, return_date, invoice_workshop,
        quantity, material_cost, labor_price, labor_tax_rate,
        labor_cost, total_cost, cost_per_gram,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        workshop_id,
        source_category,
        product_name,
        send_date,
        return_date,
        invoice_workshop || null,
        parseFloat(quantity),
        parseFloat(material_cost),
        parseFloat(labor_price),
        0,
        parseFloat(labor_cost),
        parseFloat(total_cost),
        parseFloat(cost_per_gram),
        'completed'
      ]
    );
    
    const production = result.rows[0];
    
    // Create invoice IN from workshop
    if (invoice_workshop) {
      await Invoice.create({
        type: 'in',
        number: `INV-PROD-${Date.now()}`,
        supplier_invoice_number: invoice_workshop,
        client_id: workshop_id,
        date: return_date,
        due_date: null,
        payment_method: 'bank',
        items: [{
          stock_item_id: null,
          product_name: `Punë Dore - ${product_name}`,
          quantity: parseFloat(quantity),
          price: parseFloat(labor_price),
          tax_rate: 0,
          subtotal: parseFloat(quantity) * parseFloat(labor_price),
          taxAmount: 0,
          total: parseFloat(quantity) * parseFloat(labor_price)
        }],
        description: `Shërbim Prodhimi - ${product_name}`
      });
    }
    
    // Reduce stock from source category (weighted reduction)
    const sourceStockItems = await pool.query(
      `SELECT * FROM stock_items 
       WHERE category = $1 AND quantity > 0 
       ORDER BY created_at ASC`,
      [source_category]
    );
    
    let remainingQty = parseFloat(quantity);
    for (const item of sourceStockItems.rows) {
      if (remainingQty <= 0) break;
      
      const qtyToReduce = Math.min(parseFloat(item.quantity), remainingQty);
      await StockItem.updateQuantity(item.id, -qtyToReduce);
      remainingQty -= qtyToReduce;
    }
    
    // Add finished product to stock in "Stoli Ari" category
    await StockItem.create({
      name: product_name,
      serial_number: null,
      quantity: parseFloat(quantity),
      karat: '585',
      unit: 'gram',
      price: parseFloat(cost_per_gram),
      category: 'stoli',
      tax_rate: 0
    });
    
    return production;
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT p.*, w.name as workshop_name
       FROM productions p
       LEFT JOIN clients w ON p.workshop_id = w.id
       ORDER BY p.return_date DESC, p.created_at DESC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT p.*, w.name as workshop_name
       FROM productions p
       LEFT JOIN clients w ON p.workshop_id = w.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }
}

