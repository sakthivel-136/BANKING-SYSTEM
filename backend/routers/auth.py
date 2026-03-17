from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks # type: ignore
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # type: ignore
try:
    from database import supabase, supabase_anon # type: ignore
except ImportError:
    try:
        from backend.database import supabase, supabase_anon # type: ignore
    except ImportError:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from database import supabase, supabase_anon # type: ignore
from typing import Dict, Any
import random

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        meta = response.user.user_metadata or {}
        # Try 'roles' first (plural), then 'role' (singular), default to 'customer'
        raw_role = meta.get('roles') or meta.get('role') or 'customer'
        # Normalize to lowercase for consistent comparisons
        role = str(raw_role).lower()
        return {
            "id": response.user.id,
            "email": response.user.email,
            "user_metadata": meta,
            "role": role
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

def require_role(roles: list[str]):
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role privileges")
        return user
    return role_checker

@router.get("/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    profile_res = supabase.table("customer_profile").select("*").eq("customer_id", user["id"]).execute()
    if profile_res.data:
        user["profile"] = profile_res.data[0]
    return user


# --- OTP Login Flow ---

from models.schemas import LoginOTPRequest, LoginOTPVerify, StaffCreationRequest, StaffVerifySetup # type: ignore
from services.email import send_email # type: ignore

@router.post("/login-otp/request")
def request_login_otp(payload: LoginOTPRequest, background_tasks: BackgroundTasks):
    # Look up email by Customer ID (CU123456) or accept email directly for staff
    print(f"DEBUG: Processing OTP request for {payload.customer_id}...", flush=True)
    res = supabase.table("customer_profile").select("email").eq("customer_number", payload.customer_id).execute()
    if not res.data:
        if "@" in payload.customer_id:
            email = payload.customer_id
        else:
            print(f"DEBUG: User {payload.customer_id} not found in profile", flush=True)
            raise HTTPException(status_code=404, detail="User not found with this Customer ID")
    else:
        email = res.data[0]["email"]

    try:
        # Generate OTP in Supabase WITHOUT sending mail
        # This keeps the OTP in Supabase's system for standard verification
        res_link = supabase.auth.admin.generate_link({
            "type": "magiclink",
            "email": email
        })
        
        # Extract the internal OTP
        otp = getattr(res_link.properties, "email_otp", None)
        if not otp:
            raise Exception("OTP extraction failed")

        # Deliver via SmartBank Branded Template (Resent)
        from services.email import send_login_otp # type: ignore
        full_name = res.data[0].get("full_name", "Customer") if res.data else "Customer"
        send_login_otp(full_name, email, otp)
        
        print(f"DEBUG: Branded Login OTP sent to {email} (extracted from Supabase)", flush=True)

    except Exception as e:
        print(f"CRITICAL OTP INITIATION FAILURE: {e}", flush=True)
        # Fallback to custom random OTP if generate_link fails
        otp = str(random.randint(100000, 999999))
        from services.email import send_login_otp # type: ignore
        send_login_otp("Customer", email, otp)
        
        # Store in profile_update_requests as backup
        uid_res = supabase.table("customer_profile").select("customer_id").eq("email", email).execute()
        if uid_res.data:
            supabase.table("profile_update_requests").insert({
                "customer_id": uid_res.data[0]["customer_id"],
                "otp_code": otp,
                "new_data": {"type": "login_fallback"},
                "status": "pending_otp"
            }).execute()

    return {"message": "Security code has been sent to your registered email."}


@router.post("/login-otp/verify")
def verify_login_otp(payload: LoginOTPVerify):
    # Look up email by customer_id (identifier field holds CU123456)
    res = supabase.table("customer_profile").select("email").eq("customer_number", payload.identifier).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    email = res.data[0]["email"]

    try:
        # Standard Supabase Verification (Works because OTP was generated by Supabase)
        session_res = supabase_anon.auth.verify_otp({
            "email": email,
            "token": payload.otp_code,
            "type": "email"
        })
        
        if session_res.session:
            return {
                "status": "success",
                "session": {
                    "access_token": session_res.session.access_token,
                    "refresh_token": session_res.session.refresh_token
                }
            }
            
        # Fallback Check if the custom method was used
        otp_res = supabase.table("profile_update_requests").select("*") \
            .eq("otp_code", payload.otp_code) \
            .eq("status", "pending_otp") \
            .order("created_at", desc=True).limit(1).execute()
        
        if otp_res.data:
             return {"status": "success", "message": "Verified via fallback (limited session)"}

        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    except Exception as e:
        print(f"DEBUG: Login verification error: {e}")
        raise HTTPException(status_code=400, detail="Invalid security code")

@router.post("/staff/create-request")
def request_staff_creation(payload: StaffCreationRequest, user: Dict[str, Any] = Depends(require_role(["md", "admin"]))):
    # Only MD/Admin can create staff. Seed a request.
    otp = str(random.randint(100000, 999999))
    
    # Store in a temporary table or metadata if we had one, 
    # for now we'll use generate_link just like customers or a custom table.
    # Since we need to store Aadhaar too, let's assume a 'staff_creation_requests' table exists.
    try:
        data = payload.dict()
        data["otp_code"] = otp
        supabase.table("staff_creation_requests").insert(data).execute()
        
        # Invite via Supabase Admin (Native Delivery)
        # This ensures the invitation reaches the staff email despite Render's blocks.
        supabase.auth.admin.invite_user_by_email(payload.email)
        
        print(f"DEBUG: Staff invitation sent to {payload.email}. Onboarding OTP is {otp}")
        return {"message": "Onboarding invitation and OTP sent via Supabase Secure Mail"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/staff/verify-and-setup")
def verify_staff_setup(payload: StaffVerifySetup):
    # Verify OTP from staff_creation_requests
    res = supabase.table("staff_creation_requests").select("*").eq("email", payload.email).eq("otp_code", payload.otp_code).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Invalid OTP or email")
    
    req_data = res.data[0]
    
    try:
        # Create real Supabase user
        auth_res = supabase.auth.admin.create_user({
            "email": payload.email,
            "password": payload.new_password,
            "email_confirm": True,
            "user_metadata": {
                "roles": "manager", 
                "full_name": req_data["full_name"],
                "aadhaar": req_data["aadhaar_number"]
            }
        })
        
        # Cleanup request
        supabase.table("staff_creation_requests").delete().eq("email", payload.email).execute()
        
        return {"status": "success", "message": "Staff account created. You can now login with your password."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── In-Person Customer Profile Edit ──

# In-memory OTP store for profile edits: { customer_id: otp_code }
_edit_otps: dict = {}

@router.post("/customer-edit-otp")
def send_customer_edit_otp(payload: dict, user: Dict[str, Any] = Depends(require_role(["manager", "admin"]))):
    """Manager sends OTP to customer's email to verify in-person identity."""
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id required")
    
    res = supabase.table("customer_profile").select("email, full_name").eq("customer_id", customer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = res.data[0]
    otp = str(random.randint(100000, 999999))
    
    # Store OTP in memory (keyed by customer_id)
    _edit_otps[customer_id] = otp
    
    send_email(
        customer["email"],
        "SmartBank — Profile Update Verification",
        f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <div style="background:#1E3A8A;padding:20px 24px">
            <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Profile Update Verification</p>
          </div>
          <div style="padding:24px">
            <p style="color:#0f172a;font-size:15px">Dear {customer['full_name']},</p>
            <p style="color:#475569;font-size:14px">A manager has initiated an in-person profile update request. Your verification OTP is:</p>
            <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0369a1">{otp}</span>
            </div>
            <p style="color:#64748b;font-size:13px">Please provide this OTP to the manager. It expires in 10 minutes.</p>
          </div>
        </div>
        """
    )
    print(f"DEBUG: Profile-edit OTP for customer {customer_id} is {otp}")
    return {"message": "OTP sent to customer's registered email"}
@router.post("/verify-password")
def verify_password(payload: dict, user: Dict[str, Any] = Depends(get_current_user)):
    """Verifies the current user's password without changing the session."""
    password = payload.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Password required")
    
    try:
        # Supabase doesn't have a direct 'check password' without signing in.
        # We try to sign in with the current user's email and provided password.
        supabase_anon.auth.sign_in_with_password({
            "email": user["email"],
            "password": password
        })
        return {"status": "verified"}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid password")

@router.get("/test-connectivity")
def test_connectivity(email: str):
    """Diagnostic endpoint to test email connectivity directly in the browser."""
    try:
        from services.email import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL # type: ignore
    except ImportError:
        try:
            from backend.services.email import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL # type: ignore
        except ImportError:
            from services.email import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL # type: ignore
    results = {
        "diagnostic_step": "init",
        "config": {
            "host": SMTP_HOST,
            "port": SMTP_PORT,
            "user": SMTP_USER,
            "from": FROM_EMAIL,
            "has_password": bool(SMTP_PASSWORD)
        }
    }
    try:
        results["diagnostic_step"] = "attempting_send"
        send_email(
            email,
            "SmartBank — Connectivity Test",
            f"<p>Diagnostic test for {email}. If you see this, connectivity is OK!</p>"
        )
        results["status"] = "success"
        results["message"] = f"Test email successfully sent to {email}"
        return results
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"DIAGNOSTIC FAILURE: {error_msg}", flush=True)
        results["status"] = "error"
        results["error_type"] = type(e).__name__
        results["error_detail"] = str(e)
        results["traceback"] = error_msg
        return results
