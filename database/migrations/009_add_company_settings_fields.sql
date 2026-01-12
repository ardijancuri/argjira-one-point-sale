-- Migration: Add country, bank, and IBAN fields to company_settings table

-- Add new columns
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS country VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank VARCHAR(255),
ADD COLUMN IF NOT EXISTS iban VARCHAR(100);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_company_settings_country ON company_settings(country);
CREATE INDEX IF NOT EXISTS idx_company_settings_bank ON company_settings(bank);
CREATE INDEX IF NOT EXISTS idx_company_settings_iban ON company_settings(iban);

-- Note: All new columns are nullable to allow existing data to remain valid

