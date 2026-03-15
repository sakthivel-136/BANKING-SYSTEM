from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from database import supabase
from routers.auth import get_current_user

router = APIRouter(prefix="/executions", tags=["executions"])

@router.get("/")
def get_executions(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = supabase.table("workflow_executions").select("*, workflows(name)").order("started_at", desc=True).execute()
    return res.data

@router.get("/{exec_id}")
def get_execution_details(exec_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = supabase.table("workflow_executions").select("*").eq("execution_id", exec_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Execution not found")
    return res.data[0]
