#!/usr/bin/env python
import os
from dotenv import load_dotenv
import requests

# Load environment variables
env_file = 'backend/.env'
if os.path.exists(env_file):
    load_dotenv(env_file)

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

print("🔍 Testing inventory summary after fix...")
print(f"Backend URL: http://localhost:5000")

# First, let's get the current stats using Supabase directly to verify our calculations
try:
    from supabase import create_client, Client
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Get items with is_available flag
    response = supabase.table('items').select('id, name, is_available, main_store_quantity, active_store_quantity, unit_price').execute()
    items = response.data
    
    print(f"\n✅ Fetched {len(items)} items")
    
    # Calculate using NEW logic
    available_count = len([item for item in items if item['is_available'] == True and (item['active_store_quantity'] or 0) > 0])
    unavailable_count = len([item for item in items if item['is_available'] == False or (item['active_store_quantity'] or 0) == 0])
    total_main = sum(item['main_store_quantity'] or 0 for item in items)
    total_active = sum(item['active_store_quantity'] or 0 for item in items)
    total_qty = total_main + total_active
    total_value = sum(((item['main_store_quantity'] or 0) + (item['active_store_quantity'] or 0)) * (item['unit_price'] or 0) for item in items)
    
    print(f"\n📊 CALCULATED WITH NEW LOGIC:")
    print(f"  Total Items (count): {len(items)}")
    print(f"  Available Items (is_available=true AND active_qty>0): {available_count}")
    print(f"  Unavailable Items (is_available=false OR active_qty==0): {unavailable_count}")
    print(f"  Total Main Store: {total_main}")
    print(f"  Total Active Store: {total_active}")
    print(f"  Total Quantity (both stores): {total_qty}")
    print(f"  Total Value: ₦{total_value:,.2f}")
    print(f"\n  ✓ Available + Unavailable = {available_count} + {unavailable_count} = {available_count + unavailable_count}")
    
    # Identify the problematic item
    problem_items = [item for item in items if item['is_available'] == True and (item['active_store_quantity'] or 0) == 0]
    print(f"\n  Items with is_available=True but 0 active qty: {len(problem_items)}")
    for item in problem_items:
        print(f"    - {item['name']}: active_qty={item['active_store_quantity']}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
