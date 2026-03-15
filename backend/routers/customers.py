from fastapi import APIRouter, Depends, HTTPException # type: ignore
from typing import List, Dict, Any
from database import supabase # type: ignore
from models.schemas import CustomerProfileCreate, CustomerCreationVerifyModel # type: ignore
import random
import string
from routers.auth import get_current_user # type: ignore

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("/")
def create_customer(profile: CustomerProfileCreate, user: Dict[str, Any] = Depends(get_current_user)):
    # Create customer profile tied to auth user ID
    try:
        # Generate a friendly Customer ID if not provided
        display_id = "CU" + "".join(random.choices(string.digits, k=6))
        
        data = profile.dict()
        data["customer_id"] = user["id"]
        data["customer_number"] = display_id
        res = supabase.table("customer_profile").insert(data).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create-request")
def create_customer_request(profile: CustomerProfileCreate, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    otp = str(random.randint(100000, 999999))
    data = profile.dict()
    if data.get("date_of_birth"):
        data["date_of_birth"] = str(data["date_of_birth"])
    # Explicitly set initial_account_type (ensure it gets the right value)
    data["initial_account_type"] = profile.initial_account_type or "Savings"
    data["otp_code"] = otp
    try:
        res = supabase.table("customer_creation_requests").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Database insertion failed")
        req_id = res.data[0]["request_id"]
        # Email the OTP to the customer
        from services.email import send_email # type: ignore
        send_email(
            profile.email,
            "SmartBank — Customer Account OTP Verification",
            f"<p>Your OTP for account creation verification is: <b style='font-size:20px'>{otp}</b></p><p>This OTP expires in 10 minutes.</p>"
        )
        print(f"DEBUG: OTP for Customer Creation {profile.email} is {otp}")
        return {"message": "OTP sent to customer email", "request_id": req_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-verify")
def create_customer_verify(payload: CustomerCreationVerifyModel, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    req_res = supabase.table("customer_creation_requests").select("*").eq("request_id", payload.request_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
        
    req_data = req_res.data[0]
    if str(req_data["otp_code"]) != payload.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    # Generate random strong password since they will use OTP to login
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits + "!@#$", k=16))
    
    try:
        auth_res = supabase.auth.admin.create_user({
            "email": req_data["email"],
            "password": temp_password,
            "email_confirm": True,
            "user_metadata": {"roles": "customer", "full_name": req_data["full_name"]}
        })
        new_user_id = auth_res.user.id
        # Generate a friendly Customer ID
        display_id = "CU" + "".join(random.choices(string.digits, k=6))
        
        profile_data = {
            "customer_id": new_user_id,
            "customer_number": display_id,
            "full_name": req_data["full_name"],
            "email": req_data["email"],
            "date_of_birth": req_data.get("date_of_birth"),
            "gender": req_data.get("gender"),
            "pan_card_number": req_data.get("pan_card_number"),
            "nationality": req_data.get("nationality"),
            "phone_number": req_data.get("phone_number"),
            "address": req_data.get("address"),
            "city": req_data.get("city"),
            "state": req_data.get("state"),
            "country": req_data.get("country"),
            "postal_code": req_data.get("postal_code")
        }
        res = supabase.table("customer_profile").insert(profile_data).execute()
        
        # Optionally create an initial account automatically
        acc_number = "1000" + str(random.randint(10000, 99999))
        supabase.table("accounts").insert({
            "customer_id": new_user_id,
            "account_number": acc_number,
            "account_type": req_data.get("initial_account_type", "Savings")
        }).execute()
        
        # Delete the request
        supabase.table("customer_creation_requests").delete().eq("request_id", payload.request_id).execute()
        
        # Simulated welcome email
        from services.email import send_email # type: ignore
        welcome_body = f"Welcome to SmartBank! Your Customer ID for login is <b>{display_id}</b>. Use this ID to login via OTP."
        send_email(req_data["email"], "Welcome to SmartBank", welcome_body)
        
        print(f"DEBUG: Customer {req_data['email']} created with ID {display_id}")

        return {"message": "Customer created successfully!", "customer_id": display_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/profile-update-request")
def profile_update_request(new_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    otp = str(random.randint(100000, 999999))
    
    insert_data = {
        "customer_id": user["id"],
        "new_data": new_data,
        "otp_code": otp,
        "status": "pending_otp"
    }
    res = supabase.table("profile_update_requests").insert(insert_data).execute()
    req_id = str(res.data[0]["request_id"])
    
    # Send Email
    try:
        from services.email import send_email # type: ignore
        send_email(
            user["email"],
            "SmartBank — Profile Change OTP Verification",
            f"<p>Dear Customer,</p><p>Your OTP to verify your profile change request is: <b style='font-size:24px'>{otp}</b></p><p>This OTP expires in 10 minutes.</p>"
        )
    except Exception as e:
        print(f"DEBUG: Profile update email failed: {e}")
        
    return {"message": "OTP sent to your registered email", "request_id": req_id}

@router.post("/profile-update-verify")
def profile_update_verify(payload: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    req_id = payload.get("request_id")
    otp_code = payload.get("otp_code")
    
    res = supabase.table("profile_update_requests").select("*").eq("request_id", req_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = res.data[0]
    
    if req["otp_code"] != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    # Mark as pending approval
    supabase.table("profile_update_requests").update({"status": "pending_approval"}).eq("request_id", req_id).execute()
    return {"message": "OTP verified. Your profile change is now pending Manager approval."}

@router.post("/profile-update-approve/{request_id}")
def profile_update_approve(request_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden: Managers only")
        
    res = supabase.table("profile_update_requests").select("*").eq("request_id", request_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = res.data[0]
    
    if req["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Request is not pending approval")
        
    # Apply changes
    supabase.table("customer_profile").update(req["new_data"]).eq("customer_id", req["customer_id"]).execute()
    
    # Mark approved
    supabase.table("profile_update_requests").update({"status": "approved"}).eq("request_id", request_id).execute()
    
    return {"message": "Profile change approved and applied!"}

@router.get("/profile-update-pending")
def list_pending_profile_updates(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = supabase.table("profile_update_requests").select("*, customer_profile(full_name, email)").eq("status", "pending_approval").execute()
    return res.data

@router.get("/me")
def get_my_profile(user: Dict[str, Any] = Depends(get_current_user)):
    res = supabase.table("customer_profile").select("*").eq("customer_id", user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer profile not found")
    return res.data[0]

@router.get("/")
def list_customers(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = supabase.table("customer_profile").select("*").execute()
    return res.data
