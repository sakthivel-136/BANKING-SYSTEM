from database import supabase # type: ignore
from models.schemas import TransactionCreate # type: ignore
from workflow_engine.engine import trigger_workflow # type: ignore
from typing import Dict, Any, Optional
from datetime import datetime, timezone

# ─────────────────────────────────────────────
# Constants (only values NOT in account_configs)
# ─────────────────────────────────────────────
TRANSACTION_LIMIT_PER_DAY = 5       # combined (deposit + withdraw) free per day
TRANSACTION_LIMIT_CHARGE_PCT = 2    # 2% charge from 6th txn onwards (Dp or Wd)
TRANSFER_CHARGE_PCT = 1             # 1% charge on ALL transfers
BANK_CHARGES_ACCOUNT_NUMBER = "BANK-CHARGES-0001"  # central charges collector

# Monthly minimum balance fine per account type (applied on 10th of each month)
MIN_BALANCE_FINES: Dict[str, float] = {
    "savings":    200.0,
    "current":    1000.0,
    "investment": 10000.0,
}

NOTIFICATION_CHARGE: float = 50.0   # ₹50 notification charge per account on 10th
PROFILE_EDIT_CHARGE: float = 75.0   # ₹75 whenever a customer submits a profile change


def _mask_acc(acc: Any) -> str:
    s = str(acc)
    n = len(s)
    if n <= 4:
        return s
    # Using individual indexing to appease a very strict linter
    return s[n-4] + s[n-3] + s[n-2] + s[n-1]

def get_account_config(account_type: str) -> Dict[str, Any]:
    """Fetch thresholds and charge amounts from account_configs table."""
    try:
        res = supabase.table("account_configs").select("*").eq("account_type", account_type.capitalize()).execute()
    except Exception as e:
        print(f"DEBUG: Failed to fetch account_configs: {e}")
        res = None
    
    # Defaults based on constants
    config = {
        "min_balance_threshold": 1000.0,
        "transaction_otp_threshold": 10000.0,
        "requires_manager_approval_above": 50000.0,
        "min_balance_fine": 0.0,
        "notification_charge": NOTIFICATION_CHARGE,
        # Default download charges for statements/reports (₹2.50)
        "statement_download_charge": 2.50,
        "report_download_charge": 2.50,
    }
    
    # Override defaults for specific types
    ltype = account_type.lower()
    if ltype == "savings":
        config["min_balance_threshold"] = 1000.0
        config["min_balance_fine"] = MIN_BALANCE_FINES.get("savings", 200.0)
    elif ltype == "current":
        config["min_balance_threshold"] = 5000.0
        config["min_balance_fine"] = MIN_BALANCE_FINES.get("current", 1000.0)
    elif ltype == "investment":
        config["min_balance_threshold"] = 100000.0
        config["min_balance_fine"] = MIN_BALANCE_FINES.get("investment", 10000.0)

    if res and res.data:
        db_cfg = res.data[0]
        # Map DB columns if they exist
        for key in config.keys():
            if key in db_cfg and db_cfg[key] is not None:
                config[key] = float(db_cfg[key])
    
    return config


def _get_or_create_bank_charges_account() -> str:
    """Return the account_id of the BANK-CHARGES central account. Create if not exists."""
    res = supabase.table("accounts").select("account_id").eq("account_number", BANK_CHARGES_ACCOUNT_NUMBER).execute()
    if res.data:
        return str(res.data[0]["account_id"])
    # Create it — no customer_id needed; use a known internal UUID approach
    new_acc = supabase.table("accounts").insert({
        "account_number": BANK_CHARGES_ACCOUNT_NUMBER,
        "account_type": "Internal",
        "balance": 0,
        "status": "active"
    }).execute()
    if new_acc.data:
        return str(new_acc.data[0]["account_id"])
    raise ValueError("Failed to create BANK-CHARGES account")


