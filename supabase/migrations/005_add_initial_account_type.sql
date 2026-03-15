-- Add missing initial_account_type column to customer_creation_requests
ALTER TABLE customer_creation_requests
    ADD COLUMN IF NOT EXISTS initial_account_type TEXT DEFAULT 'Savings';
