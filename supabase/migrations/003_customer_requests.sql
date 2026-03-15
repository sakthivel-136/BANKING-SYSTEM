CREATE TABLE customer_creation_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    pan_card_number TEXT,
    nationality TEXT,
    phone_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

ALTER TABLE customer_creation_requests ENABLE ROW LEVEL SECURITY;
-- Managers and Admins can view/insert (via service role mostly anyway)
