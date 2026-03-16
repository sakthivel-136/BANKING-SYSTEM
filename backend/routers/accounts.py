from fastapi import APIRouter, Depends, HTTPException # type: ignore
from typing import Dict, Any, List # type: ignore
from database import supabase # type: ignore
from models.schemas import AccountCreate # type: ignore
from routers.auth import get_current_user # type: ignore
from services.email import ( # type: ignore
    send_account_frozen_notice,
    send_unfreeze_approved,
    send_account_blocked_notice,
    send_account_unblocked_notice,
    send_account_deactivated_notice,
)
from datetime import datetime, timezone
import httpx # type: ignore

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.post("/")
def create_account(acc: AccountCreate, user: Dict[str, Any] = Depends(get_current_user)):
    # Manager or auth can create. In a real system you enforce stricter scoping.
    data = acc.dict()
    res = supabase.table("accounts").insert(data).execute()
    return res.data[0]

@router.get("/mine")
def get_my_accounts(user: Dict[str, Any] = Depends(get_current_user)):
    res = supabase.table("accounts").select("*").eq("customer_id", user["id"]).execute()
    return res.data

@router.get("/")
def get_all_accounts(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = supabase.table("accounts").select("*, customer_profile:customer_id(full_name)").execute()
    return res.data

# ── Dashboard Stats (live data) ─────────────────────────────────────
@router.get("/dashboard-stats")
def get_dashboard_stats(user: Dict[str, Any] = Depends(get_current_user)):
    role = user.get("role")
    if role not in ["manager", "md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Fetch all accounts
    acc_res = supabase.table("accounts").select("account_type, status, balance").execute()
    accounts = acc_res.data or []
    
    total_accounts = len(accounts)
    active_accounts = sum(1 for a in accounts if a["status"] == "active")
    frozen_accounts = sum(1 for a in accounts if a["status"] == "frozen")
    blocked_accounts = sum(1 for a in accounts if a["status"] == "closed")
    
    savings_accounts = sum(1 for a in accounts if (a.get("account_type") or "").lower() == "savings")
    investment_accounts = sum(1 for a in accounts if (a.get("account_type") or "").lower() == "investment")
    current_accounts = sum(1 for a in accounts if (a.get("account_type") or "").lower() == "current")
    
    total_balance = sum(a.get("balance", 0) for a in accounts)
    low_balance_count = sum(1 for a in accounts if a.get("balance", 0) < 1000 and a["status"] == "active")
    
    # Pending transfer approvals
    transfer_res = supabase.table("transfer_requests").select("request_id").eq("status", "pending_approval").execute()
    pending_transfers = len(transfer_res.data) if transfer_res.data else 0
    
    # Pending account activity requests
    activity_res1 = supabase.table("account_activity_requests").select("request_id").eq("status", "pending_approval").execute()
    pending_activity = len(activity_res1.data) if activity_res1.data else 0
    
    # Pending profile update requests
    profile_res = supabase.table("profile_update_requests").select("request_id").eq("status", "pending_approval").execute()
    pending_profiles = len(profile_res.data) if profile_res.data else 0
    
    # Total customers
    cust_res = supabase.table("customer_profile").select("customer_id").execute()
    total_customers = len(cust_res.data) if cust_res.data else 0
    
    return {
        "total_accounts": total_accounts,
        "active_accounts": active_accounts,
        "frozen_accounts": frozen_accounts,
        "blocked_accounts": blocked_accounts,
        "savings_accounts": savings_accounts,
        "investment_accounts": investment_accounts,
        "current_accounts": current_accounts,
        "total_balance": total_balance,
        "total_customers": total_customers,
        "pending_transfers": pending_transfers,
        "pending_activity_requests": pending_activity,
        "pending_profile_updates": pending_profiles,
        "pending_approvals": pending_transfers + pending_activity + pending_profiles,
        "low_balance_count": low_balance_count
    }

@router.put("/{account_id}/status")
def update_status(account_id: str, status: str, user: Dict[str, Any] = Depends(get_current_user)):
    print(f"DEBUG update_status: user={user}")
    role = user.get("role")
    if not role or (isinstance(role, str) and role not in ["manager", "md", "admin"]) or (isinstance(role, list) and all(r not in ["manager", "md", "admin"] for r in role)):
        raise HTTPException(status_code=403, detail=f"Forbidden: role is {role}")
    
    # Get account and customer profile for email
    acc_res = supabase.table("accounts").select("*, customer_profile:customer_id(full_name, email)").eq("account_id", account_id).execute()
    if not acc_res.data:
        raise HTTPException(status_code=404, detail="Account not found")
    
    acc = acc_res.data[0]
    old_status = acc.get("status", "active")
    profile = acc.get("customer_profile", {})
    
    # Update account status
    res = supabase.table("accounts").update({"status": status}).eq("account_id", account_id).execute()
    if not res.data:
         raise HTTPException(status_code=500, detail="Failed to update status")

    # Send email notification to the CUSTOMER (not the manager)
    customer_name = profile.get("full_name", "Customer")
    customer_email = profile.get("email")
    account_number = acc["account_number"]
    
    if customer_email:
        try:
            if status == "frozen":
                send_account_frozen_notice(
                    customer_name=customer_name,
                    to_email=customer_email,
                    account_number=account_number,
                    reason="Account frozen by Manager"
                )
            elif status == "closed":
                send_account_blocked_notice(
                    customer_name=customer_name,
                    to_email=customer_email,
                    account_number=account_number,
                    reason="Account blocked by Manager"
                )
            elif status == "active" and old_status == "frozen":
                send_unfreeze_approved(
                    customer_name=customer_name,
                    to_email=customer_email,
                    account_number=account_number
                )
            elif status == "active" and old_status == "closed":
                send_account_unblocked_notice(
                    customer_name=customer_name,
                    to_email=customer_email,
                    account_number=account_number
                )
            elif status == "active":
                # Generic unfreeze/unblock for unknown previous state
                send_unfreeze_approved(
                    customer_name=customer_name,
                    to_email=customer_email,
                    account_number=account_number
                )
        except Exception as e:
            print(f"Email failure: {e}")

    # Audit log
    supabase.table("audit_logs").insert({
        "user_id": user["id"],
        "action": f"Changed status from {old_status} to {status}",
        "entity": f"account:{account_id}"
    }).execute()
    
    return res.data[0]

# ── Customer Activity Requests ───────────────────────────────────────
@router.post("/activity-request")
def request_activity(payload: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    # Payload: account_id, action_type (unblock, unfreeze, deactivate), duration_months, reason
    account_id = payload.get("account_id")
    if not account_id:
        raise HTTPException(status_code=400, detail="Account selection is required")

    action_type = payload.get("action_type")
    
    # Set initial status based on action type
    # Deactivation goes through manager -> MD chain
    initial_status = "pending_approval"
    
    data = {
        "account_id": account_id,
        "action_type": action_type,
        "duration_months": payload.get("duration_months"),
        "reason": payload.get("reason"),
        "status": initial_status
    }
    # Validate ownership
    acc_res = supabase.table("accounts").select("customer_id").eq("account_id", account_id).execute()
    if not acc_res.data or acc_res.data[0]["customer_id"] != user["id"]:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    res = supabase.table("account_activity_requests").insert(data).execute()
    return res.data[0]

# ── Manager approves unfreeze/unblock OR forwards deactivate to MD ───
@router.post("/activity-approve/{request_id}")
def approve_activity(request_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    req_res = supabase.table("account_activity_requests").select("*, accounts(*, customer_profile:customer_id(full_name, email))").eq("request_id", request_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = req_res.data[0]
    acc = req.get("accounts", {})
    profile = acc.get("customer_profile", {})
    
    # If deactivation → forward to MD, don't directly approve
    if req["action_type"] == "deactivate":
        try:
            supabase.table("account_activity_requests").update({
                "status": "pending_md",
                "manager_id": user["id"]
            }).eq("request_id", request_id).execute()
        except Exception:
            # Fallback: manager_id column may not exist yet (before migration 011)
            supabase.table("account_activity_requests").update({
                "status": "pending_md"
            }).eq("request_id", request_id).execute()
        return {"message": "Deactivation request forwarded to MD for final approval."}
    
    # For unfreeze/unblock → directly approve
    new_status = 'active'
    
    res = supabase.table("accounts").update({"status": new_status}).eq("account_id", req["account_id"]).execute()
    supabase.table("account_activity_requests").update({"status": "approved"}).eq("request_id", request_id).execute()
    
    # Send Notification to the customer
    customer_name = profile.get("full_name", "Customer")
    customer_email = profile.get("email")
    account_number = acc.get("account_number", "")
    
    if customer_email:
        try:
            if req["action_type"] == "unfreeze":
                send_unfreeze_approved(
                    customer_name=customer_name,
                    to_email=customer_email,
                    account_number=account_number
                )
            elif req["action_type"] == "unblock":
                send_account_unblocked_notice(
                    customer_name=customer_name,
                    to_email=customer_email,
                    account_number=account_number
                )
        except Exception as e:
            print(f"Email failure: {e}")
    
    return {"message": f"Account {req['action_type']}d successfully!"}

# ── MD approves deactivation ─────────────────────────────────────────
@router.post("/activity-md-approve/{request_id}")
def md_approve_deactivation(request_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["md"]:
        raise HTTPException(status_code=403, detail="Forbidden — MD only")
    
    req_res = supabase.table("account_activity_requests").select("*, accounts(*, customer_profile:customer_id(full_name, email))").eq("request_id", request_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = req_res.data[0]
    
    if req.get("status") != "pending_md":
        raise HTTPException(status_code=400, detail="This request is not pending MD approval")
    
    acc = req.get("accounts", {})
    profile = acc.get("customer_profile", {})
    customer_name = profile.get("full_name", "Customer")
    customer_email = profile.get("email")
    account_number = acc.get("account_number", "")
    duration_months = req.get("duration_months")
    
    if duration_months == 999:
        # Lifelong deactivation — permanently close and delete history
        duration_label = "Permanent (Lifelong)"
        
        # Delete transactions for this account
        supabase.table("transactions").delete().eq("account_id", req["account_id"]).execute()
        
        # Close the account permanently
        supabase.table("accounts").update({"status": "deactivated", "balance": 0}).eq("account_id", req["account_id"]).execute()
        
        # Delete complaints and enquiries for this customer
        customer_id = acc.get("customer_id")
        if customer_id:
            supabase.table("complaints").delete().eq("customer_id", customer_id).execute()
            supabase.table("enquiries").delete().eq("customer_id", customer_id).execute()
    else:
        # Temporary deactivation
        duration_label = f"{duration_months} Months"
        supabase.table("accounts").update({"status": "deactivated"}).eq("account_id", req["account_id"]).execute()
    
    # Mark request as approved
    supabase.table("account_activity_requests").update({"status": "approved"}).eq("request_id", request_id).execute()
    
    # Send email to customer
    if customer_email:
        try:
            send_account_deactivated_notice(
                customer_name=customer_name,
                to_email=customer_email,
                account_number=account_number,
                duration=duration_label
            )
        except Exception as e:
            print(f"Email failure: {e}")
    
    return {"message": f"Account deactivated successfully. Duration: {duration_label}"}

# ── MD reject deactivation ───────────────────────────────────────────
@router.post("/activity-md-reject/{request_id}")
def md_reject_deactivation(request_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["md"]:
        raise HTTPException(status_code=403, detail="Forbidden — MD only")
    
    req_res = supabase.table("account_activity_requests").select("request_id, status").eq("request_id", request_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req_res.data[0].get("status") != "pending_md":
        raise HTTPException(status_code=400, detail="This request is not pending MD approval")
    
    supabase.table("account_activity_requests").update({"status": "rejected"}).eq("request_id", request_id).execute()
    return {"message": "Deactivation request rejected."}

# ── Pending lists ─────────────────────────────────────────────────────
@router.get("/activity-pending")
def list_pending_activities(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    # Manager sees pending_approval (unfreeze/unblock)
    res1 = supabase.table("account_activity_requests").select("*, accounts(account_number, customer_profile:customer_id(full_name))").eq("status", "pending_approval").execute()
    return res1.data or []

@router.get("/activity-pending-md")
def list_pending_md_activities(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["md"]:
        raise HTTPException(status_code=403, detail="Forbidden — MD only")
    res = supabase.table("account_activity_requests").select("*, accounts(account_number, account_type, balance, customer_profile(full_name, email))").eq("status", "pending_md").execute()
    return res.data or []

# ── Low Balance Alerts ─────────────────────────────────────────────────

@router.get("/low-balance-alerts")
def get_low_balance_alerts(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # ── Step 1: Fetch all account configs (thresholds) ──
    configs_res = supabase.table("account_configs").select("account_type, min_balance_threshold").execute()
    # Build a dict: "Savings" -> 1000, "Current" -> 5000, etc.
    config_map: dict = {}
    for c in (configs_res.data or []):
        config_map[c["account_type"].lower()] = float(c["min_balance_threshold"])
    default_threshold = 1000.0

    # ── Step 2: Fetch all active accounts with customer profile ──
    acc_res = supabase.table("accounts").select(
        "account_id, account_number, account_type, balance, status, customer_profile:customer_id(full_name, email)"
    ).eq("status", "active").execute()
    # Exclude INTERNAL accounts (like BANK-CHARGES-0001) — they are bank-owned, not customer accounts
    accounts = [a for a in (acc_res.data or []) if str(a.get("account_type", "")).lower() != "internal"]

    # ── Step 3: Fetch existing DB alert records so we can carry escalation state ──
    db_alerts: dict = {}
    try:
        da_res = supabase.table("low_balance_alerts").select(
            "alert_id, account_id, status, escalation_message, manager_note, created_at"
        ).in_("status", ["open", "escalated"]).execute()
        for a in (da_res.data or []):
            db_alerts[str(a["account_id"])] = a
    except Exception:
        pass  # Table may not exist yet — that's fine

    # ── Step 4: Build alert list from accounts below threshold ──
    alerts = []
    for acc in accounts:
        acc_type = (acc.get("account_type") or "savings").lower()
        threshold = config_map.get(acc_type, default_threshold)
        balance = float(acc.get("balance") or 0)
        
        acc_id = str(acc["account_id"])
        db = db_alerts.get(acc_id)
        
        if balance < threshold:
            # Should have an alert
            alerts.append({
                "alert_id": db.get("alert_id", acc_id) if db else acc_id,
                "account_id": acc_id,
                "balance": balance,
                "threshold": threshold,
                "status": db.get("status", "open") if db else "open",
                "escalation_message": db.get("escalation_message") if db else None,
                "manager_note": db.get("manager_note") if db else None,
                "created_at": db.get("created_at", "") if db else "",
                "accounts": {
                    "account_number": acc["account_number"],
                    "account_type": acc["account_type"],
                    "balance": balance,
                    "status": acc["status"],
                    "customer_profile": acc.get("customer_profile")
                }
            })
        elif db:
            # Balance reached threshold, but DB still has it open/escalated?
            # We should probably resolve it here if not already handled by transaction logic.
            # But get_low_balance_alerts is a GET, we shouldn't mutate state here ideally.
            # Still, for a "not functioning properly" fix, we can trigger a lazy resolution.
            try:
                supabase.table("low_balance_alerts").update({
                    "status": "resolved",
                    "resolved_at": datetime.now(timezone.utc).isoformat()
                }).eq("alert_id", db["alert_id"]).execute()
            except Exception: pass

    return alerts

@router.post("/alert-resolve/{alert_id}")
def resolve_alert(alert_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        supabase.table("low_balance_alerts").update({"status": "resolved"}).eq("alert_id", alert_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Alert resolved."}

@router.post("/alert-revert/{alert_id}")
def revert_alert_to_manager(alert_id: str, payload: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    """MD reverts an escalated alert back to the manager for further action."""
    if user.get("role") not in ["md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden — MD only")
    note = payload.get("note", "").strip() or "Reverted by MD — please review."
    try:
        supabase.table("low_balance_alerts").update({
            "status": "open",
            "manager_note": f"[REVERTED BY MD]: {note}",
        }).eq("alert_id", alert_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Alert reverted to manager successfully."}

@router.post("/alert-escalate/{alert_id}")
def escalate_alert(alert_id: str, payload: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden — Managers only")
    message = payload.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Escalation message is required")
    try:
        # First, ensure the alert record exists in the DB
        existing = supabase.table("low_balance_alerts").select("alert_id").eq("alert_id", alert_id).execute()
        if not existing.data:
            # The alert was dynamically computed — we need account_id from the alert_id
            # alert_id might directly be account_id when alerts don't exist in DB
            supabase.table("low_balance_alerts").insert({
                "alert_id": alert_id,
                "account_id": alert_id,  # alert_id == account_id when computed dynamically
                "status": "escalated",
                "escalation_message": message,
                "manager_note": f"Escalated by manager ID: {user['id']}"
            }).execute()
        else:
            supabase.table("low_balance_alerts").update({
                "status": "escalated",
                "escalation_message": message,
                "manager_note": f"Escalated by manager ID: {user['id']}"
            }).eq("alert_id", alert_id).execute()
    except Exception as e:
        err_str = str(e)
        if "schema cache" in err_str.lower() or "not found" in err_str.lower():
            raise HTTPException(
                status_code=503,
                detail="The alerts system is not set up yet. Please run database migration 011 first."
            )
        raise HTTPException(status_code=400, detail=err_str)
    return {"message": "Alert escalated to MD successfully."}

@router.post("/alert-freeze/{alert_id}")
def freeze_from_alert(alert_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Manager freezes the account directly from an alert."""
    if user.get("role") not in ["manager", "md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        alert_res = supabase.table("low_balance_alerts").select("account_id").eq("alert_id", alert_id).execute()
        if not alert_res.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        account_id = alert_res.data[0]["account_id"]

        # Fetch account + customer profile for email
        acc_res = supabase.table("accounts").select("*, customer_profile:customer_id(full_name, email)").eq("account_id", account_id).execute()
        if not acc_res.data:
            raise HTTPException(status_code=404, detail="Account not found")
        acc = acc_res.data[0]
        profile = acc.get("customer_profile", {})

        supabase.table("accounts").update({"status": "frozen"}).eq("account_id", account_id).execute()
        supabase.table("low_balance_alerts").update({"status": "resolved"}).eq("alert_id", alert_id).execute()

        if profile.get("email"):
            try:
                send_account_frozen_notice(
                    customer_name=profile.get("full_name", "Customer"),
                    to_email=profile["email"],
                    account_number=acc["account_number"],
                    reason="Low balance — account frozen by Manager"
                )
            except Exception as e:
                print(f"Email failure: {e}")

        return {"message": "Account frozen and alert resolved."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/escalated-alerts")
def get_escalated_alerts(user: Dict[str, Any] = Depends(get_current_user)):
    """MD-only: view all alerts escalated by managers."""
    if user.get("role") not in ["md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden — MD only")
    try:
        # Fetch raw alerts without joins (most reliable approach)
        res = supabase.table("low_balance_alerts").select(
            "alert_id, account_id, status, escalation_message, manager_note, created_at"
        ).eq("status", "escalated").order("created_at", desc=True).execute()
        raw: List[Dict] = res.data or []
        print(f"DEBUG escalated-alerts raw count: {len(raw)}")

        # Manually enrich each alert with account and customer profile
        enriched: List[Dict] = []
        for a in raw:
            acc_data: Dict[str, Any] = {}
            try:
                acc_res = supabase.table("accounts").select(
                    "account_number, account_type, balance, customer_profile:customer_id(full_name, email)"
                ).eq("account_id", a["account_id"]).execute()
                acc_data = acc_res.data[0] if acc_res.data else {}
            except Exception as acc_err:
                print(f"DEBUG: enrichment failed for alert {a.get('alert_id')}: {acc_err}")
            enriched.append({
                "alert_id": a.get("alert_id"),
                "account_id": a.get("account_id"),
                "status": a.get("status"),
                "escalation_message": a.get("escalation_message"),
                "manager_note": a.get("manager_note"),
                "created_at": a.get("created_at"),
                "accounts": acc_data,
            })
        return enriched
    except Exception as e:
        print(f"DEBUG: escalated-alerts failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch escalated alerts: {str(e)}")




# ── Manual trigger for monthly charges (Manager / Admin) ─────────────────────

@router.post("/trigger-monthly-charges")
def trigger_monthly_charges(user: Dict[str, Any] = Depends(get_current_user)):
    """Allows a manager/admin to manually trigger the monthly bank charges
    (minimum balance fine + ₹50 notification charge) for all active accounts."""
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden — Managers only")
    try:
        from services.banking import apply_monthly_charges  # type: ignore
        result = apply_monthly_charges(manager_id=user["id"], dry_run=False)
        return {"message": "Monthly charges applied successfully!", "summary": result}
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Monthly charges failed: {str(e)}")


@router.post("/reverse-monthly-charges")
def reverse_monthly_charges(user: Dict[str, Any] = Depends(get_current_user)):
    """Reverses the last batch of monthly charges for the current month."""
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden — Managers only")
    
    try:
        from services.banking import reverse_last_monthly_batch # type: ignore
        result = reverse_last_monthly_batch()
        return {"message": "Monthly charges reversed successfully!", "count": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reversal failed: {str(e)}")


@router.post("/preview-monthly-charges")
def preview_monthly_charges(user: Dict[str, Any] = Depends(get_current_user)):
    """Dry-run: shows what charges would be applied without actually deducting."""
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden — Managers only")
    try:
        from services.banking import apply_monthly_charges  # type: ignore
        result = apply_monthly_charges(manager_id=user["id"], dry_run=True)
        return {"message": "Preview only — no charges were applied.", "preview": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

@router.get("/monthly-charges-status")
def get_monthly_charges_status(user: Dict[str, Any] = Depends(get_current_user)):
    """Check if monthly charges have already been applied for the current month."""
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    now = datetime.now()
    res = supabase.table("monthly_charge_logs").select("*").eq("month", now.month).eq("year", now.year).execute()
    
    return {"applied": len(res.data) > 0, "log": res.data[0] if res.data else None}
