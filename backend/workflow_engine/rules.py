def evaluate_condition(condition: str, payload: dict) -> bool:
    """
    Parses a condition like: balance < 1000
    and evaluates against payload: {"balance": 500}
    """
    # Extremely simplified eval (INSECURE in prod, just for MVP demonstration)
    # A real engine would use AST parsing or a safe evaluator like simpleeval.
    try:
        # replace vars in condition with payload values
        for k, v in payload.items():
            condition = condition.replace(k, str(v))
        return eval(condition)
    except Exception as e:
        print("Rule eval error:", e)
        return False
