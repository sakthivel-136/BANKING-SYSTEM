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
    Expected payload:
      {
        "transaction_id": "<uuid>",
        "amount": 123.45,
        "type": "charge_double" | "wrong_transfer",
        "reason": "text note"
      }
    """
    txn_id = payload.get("transaction_id")
    amount = float(payload.get("amount") or 0)
    rtype = payload.get("type")
    reason = payload.get("reason") or ""

    if not txn_id or amount <= 0 or rtype not in ("charge_double", "wrong_transfer"):
        raise HTTPException(status_code=400, detail="Invalid reversal payload")

    # Fetch original transaction & account
    txn_res = supabase.table("transactions").select("*").eq("transaction_id", txn_id).limit(1).execute()
    if not txn_res.data:
        raise HTTPException(status_code=404, detail="Original transaction not found")
    txn = txn_res.data[0]

    reversal = supabase.table("reversal_requests").insert(
        {
            "complaint_id": complaint_id,
            "original_transaction_id": txn_id,
            "source_account_id": txn.get("account_id"),
            "target_account_id": None,
            "amount": amount,
            "type": rtype,
            "reason": reason,
            "created_by_manager_id": user["id"],
        }
    ).execute()

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
    For double charges: credit amount back to the customer's account.
    """
    # Load reversal
    rev_res = (
        supabase.table("reversal_requests")
        .select("*")
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
    if not account_id or amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid reversal configuration")

    # Fetch account to get number
    acc_res = supabase.table("accounts").select("account_number").eq("account_id", account_id).limit(1).execute()
    if not acc_res.data:
        raise HTTPException(status_code=404, detail="Account not found for reversal")
    account_number = acc_res.data[0]["account_number"]

    # Perform reversal by crediting back amount (negative charge)
    new_balance = apply_charge(account_id, account_number, -amount, "Manual reversal approved by MD")

    # Mark reversal approved
    supabase.table("reversal_requests").update(
        {
            "status": "approved",
            "approved_by_md_id": user["id"],
            "approved_at": "now()",
        }
    ).eq("reversal_id", reversal_id).execute()

    # If linked complaint, mark resolved
    if rev.get("complaint_id"):
        supabase.table("complaints").update({"status": "Resolved"}).eq("complaint_id", rev["complaint_id"]).execute()

    return {"status": "success", "new_balance": new_balance}

