export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === '23505') {
    // PostgreSQL unique violation
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  
  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    return res.status(400).json({ error: 'Invalid reference' });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};

