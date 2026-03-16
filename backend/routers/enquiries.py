from fastapi import APIRouter, Depends, HTTPException # type: ignore
from typing import Dict, Any, List
from database import supabase # type: ignore
from models.schemas import EnquiryCreate # type: ignore
from routers.auth import get_current_user # type: ignore

router = APIRouter(prefix="/enquiries", tags=["enquiries"])

GREETING_MSG = "Thank you for contacting SmartBank! We are always ready to help you 24/7. A manager will be with you shortly. Happy Banking! 🏦"
FAREWELL_MSG = "Thank you for chatting with SmartBank Support! We hope we were able to help you. Visit us anytime — we are here for you 24/7. Stay safe! 🙏"


# ─── IMPORTANT: Specific paths MUST be defined BEFORE /{enquiry_id} routes ───

@router.post("/close-session")
def close_session(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Close ALL active enquiries for this customer in one call.
    Sends the farewell message on the LAST message before archiving.
    """
    try:
        res = supabase.table("enquiries").select("enquiry_id, status, response, created_at").eq("customer_id", user["id"]).order("created_at", desc=False).execute()
        all_enquiries: List[Dict] = res.data or []

        # Filter out already-closed ones in Python
        active = [
            e for e in all_enquiries
            if str(e.get("status", "")).lower() not in ["closed"]
            and not str(e.get("response", "") or "").startswith("[CLOSED]")
        ]

        if not active:
            return {"message": "No active session to close."}

        last_id: str = active[-1]["enquiry_id"]
        rest: List[Dict] = active[:-1]

        # Set farewell on the LAST message
        try:
            supabase.table("enquiries").update({
                "status": "Closed",
                "response": FAREWELL_MSG
            }).eq("enquiry_id", last_id).execute()
            # Archive all others silently
            for e in rest:
                try:
                    supabase.table("enquiries").update({"status": "Closed"}).eq("enquiry_id", e["enquiry_id"]).execute()
                except Exception:
                    pass
        except Exception:
            # Fallback: enum may not have 'Closed' yet — use Answered + [CLOSED] tag
            supabase.table("enquiries").update({
                "status": "Answered",
                "response": f"[CLOSED] {FAREWELL_MSG}"
            }).eq("enquiry_id", last_id).execute()
            for e in rest:
                try:
                    supabase.table("enquiries").update({
                        "status": "Answered",
                        "response": "[CLOSED]"
                    }).eq("enquiry_id", e["enquiry_id"]).execute()
                except Exception:
                    pass

        return {"message": "Session ended. Thank you for chatting!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/")
def create_enquiry(enquiry: EnquiryCreate, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        data = enquiry.dict()
        data["customer_id"] = user["id"]

        # Check for any ACTIVE session enquiries (Pending or Answered but not closed)
        existing_res = supabase.table("enquiries").select("enquiry_id, status, response").eq("customer_id", user["id"]).execute()
        all_records: List[Dict] = existing_res.data or []

        # Active = any enquiry that is NOT closed and NOT tagged [CLOSED]
        active_session = [
            e for e in all_records
            if str(e.get("status", "")).lower() not in ["closed"]
            and not str(e.get("response", "") or "").startswith("[CLOSED]")
        ]

        if not active_session:
            # NEW SESSION — send greeting as the response to the first message only
            data["response"] = GREETING_MSG
            data["status"] = "Answered"
        else:
            # ONGOING SESSION — just queue the message for manager reply
            data["status"] = "Pending"
            data["response"] = None

        res = supabase.table("enquiries").insert(data).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
def get_enquiries(user: Dict[str, Any] = Depends(get_current_user)):
    role = user.get("role", "customer")
    try:
        if role == "customer":
            res = supabase.table("enquiries").select("*").eq("customer_id", user["id"]).order("created_at", desc=False).execute()
            # Show only active session — filter closed/archived in Python
            data = [
                e for e in (res.data or [])
                if str(e.get("status", "")).lower() not in ["closed"]
                and not str(e.get("response", "") or "").startswith("[CLOSED]")
            ]
            return data
        else:
            # Manager / MD — all non-closed, with customer name
            res = supabase.table("enquiries").select("*, customer_profile:customer_id(full_name)").order("created_at", desc=True).execute()
            data = [
                e for e in (res.data or [])
                if str(e.get("status", "")).lower() not in ["closed"]
                and not str(e.get("response", "") or "").startswith("[CLOSED]")
            ]
            return data
    except Exception as e:
        print(f"GET /enquiries error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load enquiries: {str(e)}")


@router.put("/{enquiry_id}")
def answer_enquiry(enquiry_id: str, payload: Dict[str, str], user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "md", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    update_data: Dict[str, Any] = {"status": "Answered"}
    if "response" in payload:
        update_data["response"] = payload["response"]

    try:
        res = supabase.table("enquiries").update(update_data).eq("enquiry_id", enquiry_id).execute()
        return res.data[0] if res.data else {"message": "Updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{enquiry_id}/close")
def close_enquiry(enquiry_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        req = supabase.table("enquiries").select("customer_id").eq("enquiry_id", enquiry_id).execute()
        if not req.data:
            raise HTTPException(status_code=404, detail="Enquiry not found")

        enq = req.data[0]
        if user.get("role") == "customer" and enq["customer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        try:
            supabase.table("enquiries").update({
                "status": "Closed",
                "response": FAREWELL_MSG
            }).eq("enquiry_id", enquiry_id).execute()
        except Exception:
            supabase.table("enquiries").update({
                "status": "Answered",
                "response": f"[CLOSED] {FAREWELL_MSG}"
            }).eq("enquiry_id", enquiry_id).execute()

        return {"message": "Chat ended and archived securely."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
