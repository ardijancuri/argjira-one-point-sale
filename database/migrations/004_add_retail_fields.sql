-- Migration: Add retail client fields
-- Add card_number and discount_percent columns to clients table for retail client support

-- First, update the client_type ENUM to include 'retail'
ALTER TYPE client_type ADD VALUE IF NOT EXISTS 'retail';

-- Add card_number column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS card_number VARCHAR(50);

-- Add discount_percent column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0;

-- Add comment to explain the fields
COMMENT ON COLUMN clients.card_number IS 'Card number for retail clients';
COMMENT ON COLUMN clients.discount_percent IS 'Discount percentage for retail clients (0-100)';

