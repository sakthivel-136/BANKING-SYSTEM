-- 011_missing_tables_and_fixes.sql
-- Fixes: missing low_balance_alerts table, missing Closed status in enquiry_status,
--        missing manager_id column and pending_md status in account_activity_requests

-- 1. Fix request_status enum to include 'pending_md' and 'pending_manager'
--    (CRITICAL: without this, "Forward to MD" fails with enum violation error)
DO $$ BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'pending_md';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'pending_manager';
EXCEPTION WHEN others THEN NULL; END $$;

-- 2. Fix enquiry_status enum to include 'Closed'
DO $$ BEGIN
    ALTER TYPE enquiry_status ADD VALUE IF NOT EXISTS 'Closed';
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Fallback: if the above fails, alter the column directly to TEXT
-- (uncomment if the enum ALTER fails in your Supabase version)
-- ALTER TABLE enquiries ALTER COLUMN status TYPE TEXT;

-- 2. Create the low_balance_alerts table (was missing entirely)
CREATE TABLE IF NOT EXISTS low_balance_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'escalated', 'resolved')),
    escalation_message TEXT,
    manager_note TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add manager_id column to account_activity_requests (needed for escalation)
ALTER TABLE account_activity_requests
    ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- CRITICAL: Convert status column from enum to TEXT so it accepts any value
-- (pending_md, pending_manager, etc. without enum modification issues)
ALTER TABLE account_activity_requests ALTER COLUMN status TYPE TEXT;

-- 4. Ensure accounts table has all statuses needed (deactivated, closed, etc.)
-- The current enum only has 'active', 'frozen', 'blocked'
-- Alter to add missing statuses
DO $$ BEGIN
    ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'closed';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'deactivated';
EXCEPTION WHEN others THEN NULL; END $$;

-- 5. Add customer_number to customer_profile if missing (used for OTP login)
ALTER TABLE customer_profile
    ADD COLUMN IF NOT EXISTS customer_number TEXT UNIQUE;

-- Auto-generate customer_number for existing profiles (CU + 6 digits)
UPDATE customer_profile
SET customer_number = 'CU' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0')
WHERE customer_number IS NULL;

-- 6. RLS for low_balance_alerts (service role handles most, but be safe)
ALTER TABLE low_balance_alerts ENABLE ROW LEVEL SECURITY;
