from pydantic import BaseModel, Field, EmailStr # type: ignore
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID

# Roles
class UserRole(BaseModel):
    role: str

# Customer Profile
class CustomerProfileBase(BaseModel):
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    pan_card_number: Optional[str] = None
    nationality: Optional[str] = None
    phone_number: Optional[str] = None
    email: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

class CustomerProfileCreate(CustomerProfileBase):
    initial_account_type: Optional[str] = "Savings"

class CustomerCreationVerifyModel(BaseModel):
    request_id: str
    otp_code: str

class LoginOTPRequest(BaseModel):
    customer_id: str # The friendly CU123456 ID

class AccountConfig(BaseModel):
    account_type: str
    min_balance_threshold: float
    transaction_otp_threshold: float
    requires_manager_approval_above: float

class LoginOTPVerify(BaseModel):
    identifier: str
    otp_code: str

class CustomerProfile(CustomerProfileBase):
    customer_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

# Accounts
class AccountBase(BaseModel):
    account_number: str
    account_type: str

class AccountCreate(AccountBase):
    customer_id: UUID
    balance: float = 0.0

class Account(AccountBase):
    account_id: UUID
    customer_id: UUID
    balance: float
    status: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# Transactions
class TransactionBase(BaseModel):
    transaction_type: str
    amount: float
    receiver_account: Optional[str] = None

class TransactionCreate(TransactionBase):
    account_id: UUID

class Transaction(TransactionBase):
    transaction_id: UUID
    account_id: UUID
    balance_after: float
    created_at: datetime
    class Config:
        from_attributes = True

# Complaints
class ComplaintBase(BaseModel):
    title: str
    description: str

class ComplaintCreate(ComplaintBase):
    pass

class Complaint(ComplaintBase):
    complaint_id: UUID
    customer_id: UUID
    status: str
    manager_response: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Enquiries
class EnquiryBase(BaseModel):
    message: str

class EnquiryCreate(EnquiryBase):
    pass

class Enquiry(EnquiryBase):
    enquiry_id: UUID
    customer_id: UUID
    response: Optional[str] = None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

# Workflows
class WorkflowBase(BaseModel):
    name: str
    is_active: bool = True
    input_schema: Optional[Dict[str, Any]] = None

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowStepBase(BaseModel):
    name: str
    step_type: str
    order: int
    metadata: Optional[Dict[str, Any]] = None

class WorkflowRuleBase(BaseModel):
    condition: str
    next_step_id: Optional[UUID] = None
    priority: int = 0

# Staff Onboarding
class StaffCreationRequest(BaseModel):
    full_name: str
    email: EmailStr
    aadhaar_number: str

class StaffVerifySetup(BaseModel):
    email: str
    otp_code: str
    new_password: str
