-- Migration: 008_staff_creation_and_reporting.sql
-- 1. Create staff_creation_requests table for MD to invite managers
CREATE TABLE IF NOT EXISTS staff_creation_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    aadhaar_number TEXT NOT NULL,
    role TEXT DEFAULT 'manager',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add download charges to account_configs if they don't exist (default ₹2.50)
ALTER TABLE account_configs ADD COLUMN IF NOT EXISTS statement_download_charge NUMERIC DEFAULT 2.50;
ALTER TABLE account_configs ADD COLUMN IF NOT EXISTS report_download_charge NUMERIC DEFAULT 2.50;

-- Update defaults for any NULLs
UPDATE account_configs SET statement_download_charge = 2.50 WHERE statement_download_charge IS NULL;
UPDATE account_configs SET report_download_charge = 2.50 WHERE report_download_charge IS NULL;
