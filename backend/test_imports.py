try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from routers import auth, customers, accounts, transactions, complaints, enquiries, notifications, reports, workflows, executions
    print("✅ All imports successful!")
except ImportError as e:
    print(f"❌ Import failed: {e}")
except Exception as e:
    print(f"❌ An error occurred: {e}")
