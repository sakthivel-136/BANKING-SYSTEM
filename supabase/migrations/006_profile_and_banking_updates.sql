-- 006_profile_and_banking_updates.sql

-- Status for general requests
DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending_otp', 'pending_approval', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Profile Update Requests
CREATE TABLE profile_update_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customer_profile(customer_id) ON DELETE CASCADE,
    new_data JSONB NOT NULL,
    otp_code TEXT NOT NULL,
    status request_status DEFAULT 'pending_otp',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Account Operation Requests (Deposit/Withdrawal with OTP)
CREATE TABLE account_operation_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    operation_type txn_type NOT NULL, -- 'deposit' or 'withdraw'
    amount NUMERIC NOT NULL,
    otp_code TEXT NOT NULL,
    status request_status DEFAULT 'pending_otp',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Account Activity Requests (Unblock/Unfreeze/Deactivate)
CREATE TABLE account_activity_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'unblock', 'unfreeze', 'deactivate'
    duration_months INT,
    reason TEXT,
    status request_status DEFAULT 'pending_approval', -- Maybe no OTP for this, just manager approval? 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profile_update_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile requests" ON profile_update_requests FOR SELECT USING (auth.uid() = customer_id);

ALTER TABLE account_operation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own op requests" ON account_operation_requests FOR SELECT USING (
    account_id IN (SELECT account_id FROM accounts WHERE customer_id = auth.uid())
);

ALTER TABLE account_activity_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activity requests" ON account_activity_requests FOR SELECT USING (
    account_id IN (SELECT account_id FROM accounts WHERE customer_id = auth.uid())
);
