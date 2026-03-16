-- 009_reversal_requests.sql
-- Track manual charge / transfer reversals approved by MD.

CREATE TYPE IF NOT EXISTS reversal_type AS ENUM ('charge_double', 'wrong_transfer');
CREATE TYPE IF NOT EXISTS reversal_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS reversal_requests (
    reversal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID REFERENCES complaints(complaint_id) ON DELETE SET NULL,
    original_transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    source_account_id UUID REFERENCES accounts(account_id) ON DELETE SET NULL,
    target_account_id UUID REFERENCES accounts(account_id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    type reversal_type NOT NULL,
    reason TEXT,
    status reversal_status DEFAULT 'pending',
    created_by_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_md_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);

