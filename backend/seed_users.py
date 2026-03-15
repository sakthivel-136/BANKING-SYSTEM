import os
import random
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def seed():
    print("Starting User Seeding...")

    # 20 customers
    for i in range(1, 21):
        email = f"customer{i}@smartbank.test"
        password = "password123"
        print(f"Creating customer {i}...")
        try:
            # Check if user exists first to make it idempotent
            res = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"roles": "customer", "full_name": f"Test Customer {i}"}
            })
            user_id = res.user.id
            
            # Profile
            supabase.table("customer_profile").insert({
                "customer_id": user_id,
                "full_name": f"Test Customer {i}",
                "email": email,
                "phone_number": f"+10000000{i:02d}"
            }).execute()
            
            # Account
            acc_num = f"SB{random.randint(100000, 999999)}{i}"
            supabase.table("accounts").insert({
                "customer_id": user_id,
                "account_number": acc_num,
                "account_type": "savings",
                "balance": random.randint(1000, 50000)
            }).execute()
        except Exception as e:
            print(f"Error or already exists for customer {i}: {e}")

    # 5 managers
    for i in range(1, 6):
        email = f"manager{i}@smartbank.test"
        password = "password123"
        print(f"Creating manager {i}...")
        try:
            supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"roles": "manager", "full_name": f"Test Manager {i}"}
            })
        except Exception as e:
            print(f"Error or already exists for manager {i}: {e}")

    # 1 md
    print("Creating MD...")
    try:
        supabase.auth.admin.create_user({
            "email": "md@smartbank.test",
            "password": "password123",
            "email_confirm": True,
            "user_metadata": {"roles": "md", "full_name": "Managing Director"}
        })
    except Exception as e:
        print(f"Error or already exists for md: {e}")

    print("Seeding complete.")
    print("Default password for all users is: password123")

if __name__ == "__main__":
    seed()
