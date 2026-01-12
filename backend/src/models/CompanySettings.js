import pool from '../utils/db.js';

export class CompanySettings {
  static async get() {
    const result = await pool.query('SELECT * FROM company_settings LIMIT 1');
    return result.rows[0];
  }

  static async update(data) {
    const { name, nipt, address, phone, email, country, bank, iban, tvsh_number, tax_number } = data;
    const result = await pool.query(
      `UPDATE company_settings 
       SET name = $1, nipt = $2, address = $3, phone = $4, email = $5, country = $6, bank = $7, iban = $8, tvsh_number = $9, tax_number = $10, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [name, nipt || null, address || null, phone || null, email || null, country || null, bank || null, iban || null, tvsh_number || null, tax_number || null]
    );
    return result.rows[0];
  }

  static async getCash() {
    const result = await pool.query('SELECT cash FROM company_settings LIMIT 1');
    return result.rows[0]?.cash || 0;
  }

  static async updateCash(amount) {
    const result = await pool.query(
      `UPDATE company_settings 
       SET cash = cash + $1, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [amount]
    );
    return result.rows[0];
  }

  static async setCash(amount) {
    const result = await pool.query(
      `UPDATE company_settings 
       SET cash = $1, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [amount]
    );
    return result.rows[0];
  }
}

