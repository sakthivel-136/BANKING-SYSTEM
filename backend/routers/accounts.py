from fastapi import APIRouter, Depends, HTTPException # type: ignore
from typing import Dict, Any, List # type: ignore
from database import supabase # type: ignore
from models.schemas import AccountCreate # type: ignore
from routers.auth import get_current_user # type: ignore
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

@router.put("/{account_id}/status")
def update_status(account_id: str, status: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Update account status
    res = supabase.table("accounts").update({"status": status}).eq("account_id", account_id).execute()
    
    # Audit log
    supabase.table("audit_logs").insert({
        "user_id": user["id"],
        "action": f"Changed status to {status}",
        "entity": f"account:{account_id}"
    }).execute()
    
    return res.data[0]
@router.post("/activity-request")
def request_activity(payload: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    # Payload: account_id, action_type (unblock, unfreeze, deactivate), duration_months, reason
    data = {
        "account_id": payload["account_id"],
        "action_type": payload["action_type"],
        "duration_months": payload.get("duration_months"),
        "reason": payload.get("reason"),
        "status": "pending_approval"
    }
    # Validate ownership
    acc_res = supabase.table("accounts").select("customer_id").eq("account_id", payload["account_id"]).execute()
    if not acc_res.data or acc_res.data[0]["customer_id"] != user["id"]:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    res = supabase.table("account_activity_requests").insert(data).execute()
    return res.data[0]

@router.post("/activity-approve/{request_id}")
def approve_activity(request_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    req_res = supabase.table("account_activity_requests").select("*").eq("request_id", request_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = req_res.data[0]
    
    # Apply change
    new_status = 'active'
    if req["action_type"] == 'deactivate':
        new_status = 'closed' # or blocked
    
    supabase.table("accounts").update({"status": new_status}).eq("account_id", req["account_id"]).execute()
    supabase.table("account_activity_requests").update({"status": "approved"}).eq("request_id", request_id).execute()
    
    return {"message": f"Account {req['action_type']}d successfully!"}

@router.get("/activity-pending")
def list_pending_activities(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = supabase.table("account_activity_requests").select("*, accounts(account_number, customer_profile(full_name))").eq("status", "pending_approval").execute()
    return res.data
