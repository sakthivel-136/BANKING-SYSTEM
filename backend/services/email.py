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
    s = str(acc)
    n = len(s)
    if n <= 4:
        return s
    return s[n-4] + s[n-3] + s[n-2] + s[n-1]


RESEND_API_KEY = os.getenv("RESEND_API_KEY")

def send_email(to: str, subject: str, html_body: str, plain_body: Optional[str] = None):
    """
    Sends email using Resend API (HTTP) if available, falling back to SMTP.
    HTTP-based delivery bypasses Render's SMTP port blocks.
    """
    print(f"DIAGNOSTIC: Starting send_email to {to}...", flush=True)

    # Strategy 1: Resend API (Primary for Hosted Environments)
    if RESEND_API_KEY:
        try:
            print("DEBUG: Attempting delivery via Resend API...", flush=True)
            import resend
            resend.api_key = RESEND_API_KEY
            
            params = {
                "from": f"{FROM_NAME} <onboarding@resend.dev>" if not FROM_EMAIL or "gmail.com" in FROM_EMAIL else f"{FROM_NAME} <{FROM_EMAIL}>",
                "to": [to],
                "subject": subject,
                "html": html_body,
            }
            # Note: If using Resend free tier without a custom domain, 
            # we MUST send from onboarding@resend.dev and can only send to the registered owner email.
            # To send to ANY email with custom branding, the user must add their domain to Resend.
            
            resend.Emails.send(params)
            print(f"DEBUG: SUCCESS via Resend API", flush=True)
            return
        except Exception as e:
            print(f"DEBUG: Resend API failed: {e}. Falling back to SMTP...", flush=True)

    # Strategy 2: SMTP Fallback (Works on Localhost)
    import socket
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    # Force IPv4 to avoid Render's flaky IPv6 routing
    def get_ipv4_socket(host, port, timeout):
        addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect(addr_info[0][4])
        return sock

    clean_password = str(SMTP_PASSWORD).strip('"').strip("'")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"]      = to
    msg["X-Mailer"] = "SmartBank Automation System"

    if plain_body:
        msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    strategies = [
        {"host": "smtp.gmail.com", "port": 587},
        {"host": "smtp.googlemail.com", "port": 465},
    ]

    last_error = Exception("All email delivery strategies failed")
    for s in strategies:
        host = str(s["host"])
        port = int(s["port"])
        try:
            print(f"DEBUG: Attempting SMTP connection to {host}:{port}...", flush=True)
            if port == 465:
                raw_sock = get_ipv4_socket(host, port, 10)
                import ssl
                context = ssl.create_default_context()
                hostname = host if not (host.replace('.', '').isdigit()) else "smtp.gmail.com"
                sslsock = context.wrap_socket(raw_sock, server_hostname=hostname)
                server = smtplib.SMTP_SSL(host, port, timeout=10) 
            else:
                server = smtplib.SMTP(host, port, timeout=10)
                server.ehlo()
                server.starttls()
                server.ehlo()
            
            server.login(str(SMTP_USER), clean_password)
            server.send_message(msg)
            server.quit()
            print(f"DEBUG: SUCCESS via SMTP {host}:{port}", flush=True)
            return
        except Exception as e:
            last_error = e
            print(f"DEBUG: SMTP {host}:{port} failed: {e}", flush=True)
            continue

    print(f"CRITICAL: All delivery methods failed for {to}.", flush=True)
    raise last_error


# ── Specific notification functions ──────────────────────────────────

def send_low_balance_alert(customer_name: str, to_email: str, account_number: str, balance: float, threshold: float = 1000.0):
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
            Your account ending <b>••••{_mask_account(account_number)}</b> currently has a balance of
            <b>₹{balance:,.2f}</b>, which is below the required minimum of <b>₹{threshold:,.2f}</b>.
          </p>
        </div>
        <p style="color:#475569;font-size:13px">
          Please deposit funds immediately to avoid a penalty fine on your account.
          If the balance remains below the minimum by the 10th of this month, a fine will be automatically charged.
        </p>
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


