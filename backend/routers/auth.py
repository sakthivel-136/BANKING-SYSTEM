from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # type: ignore
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
        return {
            "id": response.user.id,
            "email": response.user.email,
            "user_metadata": response.user.user_metadata,
            "role": response.user.user_metadata.get('roles', 'customer')
        }
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

from models.schemas import LoginOTPRequest, LoginOTPVerify # type: ignore
from services.email import send_email # type: ignore

@router.post("/login-otp/request")
def request_login_otp(payload: LoginOTPRequest):
    # Look up email by Customer ID (CU123456) or accept email directly for staff
    res = supabase.table("customer_profile").select("email").eq("customer_number", payload.customer_id).execute()
    if not res.data:
        if "@" in payload.customer_id:
            email = payload.customer_id
        else:
            raise HTTPException(status_code=404, detail="User not found with this Customer ID")
    else:
        email = res.data[0]["email"]

    try:
        # Use admin generate_link to produce a Supabase-compatible OTP code
        # This does NOT send any email — we send it ourselves via SMTP
        link_res = supabase.auth.admin.generate_link({
            "type": "magiclink",
            "email": email
        })
        otp_code = link_res.properties.email_otp
        print(f"DEBUG: Login OTP for {payload.customer_id} ({email}) is {otp_code}")

        # Send the OTP via our branded SMTP email
        send_email(
            email,
            "SmartBank — Your Login OTP",
            f"""
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
              <div style="background:#1E3A8A;padding:20px 24px">
                <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
                <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Login Verification</p>
              </div>
              <div style="padding:24px">
                <p style="color:#0f172a;font-size:15px">Your SmartBank login OTP is:</p>
                <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
                  <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0369a1">{otp_code}</span>
                </div>
                <p style="color:#64748b;font-size:13px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
              </div>
            </div>
            """
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send OTP: {str(e)}")

    return {"message": "OTP sent to registered email"}


@router.post("/login-otp/verify")
def verify_login_otp(payload: LoginOTPVerify):
    # Look up email by customer_id (identifier field holds CU123456)
    res = supabase.table("customer_profile").select("email").eq("customer_number", payload.identifier).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    email = res.data[0]["email"]

    try:
        # Verify the Supabase-generated OTP code — returns a real session
        session_res = supabase_anon.auth.verify_otp({
            "email": email,
            "token": payload.otp_code,
            "type": "email"
        })
        if not session_res.session:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
        return {
            "status": "success",
            "session": {
                "access_token": session_res.session.access_token,
                "refresh_token": session_res.session.refresh_token
            }
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
from models.schemas import LoginOTPRequest, LoginOTPVerify, StaffCreationRequest, StaffVerifySetup # type: ignore

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
        
        # Send Email
        send_email(
            payload.email,
            "SmartBank — Staff Onboarding OTP",
            f"<p>Hello {payload.full_name},</p><p>You have been invited as a Manager. Your onboarding OTP is: <b style='font-size:24px'>{otp}</b></p><p>Use this to set your password on the login page.</p>"
        )
        print(f"DEBUG: Staff OTP for {payload.email} is {otp}")
        return {"message": "Onboarding OTP sent to staff email"}
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
