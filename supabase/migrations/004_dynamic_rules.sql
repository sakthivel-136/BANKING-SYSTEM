-- Add customer_number to customer_profile
ALTER TABLE customer_profile ADD COLUMN IF NOT EXISTS customer_number TEXT UNIQUE;

-- Create account_configs for dynamic thresholds
CREATE TABLE IF NOT EXISTS account_configs (
    account_type TEXT PRIMARY KEY,
    min_balance_threshold NUMERIC NOT NULL,
    transaction_otp_threshold NUMERIC NOT NULL,
    requires_manager_approval_above NUMERIC NOT NULL
);

-- Seed initial values from user requirements
INSERT INTO account_configs (account_type, min_balance_threshold, transaction_otp_threshold, requires_manager_approval_above)
VALUES 
('Savings', 1000, 10000, 50000),
('Current', 5000, 50000, 100000),
('Investment', 100000, 1000000, 5000000)
ON CONFLICT (account_type) DO UPDATE SET
min_balance_threshold = EXCLUDED.min_balance_threshold,
transaction_otp_threshold = EXCLUDED.transaction_otp_threshold,
requires_manager_approval_above = EXCLUDED.requires_manager_approval_above;

-- Create otp_codes table if missing
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
    code TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
