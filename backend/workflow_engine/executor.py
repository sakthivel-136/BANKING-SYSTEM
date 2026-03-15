from services.email import (
    send_low_balance_alert,
    send_transfer_confirmation,
    send_account_frozen_notice,
    send_complaint_resolved,
    send_unfreeze_approved,
)

def execute_notification_step(step_metadata: dict, execution_data: dict):
    notification_type = step_metadata.get("notification_type")
    customer_email    = execution_data.get("customer_email")
    customer_name     = execution_data.get("customer_name")
    
    # Require email and name to proceed
    if not customer_email or not customer_name:
        print(f"Cannot send email: Missing customer_email or customer_name in execution_data")
        return

    try:
        if notification_type == "low_balance":
            send_low_balance_alert(
                customer_name, customer_email,
                execution_data.get("account_number", "UNKNOWN"),
                execution_data.get("balance", 0.0)
            )
        elif notification_type == "transfer_success":
            send_transfer_confirmation(
                customer_name, customer_email,
                execution_data.get("amount", 0.0),
                execution_data.get("receiver_account", "UNKNOWN"),
                execution_data.get("balance_after", 0.0)
            )
        elif notification_type == "account_frozen":
            send_account_frozen_notice(
                customer_name, customer_email,
                execution_data.get("account_number", "UNKNOWN"),
                execution_data.get("reason", "manager action")
            )
        elif notification_type == "complaint_resolved":
            send_complaint_resolved(
                customer_name, customer_email,
                execution_data.get("complaint_id", "UNKNOWN"),
                execution_data.get("response", "Your complaint has been processed.")
            )
        elif notification_type == "unfreeze_approved":
            send_unfreeze_approved(
                customer_name, customer_email,
                execution_data.get("account_number", "UNKNOWN")
            )
        else:
            print(f"Unknown notification type requested: {notification_type}")
    except Exception as e:
        print(f"Failed to execute notification step: {e}")
