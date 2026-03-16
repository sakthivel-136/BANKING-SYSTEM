from fastapi import FastAPI, Request # type: ignore
import time
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from contextlib import asynccontextmanager

from routers import auth, customers, accounts, transactions, complaints, enquiries, notifications, reports, workflows, executions, reversals  # type: ignore


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start APScheduler for monthly charges
    try:
        from services.scheduler import start_scheduler  # type: ignore
        _scheduler = start_scheduler()
        print("✅ SmartBank scheduler initialized.")
    except Exception as e:
        print(f"⚠️ WARNING: Scheduler failed to start: {e}")
    yield
    # Shutdown (nothing to clean up yet)


app = FastAPI(title="SmartBank Automation System", version="1.0.0", lifespan=lifespan)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    print(f"REQUEST LOG: {request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.2f}s")
    return response

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow development frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(complaints.router)
app.include_router(enquiries.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(workflows.router)
app.include_router(executions.router)
app.include_router(reversals.router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "SmartBank API is running"}
