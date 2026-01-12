-- Migration: Add invoice_id to fiscal_sales table
-- This links fiscal sales to invoices when invoices are generated from POS sales

ALTER TABLE fiscal_sales 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_fiscal_sales_invoice_id ON fiscal_sales(invoice_id);

-- Add comment
COMMENT ON COLUMN fiscal_sales.invoice_id IS 'Reference to invoice created from this fiscal sale (if with_invoice was true)';

