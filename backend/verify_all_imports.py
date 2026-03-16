import importlib
import sys

modules = [
    "fastapi",
    "pydantic",
    "supabase",
    "dotenv",
    "apscheduler",
    "reportlab",
    "requests",
    "httpx",
    "jwt",
    "passlib"
]

failed = []
print("🔍 Checking backend module imports...")
print("-" * 30)

for module in modules:
    try:
        if module == "jwt":
             importlib.import_module("jwt")
        elif module == "dotenv":
             importlib.import_module("dotenv")
        else:
            importlib.import_module(module)
        print(f"✅ Successfully imported: {module}")
    except (ImportError, ModuleNotFoundError) as e:
        print(f"❌ Failed to import: {module} - {e}")
        failed.append(module)

if failed:
    print("-" * 30)
    print(f"Import check failed for: {', '.join(failed)}")
    sys.exit(1)
else:
    print("-" * 30)
    print("✨ All module imports verified successfully!")
    sys.exit(0)
