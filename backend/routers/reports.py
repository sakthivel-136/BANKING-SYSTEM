from fastapi import APIRouter, Depends, HTTPException # type: ignore
from fastapi.responses import StreamingResponse # type: ignore
from typing import Dict, Any
from database import supabase # type: ignore
from routers.auth import get_current_user # type: ignore
import csv
import io
from datetime import datetime, timezone

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/summary")
def get_md_summary(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") != "md":
        raise HTTPException(status_code=403, detail="Forbidden - MD only")
    
    acc_res = supabase.table("accounts").select("balance, status").execute()
    accounts = acc_res.data
    total_balance = sum(a["balance"] for a in accounts)
    frozen_count = sum(1 for a in accounts if a["status"] == "frozen")
    blocked_count = sum(1 for a in accounts if a["status"] == "closed")
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

@router.get("/monthly-download")
def download_monthly_report(user: Dict[str, Any] = Depends(get_current_user)):
    """Download a comprehensive CSV report of the current month's activity."""
    if user.get("role") != "md":
        raise HTTPException(status_code=403, detail="Forbidden - MD only")

    output = io.StringIO()
    writer = csv.writer(output)
    now = datetime.now(timezone.utc)
    month_label = now.strftime("%B %Y")

    # ── Section 1: Transactions ──
    writer.writerow([f"=== SECTION 1: TRANSACTIONS ({month_label}) ==="])
    writer.writerow(["Transaction ID", "Account Number", "Type", "Amount (₹)", "Balance After", "Description", "Created At"])
    txns = supabase.table("transactions").select("*, accounts(account_number)").order("created_at", desc=True).execute().data or []
    for t in txns:
        writer.writerow([
            t.get("transaction_id", ""),
            t.get("accounts", {}).get("account_number", ""),
            t.get("transaction_type", ""),
            t.get("amount", ""),
            t.get("balance_after", ""),
            t.get("description", ""),
            t.get("created_at", ""),
        ])

    writer.writerow([])

    # ── Section 2: Transfer Requests ──
    writer.writerow([f"=== SECTION 2: TRANSFER REQUESTS ({month_label}) ==="])
    writer.writerow(["Request ID", "From Account", "To Account", "Amount (₹)", "Status", "Notes", "Created At"])
    transfers = supabase.table("transfer_requests").select("*").order("created_at", desc=True).execute().data or []
    for t in transfers:
        writer.writerow([
            t.get("request_id", ""),
            t.get("source_account_id", ""),
            t.get("destination_account_id", ""),
            t.get("amount", ""),
            t.get("status", ""),
            t.get("notes", ""),
            t.get("created_at", ""),
        ])

    writer.writerow([])

    # ── Section 3: Account Activity Requests ──
    writer.writerow([f"=== SECTION 3: ACCOUNT ACTIVITY REQUESTS ({month_label}) ==="])
    writer.writerow(["Request ID", "Account ID", "Action Type", "Reason", "Duration Days", "Status", "Created At"])
    activities = supabase.table("account_activity_requests").select("*").order("created_at", desc=True).execute().data or []
    for a in activities:
        writer.writerow([
            a.get("request_id", ""),
            a.get("account_id", ""),
            a.get("action_type", ""),
            a.get("reason", ""),
            a.get("duration_days", ""),
            a.get("status", ""),
            a.get("created_at", ""),
        ])

    writer.writerow([])

    # ── Section 4: Profile Update Requests ──
    writer.writerow([f"=== SECTION 4: PROFILE UPDATE REQUESTS ({month_label}) ==="])
    writer.writerow(["Request ID", "Customer ID", "Field Changed", "Old Value", "New Value", "Status", "Created At"])
    profiles = supabase.table("profile_update_requests").select("*").order("created_at", desc=True).execute().data or []
    for p in profiles:
        writer.writerow([
            p.get("request_id", ""),
            p.get("customer_id", ""),
            p.get("field_name", ""),
            p.get("old_value", ""),
            p.get("new_value", ""),
            p.get("status", ""),
            p.get("created_at", ""),
        ])

    writer.writerow([])

    # ── Section 5: Chat / Enquiry Logs ──
    writer.writerow([f"=== SECTION 5: CHAT LOGS / ENQUIRIES ({month_label}) ==="])
    writer.writerow(["Enquiry ID", "Customer ID", "Message", "Manager Response", "Status", "Created At"])
    enquiries = supabase.table("enquiries").select("*").order("created_at", desc=True).execute().data or []
    for e in enquiries:
        writer.writerow([
            e.get("enquiry_id", ""),
            e.get("customer_id", ""),
            e.get("message", ""),
            e.get("response", ""),
            e.get("status", ""),
            e.get("created_at", ""),
        ])

    output.seek(0)
    filename = f"smartbank_report_{now.strftime('%Y_%m')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
