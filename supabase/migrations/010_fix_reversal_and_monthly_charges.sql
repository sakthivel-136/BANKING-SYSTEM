-- 010_fix_reversal_and_monthly_charges.sql

-- 1. Add related_transaction_id to complaints
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS related_transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL;

-- 2. Create monthly_charge_logs to track when charges are applied
CREATE TABLE IF NOT EXISTS monthly_charge_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accounts_processed INT,
    total_fines_collected NUMERIC,
    total_notif_collected NUMERIC,
    month INT NOT NULL,
    year INT NOT NULL,
    UNIQUE(month, year)
);
