import sys
import traceback
from database import supabase

# Monkey patch supabase table insert to see what's being sent
original_table = supabase.table

def mocked_table(table_name):
    actual_table = original_table(table_name)
    if table_name == "transactions":
        original_insert = actual_table.insert
        def mocked_insert(json_data):
            print(f"🔍 DEBUG: Inserting into {table_name}: {json_data}")
            return original_insert(json_data)
        actual_table.insert = mocked_insert
    return actual_table

supabase.table = mocked_table

try:
    from services.banking import apply_monthly_charges
    print("🚀 Triggering apply_monthly_charges(dry_run=False)...")
    result = apply_monthly_charges(dry_run=False)
    print(f"✅ Success: {result}")
except Exception as e:
    print(f"❌ Failed: {e}")
    traceback.print_exc()
