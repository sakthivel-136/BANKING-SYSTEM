from fastapi import APIRouter, Depends, HTTPException # type: ignore
from typing import Dict, Any, List
from database import supabase # type: ignore
from models.schemas import EnquiryCreate # type: ignore
from routers.auth import get_current_user # type: ignore

router = APIRouter(prefix="/enquiries", tags=["enquiries"])

@router.post("/")
def create_enquiry(enquiry: EnquiryCreate, user: Dict[str, Any] = Depends(get_current_user)):
    data = enquiry.dict()
    data["customer_id"] = user["id"]
    res = supabase.table("enquiries").insert(data).execute()
    return res.data[0]

@router.get("/")
def get_enquiries(user: Dict[str, Any] = Depends(get_current_user)):
    role = user.get("role", "customer")
    if role == "customer":
        res = supabase.table("enquiries").select("*").eq("customer_id", user["id"]).neq("status", "Closed").order("created_at", desc=True).execute()
    else:
        res = supabase.table("enquiries").select("*, customer_profile(full_name)").neq("status", "Closed").order("created_at", desc=True).execute()
    return res.data

@router.put("/{enquiry_id}")
def answer_enquiry(enquiry_id: str, payload: Dict[str, str], user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    update_data = {"status": "Answered"}
    if "response" in payload: update_data["response"] = payload["response"]
    
    res = supabase.table("enquiries").update(update_data).eq("enquiry_id", enquiry_id).execute()
    return res.data[0]

@router.put("/{enquiry_id}/close")
def close_enquiry(enquiry_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    # Both customer (owner) and manager can close
    req = supabase.table("enquiries").select("*").eq("enquiry_id", enquiry_id).execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Enquiry not found")
        
    enq = req.data[0]
    if user.get("role") == "customer" and enq["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    res = supabase.table("enquiries").update({"status": "Closed"}).eq("enquiry_id", enquiry_id).execute()
    return {"message": "Chat ended and archived securely."}
