from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from database import supabase
from routers.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/")
def get_my_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    res = supabase.table("notifications").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return res.data

@router.put("/{notif_id}/read")
def mark_read(notif_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    res = supabase.table("notifications").update({"status": "read"}).eq("notification_id", notif_id).eq("user_id", user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return res.data[0]
