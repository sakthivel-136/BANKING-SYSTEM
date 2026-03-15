# SmartBank Automation System

A modern digital banking platform featuring workflow automation, role-based dashboards, and complete banking operations.

## Architecture

```text
[ SmartBank Frontend ] (Next.js 14, TailwindCSS, Shadcn, TypeScript)
      |
      | (Axios via JWT Interceptors)
      v
[ SmartBank Backend ] (FastAPI, Python)
      |
      | (Supabase Python Client & Service Account Bypass)
      v
[ Supabase PostgreSQL ] (Schema + Supabase Auth)
```

## Setup Instructions

### 1. Database Initialization
The backend relies on the 11 tables constructed during Agent 1. Since standard Supabase REST does not allow applying raw SQL DDL directly asynchronously without the `postgres` driver password:
1. Navigate to your Supabase Project console via https://supabase.com.
2. Open the **SQL Editor**.
3. Copy the contents of `supabase/migrations/001_schema.sql`.
4. Run the query.

### 2. Backend Startup
1. `cd backend`
2. Ensure you have the `.env` created containing your Supabase URL and Keys.
3. Source the python environment: `source venv/bin/activate` or install the dependencies globally.
4. Run: `fastapi dev main.py` or `uvicorn main:app --reload`
5. *Optional*: Run `python3 seed_workflows.py` to populate the 3 base workflows.

### 3. Frontend Startup
1. `cd frontend`
2. Run `npm install`
3. The `.env.local` expects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Run `npm run dev`
5. Navigate to `http://localhost:3000`

## Workflow Engine Trace
The core workflow logic resides in `backend/workflow_engine`. Every core banking action checks the active loaded workflows inside Supabase. For example, a transfer triggering condition `amount > 50000` will dispatch an executing node sequence appending `action status` logs stored in the execution tracking table. Admins can view this JSON trace from their dashboard under "Executions".
