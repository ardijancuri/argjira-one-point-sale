-- Migration: Add storno tracking to fiscal_sales table
-- This tracks if a fiscal sale has been storno'd (refunded) and when

ALTER TABLE fiscal_sales 
ADD COLUMN IF NOT EXISTS storno BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS storno_date TIMESTAMP;

-- Add index for better query performance when filtering by storno status
CREATE INDEX IF NOT EXISTS idx_fiscal_sales_storno ON fiscal_sales(storno);

-- Add comments for documentation
COMMENT ON COLUMN fiscal_sales.storno IS 'Indicates if this fiscal sale has been storno''d (refunded)';
COMMENT ON COLUMN fiscal_sales.storno_date IS 'Timestamp when the fiscal sale was storno''d';

