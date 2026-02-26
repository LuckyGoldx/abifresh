#!/usr/bin/env python3
"""
Check what users exist in the system
"""
import os
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

# Try loading from .env files
home_dir = Path.home()
env_file = home_dir / '.env'
if env_file.exists():
    load_dotenv(env_file)

# Or from frontend/.env.local
frontend_env = Path(__file__).parent / 'frontend' / '.env.local'
if frontend_env.exists():
    load_dotenv(frontend_env)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print(f"URL: {SUPABASE_URL}")
print(f"KEY: {SUPABASE_KEY[:20] if SUPABASE_KEY else 'NOT FOUND'}...")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n❌ Cannot find Supabase credentials")
    print("Looking for env variables...")
    print(f"  NEXT_PUBLIC_SUPABASE_URL: {os.getenv('NEXT_PUBLIC_SUPABASE_URL')}")
    print(f"  NEXT_PUBLIC_SUPABASE_ANON_KEY: {os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')}")
    exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Get all users
    response = supabase.table('users').select('id,email,role,full_name').execute()
    users = response.data if response.data else []
    
    print(f"\n✅ Found {len(users)} users:")
    for user in users:
        print(f"   ID: {user['id'][:8]}...")
        print(f"      Email: {user['email']}")
        print(f"      Name: {user['full_name']}")
        print(f"      Role: {user['role']}")
        print()
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
