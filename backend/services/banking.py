from database import supabase # type: ignore
from models.schemas import TransactionCreate # type: ignore
from workflow_engine.engine import trigger_workflow # type: ignore
from typing import Dict, Any

def get_account_config(account_type: str) -> Dict[str, Any]:
    """Fetch thresholds from account_configs table."""
    res = supabase.table("account_configs").select("*").eq("account_type", account_type.capitalize()).execute()
    if res.data:
        return res.data[0]
    # Defaults if config missing
    return {
        "min_balance_threshold": 1000,
        "transaction_otp_threshold": 10000,
        "requires_manager_approval_above": 50000
    }

def execute_transaction(txn: TransactionCreate):
    account_id = str(txn.account_id)
    amount = txn.amount
    txn_type = txn.transaction_type
    
    # 1. Fetch sender account
    acc_res = supabase.table("accounts").select("*").eq("account_id", account_id).execute()
    if not acc_res.data:
        raise ValueError("Account not found")
    acc = acc_res.data[0]
    
    if acc["status"] in ["frozen", "blocked"]:
        raise ValueError("Account is frozen/blocked. Cannot transact.")
        
    current_balance = float(acc["balance"])
    
    if txn_type == "deposit":
        new_balance = current_balance + amount
        # Update balance
        supabase.table("accounts").update({"balance": new_balance}).eq("account_id", account_id).execute()
        # Create txn record
        txn_record = txn.dict()
        txn_record["balance_after"] = new_balance
        supabase.table("transactions").insert(txn_record).execute()
        return {"status": "success", "new_balance": new_balance}
        
    elif txn_type == "withdraw":
        if current_balance < amount:
            raise ValueError("Insufficient funds")
        new_balance = current_balance - amount
        supabase.table("accounts").update({"balance": new_balance}).eq("account_id", account_id).execute()
        
        txn_record = txn.dict()
        txn_record["balance_after"] = new_balance
        supabase.table("transactions").insert(txn_record).execute()
        
        # Trigger Low Balance alert based on dynamic threshold
        config = get_account_config(acc["account_type"])
        threshold = float(config["min_balance_threshold"])
        
        if new_balance < threshold:
            # Simulated Alert / Workflow
            trigger_workflow("LOW_BALANCE_MONITORING", {"account_id": account_id, "balance": new_balance, "threshold": threshold})
            # Also send an email
            from services.email import send_email # type: ignore
            send_email(acc.get("email") or "manager@smartbank.test", "Low Balance Alert", f"Account {acc['account_number']} balance is ₹{new_balance}, below threshold of ₹{threshold}")
        
        # Check for OTP threshold
        otp_threshold = float(config["transaction_otp_threshold"])
        if amount > otp_threshold:
            # In a real app, this would pause the txn for OTP. Here we just log/alert.
            trigger_workflow("TRANSACTION_OTP_REQUIRED", {"account_id": account_id, "amount": amount, "threshold": otp_threshold})
            
        return {"status": "success", "new_balance": new_balance}
        
    elif txn_type == "transfer":
        if current_balance < amount:
            raise ValueError("Insufficient funds")
        if not txn.receiver_account:
            raise ValueError("Receiver account is required for transfer")
            
        # Fetch receiver
        recv_res = supabase.table("accounts").select("*").eq("account_number", txn.receiver_account).execute()
        if not recv_res.data:
            raise ValueError("Receiver account not found")
        recv_acc = recv_res.data[0]
        
        if recv_acc["status"] in ["frozen", "blocked"]:
            raise ValueError("Receiver account is frozen/blocked")
            
        # Update sender
        sender_new_balance = current_balance - amount
        supabase.table("accounts").update({"balance": sender_new_balance}).eq("account_id", account_id).execute()
        
        # Update receiver
        recv_new_balance = float(recv_acc["balance"]) + amount
        supabase.table("accounts").update({"balance": recv_new_balance}).eq("account_id", recv_acc["account_id"]).execute()
        
        # Txn for Sender
        sender_txn = txn.dict()
        sender_txn["balance_after"] = sender_new_balance
        supabase.table("transactions").insert(sender_txn).execute()
        
        # Txn for Receiver
        recv_txn = {
            "account_id": recv_acc["account_id"],
            "transaction_type": "deposit",
            "amount": amount,
            "receiver_account": acc["account_number"], # mark who sent it
            "balance_after": recv_new_balance
        }
        supabase.table("transactions").insert(recv_txn).execute()
        
        # Trigger Large Transaction Detection based on dynamic threshold
        config = get_account_config(acc["account_type"])
        approval_threshold = float(config["requires_manager_approval_above"])
        
        if amount > approval_threshold:
            trigger_workflow("LARGE_TRANSACTION_DETECTION", {"sender_id": account_id, "amount": amount, "receiver": txn.receiver_account, "threshold": approval_threshold})
            
        # Check for OTP threshold
        otp_threshold = float(config["transaction_otp_threshold"])
        if amount > otp_threshold:
            trigger_workflow("TRANSACTION_OTP_REQUIRED", {"account_id": account_id, "amount": amount, "threshold": otp_threshold})
            
        return {"status": "success", "new_balance": sender_new_balance}
        
    else:
        raise ValueError("Invalid transaction type")
