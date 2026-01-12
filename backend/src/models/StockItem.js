import pool from '../utils/db.js';
import { calculateWeightedAveragePrice } from '../utils/calculations.js';

export class StockItem {
  static async create(data) {
    const { name, serial_number, quantity, karat, unit, price, category, tax_rate } = data;
    const result = await pool.query(
      `INSERT INTO stock_items (name, serial_number, quantity, karat, unit, price, category, tax_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, serial_number || null, quantity || 0, karat || null, unit || 'piece', price || 0, category || 'stoli', 0]
    );
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM stock_items WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (filters.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }
    
    if (filters.search) {
      const searchParam = `%${filters.search}%`;
      query += ` AND (name ILIKE $${paramIndex} OR serial_number ILIKE $${paramIndex} OR karat ILIKE $${paramIndex})`;
      params.push(searchParam);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM stock_items WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByCategory(category) {
    const result = await pool.query(
      'SELECT * FROM stock_items WHERE category = $1 ORDER BY name',
      [category]
    );
    return result.rows;
  }

  static async findForPOS() {
    // Exclude 'blerje' category from POS
    const result = await pool.query(
      `SELECT * FROM stock_items 
       WHERE category != 'blerje' AND quantity > 0
       ORDER BY name`
    );
    return result.rows;
  }

  static async update(id, data) {
    const { name, serial_number, quantity, karat, unit, price, category, tax_rate } = data;
    const result = await pool.query(
      `UPDATE stock_items 
       SET name = $1, serial_number = $2, quantity = $3, karat = $4, unit = $5, 
           price = $6, category = $7, tax_rate = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, serial_number || null, quantity || 0, karat || null, unit || 'piece', 
       price || 0, category || 'stoli', 0, id]
    );
    return result.rows[0];
  }

  static async updateQuantity(id, quantityChange) {
    const result = await pool.query(
      `UPDATE stock_items 
       SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [quantityChange, id]
    );
    return result.rows[0];
  }

  static async updatePriceWithWeightedAverage(id, newQuantity, newPrice) {
    const current = await this.findById(id);
    if (!current) throw new Error('Stock item not found');
    
    const averagePrice = calculateWeightedAveragePrice(
      parseFloat(current.quantity),
      parseFloat(current.price),
      parseFloat(newQuantity),
      parseFloat(newPrice)
    );
    
    const result = await pool.query(
      `UPDATE stock_items 
       SET quantity = quantity + $1, price = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newQuantity, averagePrice, id]
    );
    return result.rows[0];
  }

  /**
   * Reverse a previous weighted average update (used when editing purchase invoices)
   * This subtracts quantity and recalculates the price based on what remains
   * @param {number} id - Stock item ID
   * @param {number} quantityToRemove - The quantity to remove (must be positive)
   * @param {number} priceOfRemovedItems - The price of the items being removed
   */
  static async reverseWeightedAverageUpdate(id, quantityToRemove, priceOfRemovedItems) {
    const current = await this.findById(id);
    if (!current) throw new Error('Stock item not found');
    
    const currentQty = parseFloat(current.quantity) || 0;
    const currentPrice = parseFloat(current.price) || 0;
    const removeQty = parseFloat(quantityToRemove) || 0;
    const removePrice = parseFloat(priceOfRemovedItems) || 0;
    
    // Calculate remaining quantity
    const remainingQty = currentQty - removeQty;
    
    let newPrice = currentPrice;
    
    if (remainingQty <= 0) {
      // If no stock remains, reset price to 0
      newPrice = 0;
    } else if (removeQty > 0 && currentQty > 0) {
      // Reverse the weighted average calculation
      // Original formula: currentPrice = (oldQty * oldPrice + removeQty * removePrice) / currentQty
      // Solving for oldPrice: oldPrice = (currentPrice * currentQty - removeQty * removePrice) / remainingQty
      const totalValue = currentPrice * currentQty;
      const removedValue = removeQty * removePrice;
      const remainingValue = totalValue - removedValue;
      
      if (remainingQty > 0 && remainingValue >= 0) {
        newPrice = remainingValue / remainingQty;
      }
      // Keep price positive
      if (newPrice < 0) newPrice = currentPrice;
    }
    
    const result = await pool.query(
      `UPDATE stock_items 
       SET quantity = $1, price = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [Math.max(0, remainingQty), parseFloat(newPrice.toFixed(2)), id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM stock_items WHERE id = $1', [id]);
  }

  static async getStockStats() {
    const result = await pool.query(
      `SELECT 
        SUM(CASE WHEN unit = 'gram' THEN quantity ELSE 0 END) as stock_gram,
        SUM(CASE WHEN unit = 'piece' THEN quantity ELSE 0 END) as stock_piece
       FROM stock_items`
    );
    return result.rows[0];
  }
}

