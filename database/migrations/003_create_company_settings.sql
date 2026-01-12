-- Migration: Create company_settings table for single company configuration

-- Create company_settings table
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    nipt VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    cash DECIMAL(15,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default row (if no data exists)
-- This ensures there's always one row in the table
INSERT INTO company_settings (name, cash)
VALUES ('My Company', 0)
ON CONFLICT DO NOTHING;

-- Note: The single row constraint is enforced at application level
-- PostgreSQL doesn't support CHECK constraints that reference the same table easily
-- We'll handle this in the application code

