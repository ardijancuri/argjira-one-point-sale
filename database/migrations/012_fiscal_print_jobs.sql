-- Migration: Create fiscal_print_jobs table for centralized printing queue
-- This table stores print jobs submitted from any device on the network
-- The main PC with the fiscal printer polls this queue and processes jobs

CREATE TABLE IF NOT EXISTS fiscal_print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job type: 'receipt', 'storno', 'zreport', 'xreport'
    type VARCHAR(20) NOT NULL,
    
    -- Job status: 'pending', 'printing', 'completed', 'failed'
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- JSON payload containing all data needed for printing
    -- For receipt/storno: { items: [...], paymentMethod: 'cash'|'card' }
    -- For reports: {} (empty)
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Device identifier (browser fingerprint or user-agent hash)
    device_id VARCHAR(255),
    
    -- User who submitted the job
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Reference to fiscal sale if applicable
    fiscal_sale_id UUID REFERENCES fiscal_sales(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error message if job failed
    error_message TEXT,
    
    -- Priority (lower = higher priority)
    priority INTEGER NOT NULL DEFAULT 10
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fiscal_print_jobs_status ON fiscal_print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_print_jobs_created_at ON fiscal_print_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_fiscal_print_jobs_pending ON fiscal_print_jobs(status, priority, created_at) 
    WHERE status = 'pending';

-- Index for looking up jobs by fiscal sale
CREATE INDEX IF NOT EXISTS idx_fiscal_print_jobs_fiscal_sale ON fiscal_print_jobs(fiscal_sale_id) 
    WHERE fiscal_sale_id IS NOT NULL;

-- Comment on table
COMMENT ON TABLE fiscal_print_jobs IS 'Queue for centralized fiscal printing - jobs submitted from any device, processed by main print server';
