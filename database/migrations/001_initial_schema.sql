-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE client_type AS ENUM ('client', 'supplier', 'producer', 'retail');
CREATE TYPE invoice_type AS ENUM ('in', 'out');
CREATE TYPE payment_method AS ENUM ('bank', 'cash', 'card');
CREATE TYPE stock_unit AS ENUM ('gram', 'piece');
CREATE TYPE stock_category AS ENUM ('stoli', 'investues', 'dijamant', 'blerje');
CREATE TYPE invoice_status AS ENUM ('paid', 'unpaid');
CREATE TYPE cash_transaction_type AS ENUM ('in', 'out');
CREATE TYPE user_role AS ENUM ('admin', 'manager');

-- Company settings table (single company configuration)
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

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'manager',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    id_number VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    type client_type NOT NULL DEFAULT 'client',
    card_number VARCHAR(50),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock items table
CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    karat VARCHAR(50),
    unit stock_unit NOT NULL DEFAULT 'piece',
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    category stock_category NOT NULL DEFAULT 'stoli',
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type invoice_type NOT NULL,
    number VARCHAR(100) NOT NULL UNIQUE,
    supplier_invoice_number VARCHAR(100),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    due_date DATE,
    payment_method payment_method NOT NULL DEFAULT 'bank',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    status invoice_status NOT NULL DEFAULT 'unpaid',
    description TEXT,
    processing_pair_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice items table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    quantity DECIMAL(10,2) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processing records table (4-phase workflow)
CREATE TABLE processing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    -- Phase 1: Pranim
    date_in DATE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    price_in DECIMAL(15,2) NOT NULL,
    total_in DECIMAL(15,2) NOT NULL,
    client_doc VARCHAR(100),
    doc_in VARCHAR(100) NOT NULL,
    -- Phase 2: Dërgim në Puntorinë
    workshop_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    doc_send VARCHAR(100),
    date_send DATE,
    -- Phase 3: Kthim nga Puntoria
    date_return DATE,
    price_workshop DECIMAL(15,2),
    total_workshop DECIMAL(15,2),
    invoice_workshop VARCHAR(100),
    -- Phase 4: Shitje te Klienti
    date_sale DATE,
    price_sale DECIMAL(15,2),
    subtotal_sale DECIMAL(15,2),
    tax_amount_sale DECIMAL(15,2),
    total_sale DECIMAL(15,2),
    profit DECIMAL(15,2),
    -- Legacy fields (for backward compatibility)
    date DATE NOT NULL,
    receive_price DECIMAL(15,2) NOT NULL,
    service_price DECIMAL(15,2) NOT NULL,
    doc_out VARCHAR(100) NOT NULL,
    invoice_in_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    invoice_out_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'completed',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchases table
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    payment_method payment_method NOT NULL,
    purchase_type VARCHAR(50) DEFAULT 'supplier',
    category stock_category,
    karat VARCHAR(50),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productions table
CREATE TABLE productions (
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

-- Fiscal sales table
CREATE TABLE fiscal_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    time VARCHAR(5),
    total DECIMAL(15,2) NOT NULL,
    payment_method payment_method NOT NULL,
    with_invoice BOOLEAN DEFAULT false,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fiscal sale items table
CREATE TABLE fiscal_sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_sale_id UUID NOT NULL REFERENCES fiscal_sales(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
    quantity DECIMAL(10,2) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash transactions table
CREATE TABLE cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL(15,2) NOT NULL,
    type cash_transaction_type NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_clients_type ON clients(type);
CREATE INDEX idx_stock_items_category ON stock_items(category);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_type ON invoices(type);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_fiscal_sales_date ON fiscal_sales(date);
CREATE INDEX idx_fiscal_sales_invoice_id ON fiscal_sales(invoice_id);
CREATE INDEX idx_productions_workshop_id ON productions(workshop_id);
CREATE INDEX idx_productions_return_date ON productions(return_date);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Add comments for documentation
COMMENT ON COLUMN clients.card_number IS 'Card number for retail clients';
COMMENT ON COLUMN clients.discount_percent IS 'Discount percentage for retail clients (0-100)';
COMMENT ON COLUMN processing_records.workshop_id IS 'Workshop/Producer client ID for Phase 2';
COMMENT ON COLUMN processing_records.doc_send IS 'Document number for sending to workshop';
COMMENT ON COLUMN processing_records.date_send IS 'Date when gold was sent to workshop';
COMMENT ON COLUMN processing_records.date_return IS 'Date when processed gold was returned from workshop';
COMMENT ON COLUMN processing_records.price_workshop IS 'Processing price per gram from workshop';
COMMENT ON COLUMN processing_records.total_workshop IS 'Total processing cost from workshop';
COMMENT ON COLUMN processing_records.invoice_workshop IS 'Invoice number from workshop';
COMMENT ON COLUMN processing_records.date_sale IS 'Date when processed gold was sold to client';
COMMENT ON COLUMN processing_records.price_sale IS 'Service price per gram (with service fee)';
COMMENT ON COLUMN processing_records.subtotal_sale IS 'Sale subtotal (before tax)';
COMMENT ON COLUMN processing_records.tax_amount_sale IS 'Tax amount on sale';
COMMENT ON COLUMN processing_records.total_sale IS 'Total sale amount (with tax)';
COMMENT ON COLUMN processing_records.profit IS 'Profit = subtotal_sale - total_workshop';
COMMENT ON COLUMN processing_records.client_doc IS 'Client document number (from Phase 1)';
COMMENT ON COLUMN purchases.purchase_type IS 'Type: supplier or random_client';
COMMENT ON COLUMN purchases.category IS 'Stock category for the purchased gold';
COMMENT ON COLUMN purchases.karat IS 'Karat of the purchased gold';
COMMENT ON COLUMN purchases.notes IS 'Additional notes for the purchase';
COMMENT ON COLUMN fiscal_sales.time IS 'Time of sale in HH:mm format (e.g., "14:30")';
COMMENT ON COLUMN fiscal_sales.invoice_id IS 'Reference to invoice created from this fiscal sale (if with_invoice was true)';
COMMENT ON TABLE productions IS 'Production records: converting accumulated gold to finished products';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_records_updated_at BEFORE UPDATE ON processing_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productions_updated_at BEFORE UPDATE ON productions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default admin user
-- Username: admin
-- Email: admin@esim.com
-- Password: admin123
-- Role: admin
INSERT INTO users (username, email, password_hash, role)
VALUES (
  'admin',
  'admin@esim.com',
  '$2a$10$eeMTlFg3Gm.4EFpEFA.fP.L/uCsRh1GPWshxBXqLjFgsekJf4eBkG',
  'admin'
) ON CONFLICT (username) DO NOTHING;
