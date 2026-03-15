CREATE TYPE transfer_status AS ENUM ('pending_otp', 'pending_approval', 'approved', 'rejected');

CREATE TABLE transfer_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    receiver_account TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    otp_code TEXT NOT NULL,
    status transfer_status DEFAULT 'pending_otp',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transfer requests" ON transfer_requests FOR SELECT USING (
    account_id IN (SELECT account_id FROM accounts WHERE customer_id = auth.uid())
);
