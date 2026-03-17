from fastapi import APIRouter, Depends, HTTPException # type: ignore
from typing import Dict, Any, List
from pydantic import BaseModel # type: ignore
from database import supabase, supabase_anon # type: ignore
from models.schemas import TransactionCreate # type: ignore
from routers.auth import get_current_user # type: ignore
from services.banking import execute_transaction, get_account_config # type: ignore

router = APIRouter(prefix="/transactions", tags=["transactions"])

import random
from services.email import send_transfer_confirmation # type: ignore

class TransferRequestModel(BaseModel):
    account_id: str
    receiver_account: str
    amount: float

class OTPVerifyModel(BaseModel):
    request_id: str
    otp_code: str

class OperationRequestModel(BaseModel):
    account_id: str
    amount: float

@router.post("/operation-request")
def request_operation(op_type: str, req: OperationRequestModel, user: Dict[str, Any] = Depends(get_current_user)):
    if op_type not in ["deposit", "withdraw"]:
         raise HTTPException(status_code=400, detail="Invalid operation type")
         
    # Validate account
    acc_res = supabase.table("accounts").select("*, customer_profile:customer_id(email, full_name)").eq("account_id", req.account_id).execute()
    if not acc_res.data:
        raise HTTPException(status_code=404, detail="Account not found")
    acc = acc_res.data[0]
    
    # Ownership check
    if acc["customer_id"] != user["id"]:
         raise HTTPException(status_code=403, detail="Not authorized")

    # Status check for withdrawal
    if op_type == "withdraw" and acc["status"] != "active":
         raise HTTPException(status_code=403, detail=f"Account is {acc['status']}. Withdrawal not allowed.")

    # Trigger Supabase Native OTP delivery
    try:
        prof = acc["customer_profile"]
        email = prof["email"]
        
        # This sends the OTP via Supabase's SMTP bridge (Gmail)
        supabase.auth.sign_in_with_otp({"email": email})
        
        # Insert Request (no otp_code stored, Supabase manages it)
        insert_data = {
            "account_id": req.account_id,
            "operation_type": op_type,
            "amount": req.amount,
            "status": "pending_otp"
        }
        res = supabase.table("account_operation_requests").insert(insert_data).execute()
        req_id = str(res.data[0]["request_id"])
        
        print(f"DEBUG: {op_type.capitalize()} OTP triggered via Supabase for {email}", flush=True)
        return {"message": "OTP has been sent to your registered email via Supabase Secure Mail.", "request_id": req_id}
        
    except Exception as e:
        print(f"CRITICAL: Failed to trigger Supabase OTP: {e}", flush=True)
        raise HTTPException(status_code=400, detail="Failed to send security code. Please try again.")

@router.post("/operation-verify")
def verify_operation(req: OTPVerifyModel, user: Dict[str, Any] = Depends(get_current_user)):
    t_res = supabase.table("account_operation_requests").select("*").eq("request_id", req.request_id).execute()
    if not t_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    op_req = t_res.data[0]
    
    if op_req["status"] != "pending_otp":
        raise HTTPException(status_code=400, detail="Request is not pending OTP")
        
    # Verify the Supabase-generated OTP code
    try:
        # We need the user's email to verify the OTP with Supabase
        acc_res = supabase.table("accounts").select("customer_profile:customer_id(email)").eq("account_id", op_req["account_id"]).execute()
        email = acc_res.data[0]["customer_profile"]["email"]
        
        auth_res = supabase_anon.auth.verify_otp({
            "email": email,
            "token": req.otp_code,
            "type": "email"
        })
        
        if not auth_res.session:
             raise HTTPException(status_code=400, detail="Invalid or expired security code")
             
    except Exception as auth_err:
        print(f"DEBUG: Supabase verification failed: {auth_err}", flush=True)
        raise HTTPException(status_code=400, detail="Invalid security code")
        
    # Execute transaction
    txn_data = TransactionCreate(
       account_id=op_req["account_id"],
       transaction_type=op_req["operation_type"],
       amount=float(op_req["amount"])
    )
    
    try:
        result = execute_transaction(txn_data)
        supabase.table("account_operation_requests").update({"status": "approved"}).eq("request_id", req.request_id).execute()
        return {"message": f"{op_req['operation_type'].capitalize()} successful!", "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/transfer-request")
def request_transfer(req: TransferRequestModel, user: Dict[str, Any] = Depends(get_current_user)):
    # Validate account ownership
    acc_res = supabase.table("accounts").select("*, customer_profile:customer_id(email)").eq("account_id", req.account_id).execute()
    if not acc_res.data:
        raise HTTPException(status_code=404, detail="Account not found")
    acc = acc_res.data[0]
    if acc["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to act on this account")

    # Block transactions on frozen or blocked accounts
    acc_status = acc.get("status", "active")
    if acc_status == "frozen":
        raise HTTPException(status_code=403, detail="Account is frozen. Transfers are not allowed. Contact your branch to unfreeze.")
    if acc_status == "closed":
        raise HTTPException(status_code=403, detail="Account is blocked. Transfers are not allowed. Contact your branch.")

    # Trigger Supabase Native OTP
    try:
        # Get email
        email = acc["customer_profile"]["email"]
        supabase.auth.sign_in_with_otp({"email": email})
        
        # Insert Request
        insert_data = {
            "account_id": req.account_id,
            "receiver_account": req.receiver_account,
            "amount": req.amount,
            "status": "pending_otp"
        }
        res = supabase.table("transfer_requests").insert(insert_data).execute()
        req_id = str(res.data[0]["request_id"])
        
        print(f"DEBUG: Transfer OTP triggered via Supabase for {email}", flush=True)
        return {"message": "Security code sent via Supabase Secure Mail.", "request_id": req_id}
        
    except Exception as e:
        print(f"CRITICAL: Failed to trigger Supabase Transfer OTP: {e}", flush=True)
        raise HTTPException(status_code=400, detail="Failed to send security code.")

