-- Migration: Remove multi-company support
-- This migration removes all company_id columns and the companies table

-- Drop indexes related to company_id
DROP INDEX IF EXISTS idx_clients_company_id;
DROP INDEX IF EXISTS idx_stock_items_company_id;
DROP INDEX IF EXISTS idx_invoices_company_id;
DROP INDEX IF EXISTS idx_processing_records_company_id;
DROP INDEX IF EXISTS idx_purchases_company_id;
DROP INDEX IF EXISTS idx_fiscal_sales_company_id;
DROP INDEX IF EXISTS idx_cash_transactions_company_id;
DROP INDEX IF EXISTS idx_users_company_id;

-- Drop the trigger for companies table
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;

-- Remove company_id columns from all tables
-- Start with foreign key constraints, then drop columns

-- Users table: company_id is nullable, so we can drop it directly
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_id_fkey;
ALTER TABLE users DROP COLUMN IF EXISTS company_id;

-- Clients table: remove NOT NULL constraint first, then drop
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_company_id_fkey;
ALTER TABLE clients DROP COLUMN IF EXISTS company_id;

-- Stock items table: remove NOT NULL constraint first, then drop
ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS stock_items_company_id_fkey;
ALTER TABLE stock_items DROP COLUMN IF EXISTS company_id;

-- Invoices table: handle UNIQUE constraint and company_id
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_number_key;
ALTER TABLE invoices DROP COLUMN IF EXISTS company_id;
-- Add new UNIQUE constraint on number only
ALTER TABLE invoices ADD CONSTRAINT invoices_number_unique UNIQUE (number);

-- Processing records table
ALTER TABLE processing_records DROP CONSTRAINT IF EXISTS processing_records_company_id_fkey;
ALTER TABLE processing_records DROP COLUMN IF EXISTS company_id;

-- Purchases table
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_company_id_fkey;
ALTER TABLE purchases DROP COLUMN IF EXISTS company_id;

-- Fiscal sales table
ALTER TABLE fiscal_sales DROP CONSTRAINT IF EXISTS fiscal_sales_company_id_fkey;
ALTER TABLE fiscal_sales DROP COLUMN IF EXISTS company_id;

-- Cash transactions table
ALTER TABLE cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_company_id_fkey;
ALTER TABLE cash_transactions DROP COLUMN IF EXISTS company_id;

-- Finally, drop the companies table
DROP TABLE IF EXISTS companies CASCADE;