def send_account_blocked_notice(customer_name: str, to_email: str, account_number: str, reason: str = "policy violation"):
    subject = "🚫 Account Blocked — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Account Notification</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#991b1b;font-weight:600">🚫 Your account has been blocked</p>
          <p style="margin:6px 0 0;color:#991b1b;font-size:13px">
            Account <b>••••{_mask_account(account_number)}</b> has been blocked due to: <b>{reason}</b>.
          </p>
        </div>
        <p style="color:#475569;font-size:13px">All transactions and access to this account have been suspended. To request unblocking, please submit a request through your customer portal or contact your branch.</p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_account_unblocked_notice(customer_name: str, to_email: str, account_number: str):
    subject = "✅ Account Unblocked — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Account Notification</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#166534;font-weight:600">✅ Your account <b>••••{_mask_account(account_number)}</b> has been successfully unblocked.</p>
          <p style="margin:6px 0 0;color:#166534;font-size:13px">You can now resume all banking operations. All restrictions have been lifted.</p>
        </div>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_withdrawal_confirmation(customer_name: str, to_email: str, account_number: str, amount: float, balance_after: float):
    subject = "💸 Withdrawal Successful — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Transaction Confirmation</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#166534;font-weight:600">💸 Withdrawal Successful</p>
          <p style="margin:6px 0 0;color:#166534;font-size:13px">
            <b>₹{amount:,.2f}</b> has been withdrawn from account <b>••••{_mask_account(account_number)}</b>
          </p>
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 0;color:#64748b">Amount Withdrawn</td><td style="text-align:right;font-weight:600;color:#dc2626">–₹{amount:,.2f}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Balance After</td><td style="text-align:right;font-weight:600">₹{balance_after:,.2f}</td></tr>
        </table>
        {"<p style='margin-top:16px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:13px'>⚠️ <b>Low Balance Warning:</b> Your balance is below the minimum threshold of ₹1,000. Please deposit funds soon.</p>" if balance_after < 1000 else ""}
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_charge_notice(customer_name: str, to_email: str, account_number: str, charge_amount: float, reason: str, balance_after: float):
    subject = "🏦 Bank Charge Applied — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Service Charge Notice</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#9a3412;font-weight:600">🏦 Service Charge Deducted</p>
          <p style="margin:6px 0 0;color:#9a3412;font-size:13px">
            A bank service charge of <b>₹{charge_amount:,.2f}</b> has been applied to account <b>••••{_mask_account(account_number)}</b>
          </p>
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 0;color:#64748b">Charge Amount</td><td style="text-align:right;font-weight:600;color:#dc2626">–₹{charge_amount:,.2f}</td></tr>
          <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 0;color:#64748b">Reason</td><td style="text-align:right">{reason}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Balance After</td><td style="text-align:right;font-weight:600">₹{balance_after:,.2f}</td></tr>
        </table>
        <p style="color:#475569;font-size:13px;margin-top:12px">If you have questions about this charge, please contact your branch or raise an enquiry through the SmartBank portal.</p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_account_deactivated_notice(customer_name: str, to_email: str, account_number: str, duration: str):
    subject = "⛔ Account Deactivated — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Account Notification</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#991b1b;font-weight:600">⛔ Your account has been deactivated</p>
          <p style="margin:6px 0 0;color:#991b1b;font-size:13px">
            Account <b>••••{_mask_account(account_number)}</b> has been deactivated. Duration: <b>{duration}</b>.
          </p>
        </div>
        <p style="color:#475569;font-size:13px">If you believe this is in error, please contact your branch immediately.</p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


# ── New Charge Email Notifications ────────────────────────────────────────────────────

