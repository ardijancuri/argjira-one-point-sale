import pool from '../utils/db.js';
import { CompanySettings } from './CompanySettings.js';
import { StockItem } from './StockItem.js';
import { Client } from './Client.js';

export class Purchase {
  static async create(data) {
    const { supplier_id, date, quantity, price, payment_method } = data;
    
    const total = parseFloat(quantity) * parseFloat(price);
    
    // Check cash availability if cash payment
    if (payment_method === 'cash') {
      const settings = await CompanySettings.get();
      if (parseFloat(settings.cash) < total) {
        throw new Error('Nuk ka mjaftueshëm cash në kasë!');
      }
      await CompanySettings.updateCash(-total);
    }
    
    // Create purchase record
    const result = await pool.query(
      `INSERT INTO purchases (supplier_id, date, quantity, price, total, payment_method, status, purchase_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [supplier_id, date, quantity, price, total, payment_method, 'completed', 'supplier']
    );
    
    // Add to stock (blerje category)
    const existing = await pool.query(
      'SELECT * FROM stock_items WHERE category = $1 LIMIT 1',
      ['blerje']
    );
    
    if (existing.rows.length > 0) {
      await StockItem.updatePriceWithWeightedAverage(
        existing.rows[0].id,
        parseFloat(quantity),
        parseFloat(price)
      );
    } else {
      await StockItem.create({
        name: 'Blerje Ari',
        serial_number: '',
        quantity: parseFloat(quantity),
        karat: '24k',
        unit: 'gram',
        price: parseFloat(price),
        category: 'blerje',
        tax_rate: 0
      });
    }
    
    return result.rows[0];
  }

  /**
   * Create a random client purchase
   * Auto-creates client if not exists
   */
  static async createRandomPurchase(data) {
    const {
      client_name,
      client_id_number,
      client_phone,
      date,
      quantity,
      price,
      category,
      karat,
      payment_method,
      notes
    } = data;
    
    const total = parseFloat(quantity) * parseFloat(price);
    
    // Check cash availability if cash payment
    if (payment_method === 'cash') {
      const settings = await CompanySettings.get();
      if (parseFloat(settings.cash) < total) {
        throw new Error('Nuk ka mjaftueshëm cash në kasë!');
      }
      await CompanySettings.updateCash(-total);
    }
    
    // Find or create client
    let client = await pool.query(
      'SELECT * FROM clients WHERE id_number = $1 LIMIT 1',
      [client_id_number]
    );
    
    let clientId;
    if (client.rows.length > 0) {
      clientId = client.rows[0].id;
    } else {
      // Create new random client
      const newClient = await Client.create({
        name: client_name,
        id_number: client_id_number,
        phone: client_phone || null,
        email: null,
        address: null,
        type: 'client' // Can be changed to 'random' if we add that type
      });
      clientId = newClient.id;
    }
    
    // Create purchase record
    const result = await pool.query(
      `INSERT INTO purchases (
        supplier_id, date, quantity, price, total, payment_method, 
        status, purchase_type, category, karat, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        clientId,
        date,
        parseFloat(quantity),
        parseFloat(price),
        total,
        payment_method,
        'completed',
        'random_client',
        category,
        karat || null,
        notes || null
      ]
    );
    
    // Add to stock with weighted average
    const stockItemName = `Ari ${karat || '585'} (${category})`;
    const existing = await pool.query(
      'SELECT * FROM stock_items WHERE category = $1 AND karat = $2 LIMIT 1',
      [category, karat || '585']
    );
    
    if (existing.rows.length > 0) {
      await StockItem.updatePriceWithWeightedAverage(
        existing.rows[0].id,
        parseFloat(quantity),
        parseFloat(price)
      );
    } else {
      await StockItem.create({
        name: stockItemName,
        serial_number: '',
        quantity: parseFloat(quantity),
        karat: karat || '585',
        unit: 'gram',
        price: parseFloat(price),
        category: category,
        tax_rate: 0
      });
    }
    
    return result.rows[0];
  }

  /**
   * Get random client purchases only
   */
  static async findRandomPurchases() {
    const result = await pool.query(
      `SELECT p.*, c.name as client_name, c.id_number
       FROM purchases p
       LEFT JOIN clients c ON p.supplier_id = c.id
       WHERE p.purchase_type = 'random_client'
       ORDER BY p.date DESC, p.created_at DESC`
    );
    return result.rows;
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT p.*, c.name as supplier_name
       FROM purchases p
       LEFT JOIN clients c ON p.supplier_id = c.id
       WHERE p.purchase_type = 'supplier' OR p.purchase_type IS NULL
       ORDER BY p.date DESC, p.created_at DESC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT p.*, c.name as supplier_name
       FROM purchases p
       LEFT JOIN clients c ON p.supplier_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }
}

