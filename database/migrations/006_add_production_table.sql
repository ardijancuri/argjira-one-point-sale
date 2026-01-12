-- Migration: Add productions table for production process
-- This table stores production records from accumulated gold to finished products

CREATE TABLE IF NOT EXISTS productions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    source_category stock_category NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    send_date DATE NOT NULL,
    return_date DATE NOT NULL,
    invoice_workshop VARCHAR(100),
    quantity DECIMAL(10,2) NOT NULL,
    material_cost DECIMAL(15,2) NOT NULL,
    labor_price DECIMAL(15,2) NOT NULL,
    labor_tax_rate DECIMAL(5,2) DEFAULT 18,
    labor_cost DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    cost_per_gram DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_productions_workshop_id ON productions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_productions_return_date ON productions(return_date);

-- Add comment
COMMENT ON TABLE productions IS 'Production records: converting accumulated gold to finished products';

-- Also extend purchases table to support random client purchases
-- Add type field to distinguish between supplier purchases and random client purchases
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(50) DEFAULT 'supplier';

ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS category stock_category;

ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS karat VARCHAR(50);

ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment
COMMENT ON COLUMN purchases.purchase_type IS 'Type: supplier or random_client';
COMMENT ON COLUMN purchases.category IS 'Stock category for the purchased gold';
COMMENT ON COLUMN purchases.karat IS 'Karat of the purchased gold';
COMMENT ON COLUMN purchases.notes IS 'Additional notes for the purchase';