def send_min_balance_fine_notice(
    customer_name: str,
    to_email: str,
    account_number: str,
    fine_amount: float,
    balance_after: float,
    account_type: str,
):
    """Sent when a minimum balance fine is charged on the 10th of the month."""
    subject = "💸 Minimum Balance Fine Charged — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Bank Charge Notice</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#991b1b;font-weight:600">💸 Minimum Balance Fine Deducted</p>
          <p style="margin:6px 0 0;color:#991b1b;font-size:13px">
            Your <b>{account_type.capitalize()}</b> account ending
            <b>••••{_mask_account(account_number)}</b> did not maintain the required minimum balance
            this month. A fine of <b>₹{fine_amount:,.2f}</b> has been deducted.
          </p>
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="padding:8px 0;color:#64748b">Fine Amount</td>
            <td style="text-align:right;font-weight:600;color:#dc2626">–₹{fine_amount:,.2f}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b">Balance After Deduction</td>
            <td style="text-align:right;font-weight:600">₹{balance_after:,.2f}</td>
          </tr>
        </table>
        <p style="color:#475569;font-size:13px;margin-top:12px">
          To avoid future fines, please ensure your account maintains the required minimum balance.
          If you have any questions, please contact your branch or raise an enquiry through the SmartBank portal.
        </p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_monthly_notification_charge_notice(
    customer_name: str,
    to_email: str,
    account_number: str,
    balance_after: float,
):
    """Sent on the 10th of each month for the ₹50 notification charge."""
    subject = "🔔 Monthly Notification Charge — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Monthly Notification Charge</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#9a3412;font-weight:600">🔔 Monthly Notification Charge Deducted</p>
          <p style="margin:6px 0 0;color:#9a3412;font-size:13px">
            A monthly notification service charge of <b>₹50.00</b> has been deducted from your account
            ending <b>••••{_mask_account(account_number)}</b> for the month of notifications and alerts.
          </p>
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="padding:8px 0;color:#64748b">Notification Charge</td>
            <td style="text-align:right;font-weight:600;color:#dc2626">–₹50.00</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b">Balance After Deduction</td>
            <td style="text-align:right;font-weight:600">₹{balance_after:,.2f}</td>
          </tr>
        </table>
        <p style="color:#475569;font-size:13px;margin-top:12px">
          This charge covers SmartBank’s automated notification and alert services for the current month.
          For queries, contact your branch or raise an enquiry in the SmartBank portal.
        </p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)


def send_profile_edit_charge_notice(
    customer_name: str,
    to_email: str,
    account_number: str,
    balance_after: float,
):
    """Sent when a ₹75 profile edit charge is applied."""
    subject = "📝 Profile Update Service Charge — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Service Charge Notice</p>
      </div>
      <div style="padding:24px">
        <p style="color:#0f172a;font-size:15px">Dear <b>{customer_name}</b>,</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:#9a3412;font-weight:600">📝 Profile Update Service Charge</p>
          <p style="margin:6px 0 0;color:#9a3412;font-size:13px">
            A service charge of <b>₹75.00</b> has been applied to your account
            ending <b>••••{_mask_account(account_number)}</b> for processing your profile update request.
          </p>
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="padding:8px 0;color:#64748b">Service Charge</td>
            <td style="text-align:right;font-weight:600;color:#dc2626">–₹75.00</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b">Balance After Deduction</td>
            <td style="text-align:right;font-weight:600">₹{balance_after:,.2f}</td>
          </tr>
        </table>
        <p style="color:#475569;font-size:13px;margin-top:12px">
          This is a one-time service charge for your profile update request, which is now pending Manager approval.
          If you did not request this change, please contact your branch immediately.
        </p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
        This is an automated message from SmartBank. Do not reply to this email.
      </div>
    </div>
    """
    send_email(to_email, subject, html)
def send_reversal_request_notice(customer_name: str, to_email: str, account_number: str, amount: float, reason: str):
    subject = "🔄 Reversal Request Received — SmartBank"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
      </div>
      <div style="padding:24px">
        <p>Dear <b>{customer_name}</b>,</p>
        <p>We have received your request to reverse a transaction of <b>₹{amount:,.2f}</b> on your account ending in <b>••••{_mask_account(account_number)}</b>.</p>
        <p><b>Reason:</b> {reason}</p>
        <p>Your request is currently being verified by our management team. We will notify you once it has been processed.</p>
      </div>
    </div>
    """
    send_email(to_email, subject, html)

def send_reversal_status_update(customer_name: str, to_email: str, account_number: str, amount: float, status: str, new_balance: Optional[float] = None):
    subject = f"🔄 Reversal Request {status.capitalize()} — SmartBank"
    color = "#166534" if status == "approved" else "#991b1b"
    status_text = "Approved & Processed" if status == "approved" else "Rejected"
    
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#1E3A8A;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">SmartBank</h2>
      </div>
      <div style="padding:24px">
        <p>Dear <b>{customer_name}</b>,</p>
        <div style="background:{'#f0fdf4' if status=='approved' else '#fef2f2'};border:1px solid {'#bbf7d0' if status=='approved' else '#fecaca'};border-radius:8px;padding:14px 16px;margin:16px 0">
          <p style="margin:0;color:{color};font-weight:600">Reversal {status_text}</p>
          <p style="margin:6px 0 0;color:{color};font-size:13px">
            Your reversal request for <b>₹{amount:,.2f}</b> has been {status}.
          </p>
        </div>
        {f'<p>Your new account balance is <b>₹{new_balance:,.2f}</b>.</p>' if new_balance is not None else ''}
      </div>
    </div>
    """
    send_email(to_email, subject, html)
