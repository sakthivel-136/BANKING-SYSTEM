"""
SmartBank – Monthly Charges Scheduler
Runs on the 10th of every month (IST) to apply:
  1. Minimum Balance Fine (per account type)
  2. Notification Charge (₹50 flat for all active accounts)
"""

from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore
from apscheduler.triggers.cron import CronTrigger  # type: ignore
import pytz  # type: ignore


def start_scheduler():
    """Start the background scheduler. Called once on FastAPI startup."""
    from services.banking import apply_monthly_charges  # type: ignore

    ist = pytz.timezone("Asia/Kolkata")
    scheduler = BackgroundScheduler(timezone=ist)

    # Every 10th of the month at 00:05 IST
    scheduler.add_job(
        func=apply_monthly_charges,
        trigger=CronTrigger(day=10, hour=0, minute=5, timezone=ist),
        id="monthly_charges",
        name="Apply Monthly Balance Fine + Notification Charge",
        replace_existing=True,
    )

    scheduler.start()
    print("✅ SmartBank scheduler started — monthly charges will run on the 10th of each month.")
    return scheduler
