from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from typing import Dict, Any
from database import supabase  # type: ignore
from routers.auth import get_current_user, require_role  # type: ignore
from services.banking import apply_charge  # type: ignore

router = APIRouter(prefix="/reversals", tags=["reversals"])


@router.post("/from-complaint/{complaint_id}")
def create_reversal_from_complaint(
    complaint_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_role(["manager", "admin"])),
):
    """
    Manager creates a reversal request linked to a complaint.
    """
    txn_id = payload.get("transaction_id")
    amount = float(payload.get("amount") or 0)
    rtype = payload.get("type")
    reason = payload.get("reason") or ""

    if amount <= 0 or rtype not in ("charge_double", "wrong_transfer", "DIRECT_REVERSAL"):
        raise HTTPException(status_code=400, detail="Invalid reversal amount or type")

    # Fetch source account - either from txn or from complaint
    source_account_id = None
    if txn_id and txn_id != "undefined":
        try:
            txn_res = supabase.table("transactions").select("*").eq("transaction_id", txn_id).limit(1).execute()
            if txn_res.data:
                source_account_id = txn_res.data[0].get("account_id")
        except: pass

    if not source_account_id:
        # Fallback: find first active account for the customer who raised the complaint
        comp_res = supabase.table("complaints").select("customer_id").eq("complaint_id", complaint_id).execute()
        if comp_res.data:
            cust_id = comp_res.data[0]["customer_id"]
            acc_res = supabase.table("accounts").select("account_id").eq("customer_id", cust_id).eq("status", "active").limit(1).execute()
            if acc_res.data:
                source_account_id = acc_res.data[0]["account_id"]

    if not source_account_id:
        raise HTTPException(status_code=400, detail="Could not identify account for reversal. Please link to a valid transaction or ensure customer has an active account.")

    reversal_data = {
        "complaint_id": complaint_id,
        "source_account_id": source_account_id,
        "amount": amount,
        "type": rtype,
        "reason": reason,
        "created_by_manager_id": user["id"],
        "status": "pending"
    }
    if txn_id and txn_id != "undefined" and len(str(txn_id)) > 10:
        reversal_data["original_transaction_id"] = txn_id

    reversal = supabase.table("reversal_requests").insert(reversal_data).execute()

    return reversal.data[0] if reversal.data else {}


@router.get("/pending")
def list_pending_reversals(user: Dict[str, Any] = Depends(require_role(["md", "admin"]))):
    """
    MD/Admin view of all pending reversal requests with complaint + customer context.
    """
    res = (
        supabase.table("reversal_requests")
        .select(
            "*, complaints(title, description, customer_id), "
            "transactions:original_transaction_id(transaction_type, amount, receiver_account, created_at)"
        )
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.post("/{reversal_id}/approve")
def approve_reversal(
    reversal_id: str,
    user: Dict[str, Any] = Depends(require_role(["md", "admin"])),
):
    """
    MD approves a reversal request.
    """
    # Load reversal with customer details for email
    rev_res = (
        supabase.table("reversal_requests")
        .select("*, accounts:source_account_id(account_number, customer_profile:customer_id(email, full_name))")
        .eq("reversal_id", reversal_id)
        .limit(1)
        .execute()
    )
    if not rev_res.data:
        raise HTTPException(status_code=404, detail="Reversal request not found")
    rev = rev_res.data[0]

    if rev.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Reversal already processed")

    account_id = str(rev.get("source_account_id"))
    amount = float(rev.get("amount") or 0)
    account_number = rev["accounts"]["account_number"]
    customer = rev["accounts"]["customer_profile"]

    # Perform reversal by crediting back amount
    new_balance = apply_charge(account_id, account_number, -amount, "Manual reversal approved by MD")

    # Mark reversal approved
    supabase.table("reversal_requests").update({
        "status": "approved",
        "approved_by_md_id": user["id"],
        "approved_at": "now()",
    }).eq("reversal_id", reversal_id).execute()

    # Notify Customer
    if customer and customer.get("email"):
        from services.email import send_reversal_status_update # type: ignore
        send_reversal_status_update(customer["full_name"], customer["email"], account_number, amount, "approved", new_balance)

    # If linked complaint, mark resolved
    if rev.get("complaint_id"):
        supabase.table("complaints").update({"status": "Resolved"}).eq("complaint_id", rev["complaint_id"]).execute()

    return {"status": "success", "new_balance": new_balance}

@router.post("/request")
def request_reversal(payload: Dict[str, Any], user: Dict[str, Any] = Depends(require_role(["customer"]))):
    """
    Customer requests a reversal for one of their transactions.
    """
    txn_id = payload.get("transaction_id")
    amount = float(payload.get("amount") or 0)
    reason = payload.get("reason") or ""
    
    if not txn_id or amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid request")

    # Verify ownership of transaction
    txn_res = supabase.table("transactions").select("*, accounts(customer_id)").eq("transaction_id", txn_id).execute()
    if not txn_res.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    txn = txn_res.data[0]
    if txn.get("accounts", {}).get("customer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Create reversal request (created_by_manager_id remains NULL until manager verifies)
    res = supabase.table("reversal_requests").insert({
        "original_transaction_id": txn_id,
        "source_account_id": txn["account_id"],
        "amount": amount,
        "type": "wrong_transfer", # Default for customer requests
        "reason": f"CUSTOMER REQUEST: {reason}",
        "status": "pending"
    }).execute()
    
    return res.data[0] if res.data else {}

@router.post("/{reversal_id}/verify")
def verify_reversal(reversal_id: str, user: Dict[str, Any] = Depends(require_role(["manager", "admin", "md"]))):
    """
    Manager verifies a customer's reversal request and escalates it to MD.
    """
    # Simply set created_by_manager_id to 'sign' the verification
    res = supabase.table("reversal_requests").update({
        "created_by_manager_id": user["id"]
    }).eq("reversal_id", reversal_id).execute()
    
    return res.data[0] if res.data else {}

@router.get("/all")
def list_all_reversals(user: Dict[str, Any] = Depends(require_role(["manager", "md", "admin"]))):
    """List all reversal requests with enrichment."""
    res = supabase.table("reversal_requests").select(
        "*, accounts:source_account_id(account_number, customer_profile:customer_id(full_name)), "
        "complaints(title)"
    ).order("created_at", desc=True).execute()
    return res.data or []
