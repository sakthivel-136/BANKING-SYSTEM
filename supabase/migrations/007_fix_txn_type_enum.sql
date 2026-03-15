-- Migration: 007_fix_txn_type_enum.sql
-- 1. Add 'charge' to the txn_type enum
-- Note: 'ALTER TYPE ... ADD VALUE' cannot be executed inside a transaction block in some Postgres versions, 
-- but Supabase usually handles it fine in migrations.
ALTER TYPE txn_type ADD VALUE IF NOT EXISTS 'charge';

-- 2. Enhance account_configs to include charge amounts
-- Adding columns needed by services/banking.py
ALTER TABLE account_configs ADD COLUMN IF NOT EXISTS min_balance_fine NUMERIC DEFAULT 100;
ALTER TABLE account_configs ADD COLUMN IF NOT EXISTS monthly_notification_charge NUMERIC DEFAULT 50;

-- 3. Update seed values for account_configs to match user rules
UPDATE account_configs SET min_balance_fine = 100, monthly_notification_charge = 50 WHERE account_type = 'Savings';
UPDATE account_configs SET min_balance_fine = 250, monthly_notification_charge = 50 WHERE account_type = 'Current';
UPDATE account_configs SET min_balance_fine = 500, monthly_notification_charge = 50 WHERE account_type = 'Investment';

-- 4. Add description column to transactions if it's missing (it's used in reports.py)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
