from fastapi import APIRouter, Depends, HTTPException # type: ignore
from typing import Dict, Any, List
from database import supabase # type: ignore
from models.schemas import ComplaintCreate # type: ignore
from routers.auth import get_current_user # type: ignore

router = APIRouter(prefix="/complaints", tags=["complaints"])

@router.post("/")
def create_complaint(complaint: ComplaintCreate, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        data = complaint.dict()
        data["customer_id"] = user["id"]
        res = supabase.table("complaints").insert(data).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
def get_complaints(user: Dict[str, Any] = Depends(get_current_user)):
    role = user.get("role", "customer")
    try:
        if role == "customer":
            res = supabase.table("complaints").select("*").eq("customer_id", user["id"]).order("created_at", desc=True).execute()
            return res.data or []
        else:
            # Managers / MD / Admin see all — include customer profile details
            try:
                res = supabase.table("complaints").select(
                    "*, customer_profile:customer_id(full_name, email, phone_number)"
                ).order("created_at", desc=True).execute()
                return res.data or []
            except Exception:
                # Fallback without join
                res = supabase.table("complaints").select("*").order("created_at", desc=True).execute()
                return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch complaints: {str(e)}")


@router.put("/{complaint_id}")
def update_complaint(complaint_id: str, payload: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    update_data = {}
    if "status" in payload: update_data["status"] = payload["status"]
    if "manager_response" in payload: update_data["manager_response"] = payload["manager_response"]
    
    res = supabase.table("complaints").update(update_data).eq("complaint_id", complaint_id).execute()
    return res.data[0] if res.data else None
