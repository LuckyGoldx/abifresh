import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or ""
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""

if not url or not key:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
    exit(1)

sb = create_client(url, key)

r = sb.table("settings").select("*").execute()
print("=== SETTINGS TABLE ===")
for s in r.data:
    print(f"{s['setting_key']:20s} = {s['setting_value']}")