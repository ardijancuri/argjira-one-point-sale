-- Migration: Add TVSH Numer and Numri i Takses fields to company_settings table

-- Add new columns for tax information
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS tvsh_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_company_settings_tvsh_number ON company_settings(tvsh_number);
CREATE INDEX IF NOT EXISTS idx_company_settings_tax_number ON company_settings(tax_number);

-- Note: Both new columns are nullable to allow existing data to remain valid
