-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. customer_profile
CREATE TABLE customer_profile (
    customer_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    pan_card_number TEXT UNIQUE,
    nationality TEXT,
    phone_number TEXT,
    email TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. accounts
CREATE TYPE account_status AS ENUM ('active', 'frozen', 'blocked');
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customer_profile(customer_id) ON DELETE CASCADE,
    account_number TEXT UNIQUE NOT NULL,
    account_type TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    status account_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. transactions
CREATE TYPE txn_type AS ENUM ('deposit', 'withdraw', 'transfer');
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    transaction_type txn_type NOT NULL,
    amount NUMERIC NOT NULL,
    receiver_account TEXT,
    balance_after NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. complaints
CREATE TYPE complaint_status AS ENUM ('Pending', 'In Review', 'Resolved');
CREATE TABLE complaints (
    complaint_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customer_profile(customer_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status complaint_status DEFAULT 'Pending',
    manager_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. enquiries
CREATE TYPE enquiry_status AS ENUM ('Pending', 'Answered');
CREATE TABLE enquiries (
    enquiry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customer_profile(customer_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    status enquiry_status DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. notifications
CREATE TYPE notif_type AS ENUM ('email', 'dashboard');
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type notif_type DEFAULT 'dashboard',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. audit_logs
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. workflows
CREATE TABLE workflows (
    workflow_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    input_schema JSONB,
    start_step_id UUID -- self referencing deferred or handled in application
);

-- 9. workflow_steps
CREATE TYPE step_type AS ENUM ('task', 'approval', 'notification');
CREATE TABLE workflow_steps (
    step_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    step_type step_type NOT NULL,
    "order" INT NOT NULL,
    metadata JSONB
);

-- Update workflows reference
ALTER TABLE workflows ADD CONSTRAINT fk_start_step FOREIGN KEY (start_step_id) REFERENCES workflow_steps(step_id) ON DELETE SET NULL;

-- 10. workflow_rules
CREATE TABLE workflow_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    next_step_id UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
    priority INT DEFAULT 0
);

-- 11. workflow_executions
CREATE TABLE workflow_executions (
    execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    workflow_version INT NOT NULL,
    status TEXT NOT NULL,
    data JSONB,
    current_step_id UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
    logs JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- RLS setup (Example: enabling on all tables, but since backend uses service_role, this mostly protects direct client access)
ALTER TABLE customer_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow read/write for own records for customers
CREATE POLICY "Users can view their own profile" ON customer_profile FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can update their own profile" ON customer_profile FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Users can view their own accounts" ON accounts FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (
    account_id IN (SELECT account_id FROM accounts WHERE customer_id = auth.uid())
);

CREATE POLICY "Users can view their own complaints" ON complaints FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can insert their own complaints" ON complaints FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can view their own enquiries" ON enquiries FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can insert their own enquiries" ON enquiries FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Note: The FastAPI backend will operate via service_role key, bypassing RLS. 
-- The frontend will rely on FastAPI for most operations, or direct Supabase for pure reads.
