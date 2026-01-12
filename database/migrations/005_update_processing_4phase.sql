-- Migration: Update processing_records for 4-phase workflow
-- Add fields for Phase 2 (Dërgim), Phase 3 (Kthim), and Phase 4 (Shitje)

-- Add Phase 2 fields: Dërgim në Puntorinë
ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS doc_send VARCHAR(100);

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS date_send DATE;

-- Add Phase 3 fields: Kthim nga Puntoria
ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS date_return DATE;

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS price_workshop DECIMAL(15,2);

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS total_workshop DECIMAL(15,2);

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS invoice_workshop VARCHAR(100);

-- Add Phase 4 fields: Shitje te Klienti
ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS date_sale DATE;

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS price_sale DECIMAL(15,2);

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS subtotal_sale DECIMAL(15,2);

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS tax_amount_sale DECIMAL(15,2);

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS total_sale DECIMAL(15,2);

ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2);

-- Add client document field (from Phase 1)
ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS client_doc VARCHAR(100);

-- Add Phase 1 date field (date_in for 4-phase workflow)
ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS date_in DATE;

-- Add price_in field (for Phase 1)
ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS price_in DECIMAL(15,2);

-- Add total_in field (for Phase 1)
ALTER TABLE processing_records 
ADD COLUMN IF NOT EXISTS total_in DECIMAL(15,2);

-- If date_in is null, copy from date
UPDATE processing_records 
SET date_in = date 
WHERE date_in IS NULL;

-- If price_in is null, copy from receive_price
UPDATE processing_records 
SET price_in = receive_price 
WHERE price_in IS NULL;

-- If total_in is null, calculate from quantity and price_in
UPDATE processing_records 
SET total_in = quantity * COALESCE(price_in, receive_price)
WHERE total_in IS NULL;

-- Add comments
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

