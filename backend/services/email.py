import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Any
import os
from dotenv import load_dotenv # type: ignore

load_dotenv()

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", 587))
SMTP_USER     = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_NAME     = os.getenv("EMAIL_FROM_NAME", "SmartBank Notifications")
FROM_EMAIL    = os.getenv("EMAIL_FROM")


def _mask_account(acc: Any) -> str:
    """Helper to mask account number safely for the type checker."""
    if not acc:
        return "N/A"
    s = str(acc)
    # Manual index-based retrieval to bypass slicing errors in picky type checkers
    n = len(s)
    if n <= 4:
        return s
    return s[n-4] + s[n-3] + s[n-2] + s[n-1]


def send_email(to: str, subject: str, html_body: str, plain_body: Optional[str] = None):
    """
    Core email sender. Called by the workflow engine and banking service.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"]      = to

    if plain_body:
        msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(str(SMTP_USER), str(SMTP_PASSWORD))
        server.sendmail(str(FROM_EMAIL), to, msg.as_string())


# ── Specific notification functions ──────────────────────────────────

def send_low_balance_alert(customer_name: str, to_email: str, account_number: str, balance: float):
    subject = "⚠️ Low Balance Alert — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Account Notification</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#78350f;font-weight:600">⚠️ Low Balance Warning</p>
          <p style="margin:6px 0 0;color:#78350f;font-size:13px">
            Your account ending <b>••••{_mask_account(account_number)}</b> has a balance of 
            <b>₹{balance:,.2f}</b>, which is below the minimum of ₹1,000.
          </p>
        </div>
        <p style="color:#475569;font-size:13px">Please deposit funds to avoid a fine or account freeze.</p>
        <a href="#" style="display:inline-block;background:#1E3A8A;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-top:8px">Deposit Now</a>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_transfer_confirmation(customer_name: str, to_email: str, amount: float, receiver_account: str, balance_after: float):
    subject = "✅ Transfer Successful — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Transaction Confirmation</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#166534;font-weight:600">✅ Transfer Successful</p>
          <p style="margin:6px 0 0;color:#166534;font-size:13px">
            <b>₹{amount:,.2f}</b> has been sent to account <b>••••{_mask_account(receiver_account)}</b>
          </p>
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 0;color:#64748b">Amount Transferred</td><td style="text-align:right;font-weight:600">₹{amount:,.2f}</td></tr>
          <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 0;color:#64748b">To Account</td><td style="text-align:right">••••{_mask_account(receiver_account)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Balance After</td><td style="text-align:right;font-weight:600">₹{balance_after:,.2f}</td></tr>
        </table>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_account_frozen_notice(customer_name: str, to_email: str, account_number: str, reason: str = "policy violation"):
    subject = "🔒 Account Frozen — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#991b1b;font-weight:600">🔒 Your account has been frozen</p>
          <p style="margin:6px 0 0;color:#991b1b;font-size:13px">
            Account <b>••••{_mask_account(account_number)}</b> has been frozen due to: <b>{reason}</b>.
          </p>
        </div>
        <p style="color:#475569;font-size:13px">To unfreeze, please submit a request through your customer portal or contact your branch.</p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_complaint_resolved(customer_name: str, to_email: str, complaint_id: str, response: str):
    subject = f"✅ Complaint {complaint_id} Resolved — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#166534;font-weight:600">Your complaint <b>{complaint_id}</b> has been resolved.</p>
          <p style="margin:8px 0 0;color:#166534;font-size:13px">{response}</p>
        </div>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_unfreeze_approved(customer_name: str, to_email: str, account_number: str):
    subject = "🔓 Account Unfrozen — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
      </div>
      <div style="padding:24px">
        <p>Dear <b>{customer_name}</b>,</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#166534;font-weight:600">🔓 Your account <b>••••{_mask_account(account_number)}</b> has been successfully unfrozen.</p>
          <p style="margin:6px 0 0;color:#166534;font-size:13px">You can now resume all banking operations.</p>
        </div>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)