@router.post("/transfer-verify")
def verify_transfer(req: OTPVerifyModel, user: Dict[str, Any] = Depends(get_current_user)):
    t_res = supabase.table("transfer_requests").select("*").eq("request_id", req.request_id).execute()
    if not t_res.data:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    t_req = t_res.data[0]
    
    if t_req["status"] != "pending_otp":
        raise HTTPException(status_code=400, detail="Transfer is not pending OTP")
        
    # Verify Supabase OTP
    try:
        # Get email
        acc_res = supabase.table("accounts").select("customer_profile:customer_id(email)").eq("account_id", t_req["account_id"]).execute()
        email = acc_res.data[0]["customer_profile"]["email"]
        
        auth_res = supabase_anon.auth.verify_otp({
            "email": email,
            "token": req.otp_code,
            "type": "email"
        })
        
        if not auth_res.session:
            raise HTTPException(status_code=400, detail="Invalid security code")
            
    except Exception as auth_err:
        print(f"DEBUG: Supabase Transfer OTP Fail: {auth_err}", flush=True)
        raise HTTPException(status_code=400, detail="Invalid or expired security code")
        
    amount = float(t_req["amount"])
    
    # Fetch dynamic threshold for approval
    acc_res = supabase.table("accounts").select("account_type").eq("account_id", t_req["account_id"]).execute()
    config = get_account_config(acc_res.data[0]["account_type"]) if acc_res.data else {}
    approval_threshold = float(config.get("requires_manager_approval_above", 10000))

    if amount > approval_threshold:
        # Requires manager approval
        supabase.table("transfer_requests").update({"status": "pending_approval"}).eq("request_id", req.request_id).execute()
        return {"message": f"OTP verified. Amount exceeds ₹{approval_threshold}, requiring Manager approval.", "status": "pending_approval"}
    else:
        # Execute immediately
        txn_data = TransactionCreate(
           account_id=t_req["account_id"],
           transaction_type="transfer",
           amount=amount,
           receiver_account=t_req["receiver_account"]
        )
        try:
            result = execute_transaction(txn_data)
            supabase.table("transfer_requests").update({"status": "approved"}).eq("request_id", req.request_id).execute()
            
            # Send success email
            prof_res = supabase.table("accounts").select("customer_profile:customer_id(email, full_name)").eq("account_id", t_req["account_id"]).execute()
            if prof_res.data:
                prof = prof_res.data[0]["customer_profile"]
                send_transfer_confirmation(prof["full_name"], prof["email"], amount, t_req["receiver_account"], result["new_balance"])
                
            return {"message": "Transfer successful!", "status": "approved", "result": result}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

@router.post("/transfer-approve/{request_id}")
def approve_transfer(request_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden: Managers only")
        
    t_res = supabase.table("transfer_requests").select("*").eq("request_id", request_id).execute()
    if not t_res.data:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    t_req = t_res.data[0]
    
    if t_req["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Transfer is not pending approval")
        
    txn_data = TransactionCreate(
       account_id=t_req["account_id"],
       transaction_type="transfer",
       amount=float(t_req["amount"]),
       receiver_account=t_req["receiver_account"]
    )
    
    try:
        result = execute_transaction(txn_data)
        supabase.table("transfer_requests").update({"status": "approved"}).eq("request_id", request_id).execute()
        
        # Send success email
        prof_res = supabase.table("accounts").select("customer_profile:customer_id(email, full_name)").eq("account_id", t_req["account_id"]).execute()
        if prof_res.data:
            prof = prof_res.data[0]["customer_profile"]
            send_transfer_confirmation(prof["full_name"], prof["email"], float(t_req["amount"]), t_req["receiver_account"], result["new_balance"])
            
        return {"message": "Transfer approved and executed!", "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pending-transfers")
def get_pending_transfers(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = supabase.table("transfer_requests").select("*, accounts(account_number)").eq("status", "pending_approval").order("created_at").execute()
    return res.data

@router.post("/")
def perform_transaction(txn: TransactionCreate, user: Dict[str, Any] = Depends(get_current_user)):
    # Fallback for old tests, but UI should use new OTP routes for transfers
    if txn.transaction_type in ['withdraw', 'transfer']:
        acc_res = supabase.table("accounts").select("*").eq("account_id", str(txn.account_id)).execute()
        if not acc_res.data:
            raise HTTPException(status_code=404, detail="Account not found")
        acc = acc_res.data[0]
        if acc["customer_id"] != user["id"] and user.get("role") not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Not authorized to act on this account")
            
    try:
        result = execute_transaction(txn)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{account_id}")
def get_transactions(account_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    res = supabase.table("transactions").select("*").eq("account_id", account_id).order("created_at", desc=True).execute()
    return res.data
