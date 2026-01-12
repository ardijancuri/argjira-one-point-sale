import pool from '../utils/db.js';

export const FiscalPrintJob = {
  // Create a new print job
  async create(data) {
    const { type, payload, device_id, user_id, fiscal_sale_id, priority = 10 } = data;
    
    const result = await pool.query(
      `INSERT INTO fiscal_print_jobs (type, payload, device_id, user_id, fiscal_sale_id, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [type, JSON.stringify(payload), device_id, user_id, fiscal_sale_id, priority]
    );
    
    return result.rows[0];
  },

  // Get all pending jobs ordered by priority and creation time
  async findPending(limit = 10) {
    const result = await pool.query(
      `SELECT * FROM fiscal_print_jobs 
       WHERE status = 'pending'
       ORDER BY priority ASC, created_at ASC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  },

  // Get a single job by ID
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM fiscal_print_jobs WHERE id = $1`,
      [id]
    );
    
    return result.rows[0];
  },

  // Get job status with basic info
  async getStatus(id) {
    const result = await pool.query(
      `SELECT id, type, status, created_at, processed_at, error_message
       FROM fiscal_print_jobs 
       WHERE id = $1`,
      [id]
    );
    
    return result.rows[0];
  },

  // Mark job as printing (in progress)
  async markPrinting(id) {
    const result = await pool.query(
      `UPDATE fiscal_print_jobs 
       SET status = 'printing'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    
    return result.rows[0];
  },

  // Mark job as completed
  async markComplete(id) {
    const result = await pool.query(
      `UPDATE fiscal_print_jobs 
       SET status = 'completed', processed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return result.rows[0];
  },

  // Mark job as failed with error message
  async markFailed(id, errorMessage) {
    const result = await pool.query(
      `UPDATE fiscal_print_jobs 
       SET status = 'failed', processed_at = CURRENT_TIMESTAMP, error_message = $2
       WHERE id = $1
       RETURNING *`,
      [id, errorMessage]
    );
    
    return result.rows[0];
  },

  // Get recent jobs (for dashboard/history)
  async findRecent(limit = 50) {
    const result = await pool.query(
      `SELECT fpj.*, u.username as user_name
       FROM fiscal_print_jobs fpj
       LEFT JOIN users u ON fpj.user_id = u.id
       ORDER BY fpj.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  },

  // Get statistics for dashboard
  async getStats() {
    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
         COUNT(*) FILTER (WHERE status = 'printing') as printing_count,
         COUNT(*) FILTER (WHERE status = 'completed' AND processed_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') as completed_last_hour,
         COUNT(*) FILTER (WHERE status = 'failed' AND processed_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') as failed_last_hour,
         COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as total_today
       FROM fiscal_print_jobs`
    );
    
    return result.rows[0];
  },

  // Clean up old completed/failed jobs (older than 7 days)
  async cleanup(daysOld = 7) {
    const result = await pool.query(
      `DELETE FROM fiscal_print_jobs 
       WHERE status IN ('completed', 'failed') 
       AND processed_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
       RETURNING id`,
      [daysOld]
    );
    
    return result.rowCount;
  },

  // Reset stuck printing jobs (older than 5 minutes)
  async resetStuckJobs() {
    const result = await pool.query(
      `UPDATE fiscal_print_jobs 
       SET status = 'pending'
       WHERE status = 'printing' 
       AND created_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes'
       RETURNING *`
    );
    
    return result.rows;
  },

  // Get the next pending job and mark it as printing atomically
  async claimNextJob() {
    const result = await pool.query(
      `UPDATE fiscal_print_jobs 
       SET status = 'printing'
       WHERE id = (
         SELECT id FROM fiscal_print_jobs 
         WHERE status = 'pending'
         ORDER BY priority ASC, created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );
    
    return result.rows[0];
  }
};
