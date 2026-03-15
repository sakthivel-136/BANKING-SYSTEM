import asyncio
from database import supabase

def seed_workflows():
    # 1. LOW_BALANCE_MONITORING
    wf1 = supabase.table("workflows").insert({
        "name": "LOW_BALANCE_MONITORING",
        "is_active": True,
        "version": 1,
        "input_schema": {"balance": "number", "account_id": "string"}
    }).execute()
    
    # 2. ACCOUNT_UNFREEZE_REQUEST
    wf2 = supabase.table("workflows").insert({
        "name": "ACCOUNT_UNFREEZE_REQUEST",
        "is_active": True,
        "version": 1,
        "input_schema": {"account_id": "string", "reason": "string"}
    }).execute()

    # 3. LARGE_TRANSACTION_DETECTION
    wf3 = supabase.table("workflows").insert({
        "name": "LARGE_TRANSACTION_DETECTION",
        "is_active": True,
        "version": 1,
        "input_schema": {"sender_id": "string", "amount": "number", "receiver": "string"}
    }).execute()

    print("Seeded workflows.")

if __name__ == "__main__":
    try:
        seed_workflows()
    except Exception as e:
        print("Failed to seed workflows. The DB schema might not be applied yet.", e)
