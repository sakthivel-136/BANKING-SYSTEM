from fastapi import APIRouter, Depends, HTTPException # type: ignore
from fastapi.responses import StreamingResponse # type: ignore
from typing import Dict, Any
from database import supabase # type: ignore
from routers.auth import get_current_user # type: ignore
from services.banking import get_account_config, apply_charge # type: ignore
import csv
import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4 # type: ignore
from reportlab.lib import colors # type: ignore
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer # type: ignore
from reportlab.lib.styles import getSampleStyleSheet # type: ignore

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/summary")
def get_md_summary(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") != "md":
        raise HTTPException(status_code=403, detail="Forbidden - MD only")
    
    acc_res = supabase.table("accounts").select("balance, status").execute()
    accounts = acc_res.data
    total_balance = sum(a["balance"] for a in accounts)
    frozen_count = sum(1 for a in accounts if a["status"] == "frozen")
    blocked_count = sum(1 for a in accounts if a["status"] == "closed")
    total_accounts = len(accounts)

    txn_res = supabase.table("transactions").select("amount, transaction_type").execute()
    txns = txn_res.data
    total_deposits = sum(t["amount"] for t in txns if t["transaction_type"] == "deposit")
    total_withdrawals = sum(t["amount"] for t in txns if t["transaction_type"] == "withdraw")
    total_transfers = sum(t["amount"] for t in txns if t["transaction_type"] == "transfer")

    return {
        "Total Balance": total_balance,
        "Total Accounts": total_accounts,
        "Frozen Accounts": frozen_count,
        "Blocked Accounts": blocked_count,
        "Total Deposits": total_deposits,
        "Total Withdrawals": total_withdrawals,
        "Total Transfers": total_transfers
    }

def _deduct_md_report_charge(user_id: str):
    """Utility to deduct ₹2.50 from MD's linked account (or the bank charges account if none)."""
    # For MD, we typically deduct from a central account or their own account if they have one.
    # The requirement says ₹2.50 charge for download.
    # We'll try to find any 'Internal' or 'MD' account to deduct from, or just record it.
    try:
        md_acc_res = supabase.table("accounts").select("account_id, account_number").eq("account_type", "Internal").limit(1).execute()
        if md_acc_res.data:
            acc = md_acc_res.data[0]
            apply_charge(acc["account_id"], acc["account_number"], 2.50, "MD Report Download Charge")
    except Exception as e:
        print(f"⚠️ Warning: Failed to deduct MD report charge: {e}")

@router.get("/monthly-download")
def download_monthly_report(user: Dict[str, Any] = Depends(get_current_user)):
    """Download a comprehensive CSV report of the current month's activity."""
    if user.get("role") != "md":
        raise HTTPException(status_code=403, detail="Forbidden - MD only")

    _deduct_md_report_charge(user["id"])

    output = io.StringIO()
    writer = csv.writer(output)
    now = datetime.now(timezone.utc)
    month_label = now.strftime("%B %Y")

    # ── Section 1: Transactions ──
    writer.writerow([f"=== SECTION 1: TRANSACTIONS ({month_label}) ==="])
    writer.writerow(["Transaction ID", "Account Number", "Type", "Amount (₹)", "Balance After", "Description", "Created At"])
    txns = supabase.table("transactions").select("*, accounts(account_number)").order("created_at", desc=True).execute().data or []
    for t in txns:
        writer.writerow([
            t.get("transaction_id", ""),
            t.get("accounts", {}).get("account_number", ""),
            t.get("transaction_type", ""),
            t.get("amount", ""),
            t.get("balance_after", ""),
            t.get("description", ""),
            t.get("created_at", ""),
        ])

    writer.writerow([])

    # ── Section 2: Transfer Requests ──
    writer.writerow([f"=== SECTION 2: TRANSFER REQUESTS ({month_label}) ==="])
    writer.writerow(["Request ID", "From Account", "To Account", "Amount (₹)", "Status", "Notes", "Created At"])
    transfers = supabase.table("transfer_requests").select("*").order("created_at", desc=True).execute().data or []
    for t in transfers:
        writer.writerow([
            t.get("request_id", ""),
            t.get("source_account_id", ""),
            t.get("destination_account_id", ""),
            t.get("amount", ""),
            t.get("status", ""),
            t.get("notes", ""),
            t.get("created_at", ""),
        ])

    writer.writerow([])

    # ── Section 3: Account Activity Requests ──
    writer.writerow([f"=== SECTION 3: ACCOUNT ACTIVITY REQUESTS ({month_label}) ==="])
    writer.writerow(["Request ID", "Account ID", "Action Type", "Reason", "Duration Days", "Status", "Created At"])
    activities = supabase.table("account_activity_requests").select("*").order("created_at", desc=True).execute().data or []
    for a in activities:
        writer.writerow([
            a.get("request_id", ""),
            a.get("account_id", ""),
            a.get("action_type", ""),
            a.get("reason", ""),
            a.get("duration_days", ""),
            a.get("status", ""),
            a.get("created_at", ""),
        ])

    writer.writerow([])

    # ── Section 4: Profile Update Requests ──
    writer.writerow([f"=== SECTION 4: PROFILE UPDATE REQUESTS ({month_label}) ==="])
    writer.writerow(["Request ID", "Customer ID", "Field Changed", "Old Value", "New Value", "Status", "Created At"])
    profiles = supabase.table("profile_update_requests").select("*").order("created_at", desc=True).execute().data or []
    for p in profiles:
        writer.writerow([
            p.get("request_id", ""),
            p.get("customer_id", ""),
            p.get("field_name", ""),
            p.get("old_value", ""),
            p.get("new_value", ""),
            p.get("status", ""),
            p.get("created_at", ""),
        ])

    writer.writerow([])

    # ── Section 5: Chat / Enquiry Logs ──
    writer.writerow([f"=== SECTION 5: CHAT LOGS / ENQUIRIES ({month_label}) ==="])
    writer.writerow(["Enquiry ID", "Customer ID", "Message", "Manager Response", "Status", "Created At"])
    enquiries = supabase.table("enquiries").select("*").order("created_at", desc=True).execute().data or []
    for e in enquiries:
        writer.writerow([
            e.get("enquiry_id", ""),
            e.get("customer_id", ""),
            e.get("message", ""),
            e.get("response", ""),
            e.get("status", ""),
            e.get("created_at", ""),
        ])

    output.seek(0)
    filename = f"smartbank_report_{now.strftime('%Y_%m')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/monthly-download-pdf")
