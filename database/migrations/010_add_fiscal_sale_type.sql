-- Migration: Add sale_type to fiscal_sales table
-- This stores the type of sale: 'normal', 'wholesale', or 'investor'

ALTER TABLE fiscal_sales 
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(50);

-- Set default values for existing records based on client_id and invoice_id
-- NULL client_id = 'normal'
-- NOT NULL client_id with invoice_id = 'investor' (Ar investues - Faturë me kesh)
-- NOT NULL client_id without invoice_id = 'wholesale' (Klient Pakice - Zbritje per stoli)
UPDATE fiscal_sales
SET sale_type = CASE
  WHEN client_id IS NULL THEN 'normal'
  WHEN invoice_id IS NOT NULL THEN 'investor'
  ELSE 'wholesale'
END
WHERE sale_type IS NULL;

-- Set default value for new records
ALTER TABLE fiscal_sales 
ALTER COLUMN sale_type SET DEFAULT 'normal';

-- Add comment
COMMENT ON COLUMN fiscal_sales.sale_type IS 'Type of sale: normal (Shitje Normale), wholesale (Klient Pakice), or investor (Ar investues)';

-- Add index for better performance when filtering by sale_type
CREATE INDEX IF NOT EXISTS idx_fiscal_sales_sale_type ON fiscal_sales(sale_type);

