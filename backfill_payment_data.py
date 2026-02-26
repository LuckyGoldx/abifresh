#!/usr/bin/env python3
"""
Backfill missing staff_payments fields from users table
Updates existing payment records with staff_name and staff_phone
"""
from supabase import create_client
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env
load_dotenv(Path(__file__).parent / 'frontend' / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase credentials not found")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🔄 Starting backfill of staff_payments with user data...")

try:
    # Get all staff_payments with missing staff_name or staff_phone
    response = supabase.table('staff_payments').select('*').execute()
    payments = response.data if response.data else []
    
    print(f"✅ Found {len(payments)} payment records")
    
    # Get all users for lookup
    users_response = supabase.table('users').select('id, full_name, phone, email').execute()
    users = users_response.data if users_response.data else []
    
    # Create user map
    user_map = {u['id']: u for u in users}
    print(f"✅ Found {len(users)} users")
    
    # Track updates
    updated_count = 0
    needs_update = []
    
    for payment in payments:
        staff_id = payment.get('staff_id')
        user = user_map.get(staff_id)
        
        if not user:
            continue
        
        updates = {}
        
        # Check if staff_name is missing
        if not payment.get('staff_name') and user.get('full_name'):
            updates['staff_name'] = user['full_name']
        
        # Check if staff_phone is missing
        if not payment.get('staff_phone') and user.get('phone'):
            updates['staff_phone'] = user['phone']
        
        # Check if staff_email is missing  
        if not payment.get('staff_email') and user.get('email'):
            updates['staff_email'] = user['email']
        
        if updates:
            needs_update.append((payment['id'], updates))
    
    print(f"📊 Found {len(needs_update)} payments needing updates")
    
    # Apply updates
    for payment_id, updates in needs_update:
        try:
            supabase.table('staff_payments').update(updates).eq('id', payment_id).execute()
            updated_count += 1
            print(f"  ✅ Updated {payment_id}: {updates}")
        except Exception as e:
            print(f"  ❌ Failed to update {payment_id}: {e}")
    
    print(f"\n✅ Backfill complete! Updated {updated_count} payment records")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
