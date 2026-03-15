from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from database import supabase
from routers.auth import get_current_user

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.get("/")
def get_workflows(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["admin", "md", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = supabase.table("workflows").select("*, workflow_steps(*)").execute()
    return res.data

@router.post("/")
def create_workflow(payload: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    res = supabase.table("workflows").insert(payload).execute()
    return res.data[0]
