from database import supabase
import datetime

def trigger_workflow(workflow_name: str, payload: dict):
    """
    Trigger a workflow by its generic name.
    1. Look up active workflow by name
    2. Create workflow_execution record
    3. Initialize execution logic
    """
    res = supabase.table("workflows").select("*").eq("name", workflow_name).eq("is_active", True).execute()
    if not res.data:
        # Workflow not defined, just skip gracefully or log warning
        print(f"Warning: Workflow {workflow_name} not found or inactive")
        return
        
    wf = res.data[0]
    
    # Fetch customer profile dynamically to populate email inside payload if we have an account_id
    # We'll do a quick check to augment the payload
    if "account_id" in payload:
        acc_res = supabase.table("accounts").select("customer_profile(full_name, email), account_number").eq("account_id", payload["account_id"]).execute()
        if acc_res.data:
            prof = acc_res.data[0].get("customer_profile")
            if prof:
                payload["customer_name"] = prof.get("full_name")
                payload["customer_email"] = prof.get("email")
            payload["account_number"] = acc_res.data[0].get("account_number")
    
    execution_record = {
        "workflow_id": wf["workflow_id"],
        "workflow_version": wf["version"],
        "status": "Running",
        "data": payload,
        "current_step_id": wf.get("start_step_id"),
        "logs": [{"step": "START", "msg": f"Workflow {workflow_name} started", "timestamp": str(datetime.datetime.now())}]
    }
    
    exec_res = supabase.table("workflow_executions").insert(execution_record).execute()
    exec_id = exec_res.data[0]["execution_id"]
    
    # Ideally trigger an async background task to evaluate the workflow steps.
    # For now, we stub an execution evaluation engine.
    evaluate_execution(exec_id)

def evaluate_execution(execution_id: str):
    """
    Stub for the rule evaluator.
    Steps sequentially through workflow rules if condition maps exist.
    """
    # In a full-blown architecture, we'd use celery/kafka here.
    # We will log the transition for now.
    res = supabase.table("workflow_executions").select("*").eq("execution_id", execution_id).execute()
    if not res.data: return
    execution = res.data[0]
    
    # Simple simulated progression to demonstrate logging
    logs = execution.get("logs") or []
    current_step = execution.get("current_step_id")
    
    if current_step:
        # Step logic evaluation
        # For notification demo, we will fire the executor directly based on logic.
        from workflow_engine.executor import execute_notification_step
        
        # VERY basic mock to fire low_balance emails right now to demonstrate execution mapping:
        if execution["workflows"]["name"] == "LOW_BALANCE_MONITORING":
            execute_notification_step({"notification_type": "low_balance"}, execution["data"])
        elif execution["workflows"]["name"] == "ACCOUNT_UNFREEZE_REQUEST":
            # Just mimicking an unfreeze email sequence automatically for demo
            pass
            
        logs.append({"step": str(current_step), "msg": "Evaluated step and executed related handlers", "timestamp": str(datetime.datetime.now())})
        
    supabase.table("workflow_executions").update({
        "status": "Completed" if not current_step else "Pending Action", 
        "logs": logs
    }).eq("execution_id", execution_id).execute()
