from database import supabase
import sys

def check_customer(customer_number):
    res = supabase.table("customer_profile").select("email, full_name").eq("customer_number", customer_number).execute()
    if not res.data:
        print(f"Customer {customer_number} NOT FOUND")
    else:
        print(f"Customer {customer_number} Email: {res.data[0]['email']}")
        print(f"Customer {customer_number} Name: {res.data[0]['full_name']}")

if __name__ == "__main__":
    check_customer("CU996888")
