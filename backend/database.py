import os
from dotenv import load_dotenv  # type: ignore
from supabase import create_client, Client  # type: ignore

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Service role client — for admin operations (bypasses RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Anon client — for user-facing auth (OTP sign-in/verify, creates real user sessions)
supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