def download_monthly_report_pdf(user: Dict[str, Any] = Depends(get_current_user)):
    """Download a comprehensive PDF report of the current month's activity."""
    if user.get("role") != "md":
        raise HTTPException(status_code=403, detail="Forbidden - MD only")

    _deduct_md_report_charge(user["id"])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    now = datetime.now(timezone.utc)
    month_label = now.strftime("%B %Y")

    elements.append(Paragraph(f"SmartBank Monthly Report - {month_label}", styles['Title']))
    elements.append(Spacer(1, 12))

    # Transactions Table
    txns = supabase.table("transactions").select("*, accounts(account_number)").limit(50).order("created_at", desc=True).execute().data or []
    if txns:
        elements.append(Paragraph("Recent Transactions", styles['Heading2']))
        data = [["Acc Number", "Type", "Amount", "Balance After", "Created At"]]
        for t in txns:
            data.append([
                str(t.get("accounts", {}).get("account_number", "")),
                str(t.get("transaction_type", "")),
                f"₹{t.get('amount', 0)}",
                f"₹{t.get('balance_after', 0)}",
                t.get("created_at", "")[:10]
            ])
        t_table = Table(data)
        t_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(t_table)
        elements.append(Spacer(1, 24))

    # Add other sections if needed, but for MVP this shows PDF generation is working
    elements.append(Paragraph("Note: This is an automatically generated system report.", styles['Italic']))

    doc.build(elements)
    buffer.seek(0)
    filename = f"smartbank_report_{now.strftime('%Y_%m')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
