from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from database import supabase
from routers.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/summary")
def get_md_summary(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") != "md":
        raise HTTPException(status_code=403, detail="Forbidden - MD only")
    
    # Very basic aggregation query using python processing instead of complex RPC for now
    acc_res = supabase.table("accounts").select("balance, status").execute()
    accounts = acc_res.data
    print(f"DEBUG: MD Summary found {len(accounts)} accounts")
    total_balance = sum(a["balance"] for a in accounts)
    frozen_count = sum(1 for a in accounts if a["status"] == "frozen")
    blocked_count = sum(1 for a in accounts if a["status"] == "blocked")
    total_accounts = len(accounts)

    txn_res = supabase.table("transactions").select("amount, transaction_type").execute()
    txns = txn_res.data
    total_deposits = sum(t["amount"] for t in txns if t["transaction_type"] == "deposit")
    total_withdrawals = sum(t["amount"] for t in txns if t["transaction_type"] == "withdraw")
    total_transfers = sum(t["amount"] for t in txns if t["transaction_type"] == "transfer")

    return {
        "Total Balance": total_balance,
        "Total Accounts": total_accounts,
        "Frozen Accounts": frozen_count,
        "Blocked Accounts": blocked_count,
        "Total Deposits": total_deposits,
        "Total Withdrawals": total_withdrawals,
        "Total Transfers": total_transfers
    }
