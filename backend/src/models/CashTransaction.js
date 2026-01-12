import pool from '../utils/db.js';
import { CompanySettings } from './CompanySettings.js';

export class CashTransaction {
  static async create(data) {
    const { amount, type, description } = data;
    
    // Update company cash
    const cashChange = type === 'in' ? parseFloat(amount) : -parseFloat(amount);
    await CompanySettings.updateCash(cashChange);
    
    // Create transaction record
    const result = await pool.query(
      `INSERT INTO cash_transactions (amount, type, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [amount, type, description || null]
    );
    
    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM cash_transactions ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM cash_transactions WHERE id = $1', [id]);
    return result.rows[0];
  }
}