def _count_today_combined_txns(account_id: str) -> int:
    """Count how many (deposit + withdraw) transactions were done today for this account."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    res = supabase.table("transactions") \
        .select("transaction_id") \
        .eq("account_id", account_id) \
        .in_("transaction_type", ["deposit", "withdraw"]) \
        .gte("created_at", today_start) \
        .execute()
    return len(res.data) if res.data else 0


def apply_charge(account_id: str, account_number: str, charge_amount: float, reason: str) -> float:
    """
    Deduct charge_amount from the customer's account.
    Credit it to the BANK-CHARGES central account.
    Returns the new balance after charge.
    """
    # Deduct from customer
    acc_res = supabase.table("accounts").select("balance").eq("account_id", account_id).execute()
    current = float(acc_res.data[0]["balance"])
    new_bal = max(current - charge_amount, 0)
    supabase.table("accounts").update({"balance": new_bal}).eq("account_id", account_id).execute()

    # Record charge transaction for customer
    try:
        supabase.table("transactions").insert({
            "account_id": account_id,
            "transaction_type": "charge",
            "amount": charge_amount,
            "balance_after": new_bal,
            "receiver_account": BANK_CHARGES_ACCOUNT_NUMBER,
            "description": reason
        }).execute()
    except Exception as e:
        print(f"DEBUG: Customer charge txn log failed: {e}")
        # Fallback to 'withdraw' if 'charge' enum is not yet applied/ready
        supabase.table("transactions").insert({
            "account_id": account_id,
            "transaction_type": "withdraw",
            "amount": charge_amount,
            "balance_after": new_bal,
            "receiver_account": BANK_CHARGES_ACCOUNT_NUMBER,
            "description": reason
        }).execute()

    # Credit BANK-CHARGES account
    try:
        charges_acc_id = _get_or_create_bank_charges_account()
        chg_res = supabase.table("accounts").select("balance").eq("account_id", charges_acc_id).execute()
        chg_bal = float(chg_res.data[0]["balance"]) + charge_amount
        supabase.table("accounts").update({"balance": chg_bal}).eq("account_id", charges_acc_id).execute()
        supabase.table("transactions").insert({
            "account_id": charges_acc_id,
            "transaction_type": "deposit",
            "amount": charge_amount,
            "balance_after": chg_bal,
            "receiver_account": account_number
        }).execute()
    except Exception as e:
        print(f"DEBUG: BANK-CHARGES credit failed: {e}")

    return new_bal


def _create_low_balance_alert(account_id: str, balance: float, threshold: float):
    """Insert a low-balance alert record for the manager portal."""
    try:
        supabase.table("low_balance_alerts").insert({
            "account_id": account_id,
            "balance": balance,
            "threshold": threshold,
            "status": "open"
        }).execute()
    except Exception as e:
        # Table might not exist yet — log but don't crash
        print(f"DEBUG: low_balance_alerts insert failed: {e}")

def _resolve_low_balance_alerts(account_id: str, balance: float, threshold: float):
    """Resolve active low-balance alerts if the balance is back above threshold."""
    if balance >= threshold:
        try:
            supabase.table("low_balance_alerts").update({
                "status": "resolved",
                "resolved_at": datetime.now(timezone.utc).isoformat()
            }).eq("account_id", account_id).in_("status", ["open", "escalated"]).execute()
        except Exception as e:
            print(f"DEBUG: low_balance_alerts resolve failed: {e}")

def execute_transaction(txn: TransactionCreate):
    account_id = str(txn.account_id)
    amount = txn.amount
    txn_type = txn.transaction_type

    # 1. Fetch sender account with customer profile
    acc_res = supabase.table("accounts").select(
        "*, customer_profile:customer_id(email, full_name)"
    ).eq("account_id", account_id).execute()
    if not acc_res.data:
        raise ValueError("Account not found")
    acc = acc_res.data[0]

    if acc["status"] in ["frozen", "blocked"]:
        raise ValueError("Account is frozen/blocked. Cannot transact.")

    current_balance = float(acc["balance"])
    account_number = acc["account_number"]
    profile = acc.get("customer_profile") or {}
    customer_name = profile.get("full_name", "Customer")
    customer_email = profile.get("email")

    # ── DEPOSIT ──────────────────────────────────────────────────────────
    if txn_type == "deposit":
        # Check combined daily limit (5 free total Wd+Dp) -> 2% charge on 6th+
        combined_count = _count_today_combined_txns(account_id)
        charge = 0.0
        reason = ""

        if combined_count >= TRANSACTION_LIMIT_PER_DAY:
            charge = round(amount * TRANSACTION_LIMIT_CHARGE_PCT / 100, 2)
            reason = f"Overload charge (>{TRANSACTION_LIMIT_PER_DAY} txns today)"
        
        if charge > 0:
            charge_bal = apply_charge(account_id, account_number, charge, reason)
            current_balance = charge_bal
            if customer_email:
                try:
                    from services.email import send_charge_notice # type: ignore
                    send_charge_notice(customer_name, customer_email, account_number, charge, reason, charge_bal)
                except Exception as e:
                    print(f"DEBUG: charge email failed: {e}")

        new_balance = current_balance + amount
        supabase.table("accounts").update({"balance": new_balance}).eq("account_id", account_id).execute()
        
        # Automatic resolution check
        config = get_account_config(acc["account_type"])
        threshold = float(config["min_balance_threshold"])
        _resolve_low_balance_alerts(account_id, new_balance, threshold)

        supabase.table("transactions").insert(txn_record).execute()

        # Email customer about deposit
        if customer_email:
            try:
                from services.email import send_email # type: ignore
                send_email(
                    customer_email,
                    "💰 Deposit Received — SmartBank",
                    f"<p>Dear {customer_name},</p><p>A deposit of <b>₹{amount:,.2f}</b> has been credited to your account ending in <b>••••{_mask_acc(account_number)}</b>.</p><p>Your updated balance is <b>₹{new_balance:,.2f}</b>.</p>"
                )
            except: pass
        
        return {"status": "success", "new_balance": new_balance}

    # ── WITHDRAW ─────────────────────────────────────────────────────────
    elif txn_type == "withdraw":
        if current_balance < amount:
            raise ValueError("Insufficient funds")

        # Check combined daily limit (5 free total Wd+Dp) -> 2% charge on 6th+
        combined_count = _count_today_combined_txns(account_id)
        if combined_count >= TRANSACTION_LIMIT_PER_DAY:
            charge = round(amount * TRANSACTION_LIMIT_CHARGE_PCT / 100, 2)
            reason = f"Overload charge (>{TRANSACTION_LIMIT_PER_DAY} txns today)"
            if current_balance < amount + charge:
                charge = max(current_balance - amount, 0)
            charge_bal = apply_charge(account_id, account_number, charge, reason)
            current_balance = charge_bal
            if customer_email:
                try:
                    from services.email import send_charge_notice # type: ignore
                    send_charge_notice(customer_name, customer_email, account_number, charge, reason, charge_bal)
                except Exception as e:
                    print(f"DEBUG: charge email failed: {e}")

        new_balance = current_balance - amount
        supabase.table("accounts").update({"balance": new_balance}).eq("account_id", account_id).execute()

        txn_record = txn.dict()
        txn_record["account_id"] = str(txn_record["account_id"])
        txn_record["balance_after"] = new_balance
        supabase.table("transactions").insert(txn_record).execute()

        # Email customer about withdrawal
        if customer_email:
            try:
                from services.email import send_withdrawal_confirmation # type: ignore
                send_withdrawal_confirmation(customer_name, customer_email, account_number, amount, new_balance)
            except: pass
        
        # Low balance check
        config = get_account_config(acc["account_type"])
        threshold = float(config["min_balance_threshold"])
        if new_balance < threshold:
            # DB alert for manager
            _create_low_balance_alert(account_id, new_balance, threshold)

            # Workflow trigger
            trigger_workflow("LOW_BALANCE_MONITORING", {
                "account_id": account_id, "balance": new_balance, "threshold": threshold
            })

            # Email customer (low balance warning already embedded in withdrawal email above
            # but send a dedicated one too for clarity)
            if customer_email:
                try:
                    from services.email import send_low_balance_alert # type: ignore
                    send_low_balance_alert(customer_name, customer_email, account_number, new_balance, threshold)
                except Exception as e:
                    print(f"DEBUG: low balance email failed: {e}")

        # OTP threshold check
        otp_threshold = float(config["transaction_otp_threshold"])
        if amount > otp_threshold:
            trigger_workflow("TRANSACTION_OTP_REQUIRED", {"account_id": account_id, "amount": amount, "threshold": otp_threshold})

        return {"status": "success", "new_balance": new_balance}

    # ── TRANSFER ──────────────────────────────────────────────────────────
    elif txn_type == "transfer":
        if current_balance < amount:
            raise ValueError("Insufficient funds")
        if not txn.receiver_account:
            raise ValueError("Receiver account is required for transfer")

        # Fetch receiver
        recv_res = supabase.table("accounts").select("*").eq("account_number", txn.receiver_account).execute()
        if not recv_res.data:
            raise ValueError("Receiver account not found")
        recv_acc = recv_res.data[0]

        if recv_acc["status"] in ["frozen", "blocked"]:
            raise ValueError("Receiver account is frozen/blocked")

        # 1% Charge on ALL transfers (as per new rule)
        charge = round(amount * TRANSFER_CHARGE_PCT / 100, 2)
        if current_balance < amount + charge:
            raise ValueError(f"Insufficient funds including 1% transfer fee of ₹{charge:,.2f}")
        
        charge_bal = apply_charge(account_id, account_number, charge, "Transfer service charge (1%)")
        current_balance = charge_bal
        if customer_email:
            try:
                from services.email import send_charge_notice # type: ignore
                send_charge_notice(customer_name, customer_email, account_number, charge, "Transfer service charge (1%)", charge_bal)
            except Exception as e:
                print(f"DEBUG: charge email failed: {e}")

        # Update sender
        sender_new_balance = current_balance - amount
        supabase.table("accounts").update({"balance": sender_new_balance}).eq("account_id", account_id).execute()

        # Update receiver
        recv_new_balance = float(recv_acc["balance"]) + amount
        supabase.table("accounts").update({"balance": recv_new_balance}).eq("account_id", recv_acc["account_id"]).execute()

        # Automatic resolution check for receiver
        recv_config = get_account_config(recv_acc["account_type"])
        recv_threshold = float(recv_config["min_balance_threshold"])
        _resolve_low_balance_alerts(str(recv_acc["account_id"]), recv_new_balance, recv_threshold)

        # Txn for Sender
        sender_txn = txn.dict()
        sender_txn["account_id"] = str(sender_txn["account_id"])
        sender_txn["balance_after"] = sender_new_balance
        supabase.table("transactions").insert(sender_txn).execute()

        # Txn for Receiver
        recv_txn = {
            "account_id": str(recv_acc["account_id"]),
            "transaction_type": "deposit",
            "amount": amount,
            "receiver_account": acc["account_number"],
            "balance_after": recv_new_balance
        }
        supabase.table("transactions").insert(recv_txn).execute()

        # Email Receiver
        recv_profile = recv_acc.get("customer_profile") or {}
        recv_email = recv_profile.get("email")
        if recv_email:
            try:
                from services.email import send_email # type: ignore
                send_email(
                    recv_email,
                    "💰 You've Received a Deposit — SmartBank",
                    f"<p>Dear {recv_profile.get('full_name', 'Customer')},</p><p>You have received a deposit of <b>₹{amount:,.2f}</b> from account <b>{acc['account_number']}</b>.</p><p>Your new balance is <b>₹{recv_new_balance:,.2f}</b>.</p>"
                )
            except: pass

        # Email Sender
        if customer_email:
            try:
                from services.email import send_transfer_confirmation # type: ignore
                send_transfer_confirmation(customer_name, customer_email, amount, txn.receiver_account, sender_new_balance)
            except: pass

        # Large transaction workflow trigger
        config = get_account_config(acc["account_type"])
        approval_threshold = float(config["requires_manager_approval_above"])
        if amount > approval_threshold:
            trigger_workflow("LARGE_TRANSACTION_DETECTION", {
                "sender_id": account_id, "amount": amount,
                "receiver": txn.receiver_account, "threshold": approval_threshold
            })

        otp_threshold = float(config["transaction_otp_threshold"])
        if amount > otp_threshold:
            trigger_workflow("TRANSACTION_OTP_REQUIRED", {"account_id": account_id, "amount": amount, "threshold": otp_threshold})

        return {"status": "success", "new_balance": sender_new_balance}

    else:
        raise ValueError("Invalid transaction type")


# ── Monthly Charges (10th of each month) ────────────────────────────────

def apply_monthly_charges(manager_id: Optional[str] = None, dry_run: bool = False) -> dict:
    """
    Apply two types of charges to every active account:
      1. Minimum balance fine  — only if balance < account-type threshold
      2. Notification charge   — ₹50 flat on ALL active accounts

    Charges are credited to the BANK-CHARGES-0001 central account.
    Emails are sent to affected customers.

    Args:
        dry_run: If True, compute and return what *would* be charged without
                 actually modifying any balances (useful for previewing).

    Returns:
        A summary dict with accounts processed, fines applied, notification charges applied.
    """
    from services.email import (  # type: ignore
        send_min_balance_fine_notice,
        send_monthly_notification_charge_notice,
        send_charge_notice,
    )
    from datetime import datetime

    # Pre-check: Don't run twice in the same month unless specialized
    if not dry_run:
        now = datetime.now()
        existing = supabase.table("monthly_charge_logs").select("*").eq("month", now.month).eq("year", now.year).execute()
        if existing.data:
            raise ValueError(f"Monthly charges already applied for {now.strftime('%B %Y')}")

    batch_id = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Fetch all active accounts with customer profile
    acc_res = supabase.table("accounts").select(
        "account_id, account_number, account_type, balance, customer_profile:customer_id(email, full_name)"
    ).eq("status", "active").execute()
    # NEVER charge INTERNAL accounts (e.g. BANK-CHARGES-0001) — they are bank-owned
    accounts = [
        a for a in (acc_res.data or [])
        if str(a.get("account_type", "")).lower() != "internal"
    ]

    total_fine_collected     = 0.0
    total_notif_collected    = 0.0
    fines_applied            = 0
    notif_applied            = 0

    print(f"DEBUG: Starting apply_monthly_charges (dry_run={dry_run}) for {len(accounts)} customer accounts (INTERNAL excluded)")
    for i, acc in enumerate(accounts):
        if i % 5 == 0:
            print(f"DEBUG: Processing account {i+1}/{len(accounts)}")
        account_id     = str(acc["account_id"])
        account_number = acc["account_number"]
        account_type   = (acc.get("account_type") or "savings").lower()
        balance        = float(acc.get("balance") or 0)
        profile        = acc.get("customer_profile") or {}
        email          = profile.get("email")
        name           = profile.get("full_name", "Customer")

        # Get type-specific configs (DB-driven)
        config = get_account_config(account_type)
        threshold = float(config["min_balance_threshold"])
        fine_amount = float(config["min_balance_fine"])
        notification_charge_amount = float(config["notification_charge"])

        # ── 1. Minimum balance fine ──────────────────────────────────────
        if balance < threshold:
            if not dry_run:
                new_bal = apply_charge(
                    account_id, account_number,
                    fine_amount,
                    f"Min balance fine ({account_type.capitalize()} < ₹{threshold:,.0f}) [{batch_id}]"
                )
                if email:
                    try:
                        send_min_balance_fine_notice(
                            name, email, account_number, fine_amount, new_bal, account_type
                        )
                    except Exception as e:
                        print(f"DEBUG: min balance fine email failed: {e}")
                balance = new_bal   # update local balance for notification charge deduction
            total_fine_collected += fine_amount
            fines_applied += 1

        # ── 2. Notification charge (dynamic) ───────────────────────────
        if not dry_run:
            new_bal = apply_charge(
                account_id, account_number,
                notification_charge_amount,
                f"Monthly notification charge [{batch_id}]"
            )
            if email:
                try:
                    send_monthly_notification_charge_notice(
                        name, email, account_number, new_bal
                    )
                except Exception as e:
                    print(f"DEBUG: notification charge email failed: {e}")
        total_notif_collected += notification_charge_amount
        notif_applied += 1

    result = {
        "accounts_processed":       len(accounts),
        "fines_applied":            fines_applied,
        "notification_charges":     notif_applied,
        "total_fines_collected":    total_fine_collected,
        "total_notif_collected":    total_notif_collected,
        "grand_total_collected":    float(total_fine_collected) + float(total_notif_collected),
        "dry_run":                  dry_run,
    }

    # FINAL STEP: Ensure a log entry exists for this month to block duplicates and enable reversals
    if not dry_run:
        now = datetime.now()
        try:
            log_data = {
                "manager_id": manager_id,
                "accounts_processed": len(accounts),
                "total_fines_collected": total_fine_collected,
                "total_notif_collected": total_notif_collected,
                "month": now.month,
                "year": now.year
            }
            supabase.table("monthly_charge_logs").insert(log_data).execute()
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to log monthly charges: {e}")
            # If it already exists, that's actually "fine" for blocking logic,
            # but we want to make sure it was at least attempted.

    print(f"✅ apply_monthly_charges complete: {result}")
    return result

    print(f"✅ apply_monthly_charges complete: {result}")
    return result


def reverse_last_monthly_batch() -> int:
    """
    Identifies and reverses all monthly charges (fines + notification charges) 
    for the current month.
    """
    from datetime import datetime
    now = datetime.now()
    
    # 1. Fetch the log entry for this month
    log_res = supabase.table("monthly_charge_logs").select("*").eq("month", now.month).eq("year", now.year).execute()
    if not log_res.data:
        raise ValueError(f"No monthly charges found for {now.strftime('%B %Y')} to reverse.")
    
    # 2. Find all transactions that look like monthly charges for this month
    # We use ILIKE on description to find them.
    txns_res = supabase.table("transactions").select("*") \
        .ilike("description", "%Monthly notification charge%") \
        .execute()
    
    # Also find min balance fines
    fines_res = supabase.table("transactions").select("*") \
        .ilike("description", "%Min balance fine%") \
        .execute()
        
    all_txns = (txns_res.data or []) + (fines_res.data or [])
    
    # Filter for current month/year (approximate by created_at)
    count: int = 0
    for txn in all_txns:
        created_at = datetime.fromisoformat(txn["created_at"].replace("Z", "+00:00"))
        if created_at.month == now.month and created_at.year == now.year:
            # Reverse this transaction
            account_id = txn["account_id"]
            amount = float(txn["amount"])
            
            # 1. Credit back customer
            acc_res = supabase.table("accounts").select("balance, account_number").eq("account_id", account_id).execute()
            if acc_res.data:
                acc = acc_res.data[0]
                new_bal = float(acc["balance"]) + amount
                supabase.table("accounts").update({"balance": new_bal}).eq("account_id", account_id).execute()
                
                # 2. Debit BANK-CHARGES account
                charges_acc_id = _get_or_create_bank_charges_account()
                chg_res = supabase.table("accounts").select("balance").eq("account_id", charges_acc_id).execute()
                chg_bal = float(chg_res.data[0]["balance"]) - amount
                supabase.table("accounts").update({"balance": chg_bal}).eq("account_id", charges_acc_id).execute()
                
                # 3. Log reversal transaction
                supabase.table("transactions").insert({
                    "account_id": account_id,
                    "transaction_type": "deposit",
                    "amount": amount,
                    "balance_after": new_bal,
                    "description": f"REVERSAL: {txn['description']}"
                }).execute()
                
                # 4. Delete the original transaction to 'undo' it (or keep for audit, let's keep and just mark reversed if possible, but user said 'clear error')
                # Actually, deleting might be cleaner if they want it truly 'gone', but standard banking keeps all.
                # Let's keep for audit but the balance is now corrected.
                
                # 4. Email customer about reversal
                email_res = supabase.table("accounts").select("customer_profile:customer_id(email, full_name)").eq("account_id", account_id).execute()
                if email_res.data:
                    prof = email_res.data[0]["customer_profile"]
                    if prof and prof.get("email"):
                        try:
                            from services.email import send_email # type: ignore
                            send_email(
                                prof["email"],
                                "🔄 Monthly Charge Reversed — SmartBank",
                                f"<p>Dear {prof['full_name']},</p><p>The monthly bank charge of <b>₹{amount:,.2f}</b> for this month has been reversed and credited back to your account.</p><p>Your updated balance is <b>₹{new_bal:,.2f}</b>.</p>"
                            )
                        except: pass
                
                count += 1
                
    # 3. Delete the log entry so it can be run again
    # Use eq filters instead of direct log_id just in case
    supabase.table("monthly_charge_logs").delete().eq("month", now.month).eq("year", now.year).execute()
    
    return count
