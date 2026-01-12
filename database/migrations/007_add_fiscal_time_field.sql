-- Migration: Add time field to fiscal_sales table
-- This allows storing the time separately in HH:mm format for display purposes

ALTER TABLE fiscal_sales 
ADD COLUMN IF NOT EXISTS time VARCHAR(5);

-- Add comment
COMMENT ON COLUMN fiscal_sales.time IS 'Time of sale in HH:mm format (e.g., "14:30")';

