from database import supabase

def send_notification(user_id: str, message: str, type: str = "dashboard"):
    """
    Service to dispatch notifications.
    """
    supabase.table("notifications").insert({
        "user_id": user_id,
        "message": message,
        "type": type,
        "status": "unread"
    }).execute()
