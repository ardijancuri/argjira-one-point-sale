import pool from '../utils/db.js';

export class Client {
  static async create(data) {
    const { name, id_number, phone, email, address, type, card_number, discount_percent } = data;
    
    const result = await pool.query(
      `INSERT INTO clients (name, id_number, phone, email, address, type, card_number, discount_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name, 
        id_number || null, 
        phone || null, 
        email || null, 
        address || null, 
        type || 'client',
        card_number || null,
        discount_percent || 0
      ]
    );
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Only add type filter if it's a valid value (not null, undefined, or empty string)
    const hasTypeFilter = filters.type && filters.type !== null && filters.type !== undefined && filters.type !== '' && filters.type !== 'null';
    if (hasTypeFilter) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }
    
    // Only add search filter if it's a valid value
    if (filters.search && filters.search !== null && filters.search !== undefined && filters.search !== '') {
      const searchParam = `%${filters.search}%`;
      const currentParam = paramIndex;
      query += ` AND (name ILIKE $${currentParam} OR id_number ILIKE $${currentParam} OR phone ILIKE $${currentParam} OR email ILIKE $${currentParam})`;
      params.push(searchParam);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByType(type) {
    // Handle multiple types: can be comma-separated string or array
    let types = type;
    if (typeof type === 'string' && type.includes(',')) {
      types = type.split(',').map(t => t.trim()).filter(t => t);
    } else if (typeof type === 'string') {
      types = [type];
    } else if (Array.isArray(type)) {
      types = type.filter(t => t);
    } else {
      types = [type];
    }
    
    // Return empty array if no valid types
    if (!types || types.length === 0) {
      return [];
    }
    
    // Use IN clause for multiple types, = for single type
    if (types.length === 1) {
    const result = await pool.query(
      'SELECT * FROM clients WHERE type = $1 ORDER BY name',
        [types[0]]
      );
      return result.rows;
    } else {
      const placeholders = types.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `SELECT * FROM clients WHERE type IN (${placeholders}) ORDER BY name`,
        types
    );
    return result.rows;
    }
  }

  static async update(id, data) {
    const { name, id_number, phone, email, address, type, card_number, discount_percent } = data;
    const result = await pool.query(
      `UPDATE clients 
       SET name = $1, id_number = $2, phone = $3, email = $4, address = $5, type = $6, 
           card_number = $7, discount_percent = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        name, 
        id_number || null, 
        phone || null, 
        email || null, 
        address || null, 
        type || 'client',
        card_number || null,
        discount_percent || 0,
        id
      ]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  }
}

