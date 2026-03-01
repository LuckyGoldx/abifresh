#!/usr/bin/env python
import os
from dotenv import load_dotenv

# Load environment variables from backend
env_file = 'backend/.env'
if os.path.exists(env_file):
    load_dotenv(env_file)

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

print("🔍 Checking database connection...")
print(f"Supabase URL: {supabase_url}")
print(f"Anon Key available: {bool(supabase_key)}")

# Try connecting with supabase client
try:
    from supabase import create_client, Client
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Get items count
    response = supabase.table('items').select('id, name, main_store_quantity, active_store_quantity, is_available').execute()
    items = response.data
    
    print(f"\n✅ Connected! Found {len(items)} items")
    
    # Calculate stats
    total_items = len(items)
    total_main_store_qty = sum(item['main_store_quantity'] or 0 for item in items)
    total_active_store_qty = sum(item['active_store_quantity'] or 0 for item in items)
    available_count = len([item for item in items if item['active_store_quantity'] > 0])
    unavailable_count = len([item for item in items if item['active_store_quantity'] == 0])
    
    print(f"\n📊 CURRENT STATS:")
    print(f"Total Items (count): {total_items}")
    print(f"Total Main Store Qty: {total_main_store_qty}")
    print(f"Total Active Store Qty: {total_active_store_qty}")
    print(f"Available Items (with active_store_qty > 0): {available_count}")
    print(f"Unavailable Items (with active_store_qty == 0): {unavailable_count}")
    print(f"Available + Unavailable: {available_count + unavailable_count}")
    
    # Check for items with 0 quantity in both stores
    zero_qty_both = [item for item in items if (item['main_store_quantity'] or 0) == 0 and (item['active_store_quantity'] or 0) == 0]
    print(f"\n⚠️  Items with 0 qty in BOTH stores: {len(zero_qty_both)}")
    
    # Check for data inconsistencies
    print(f"\n🔍 FINDING ITEMS WITH DISCREPANCIES:")
    
    # Items with active > main
    active_greater = [item for item in items if (item['active_store_quantity'] or 0) > (item['main_store_quantity'] or 0)]
    print(f"\n  Items where Active Store Qty > Main Store Qty: {len(active_greater)}")
    for item in active_greater[:10]:
        main = item['main_store_quantity'] or 0
        active = item['active_store_quantity'] or 0
        print(f"    - {item['name'][:40]:40} | Main: {main} | Active: {active}")
    
    # Items with main > 1
    multi_main = [item for item in items if (item['main_store_quantity'] or 0) > 1]
    print(f"\n  Items with Main Store Qty > 1: {len(multi_main)}")
    for item in multi_main[:5]:
        main = item['main_store_quantity'] or 0
        active = item['active_store_quantity'] or 0
        print(f"    - {item['name'][:40]:40} | Main: {main} | Active: {active}")
    
    # Items with active > 1
    multi_active = [item for item in items if (item['active_store_quantity'] or 0) > 1]
    print(f"\n  Items with Active Store Qty > 1: {len(multi_active)}")
    for item in multi_active[:10]:
        main = item['main_store_quantity'] or 0
        active = item['active_store_quantity'] or 0
        print(f"    - {item['name'][:40]:40} | Main: {main} | Active: {active}")
    
    # Get items with unit_price info
    response = supabase.table('items').select('id, name, unit_price, price_jalingo, price_outside, main_store_quantity, active_store_quantity').execute()
    items_detailed = response.data
    
    print(f"\n💰 PRICING ANALYSIS:")
    
    # Check unit prices
    zero_prices = [item for item in items_detailed if not item['unit_price'] or item['unit_price'] == 0]
    print(f"  Items with 0 or NULL unit_price: {len(zero_prices)}")
    
    non_zero_prices = [item for item in items_detailed if item['unit_price'] and item['unit_price'] > 0]
    print(f"  Items with non-zero unit_price: {len(non_zero_prices)}")
    
    if non_zero_prices:
        print(f"    Sample prices:")
        for item in non_zero_prices[:5]:
            qty = (item['main_store_quantity'] or 0) + (item['active_store_quantity'] or 0)
            value = qty * item['unit_price']
            print(f"      - {item['name'][:40]:40} | Price: {item['unit_price']:6} | Qty: {qty:2} | Value: {value:10.2f}")
    
    # Calculate total value
    total_value_calc = sum(((item['main_store_quantity'] or 0) + (item['active_store_quantity'] or 0)) * (item['unit_price'] or 0) for item in items_detailed)
    print(f"\n  Calculated Total Value: ₦{total_value_calc:,.2f}")
    
    # Check is_available flag usage
    response2 = supabase.table('items').select('id, name, is_available, main_store_quantity, active_store_quantity').execute()
    items_with_flags = response2.data
    
    # Analyze is_available flag
    flagged_available = [item for item in items_with_flags if item['is_available'] == True]
    flagged_unavailable = [item for item in items_with_flags if item['is_available'] == False]
    
    print(f"\n🚩 FLAG ANALYSIS (is_available field):")
    print(f"  Items marked is_available = True: {len(flagged_available)}")
    print(f"  Items marked is_available = False: {len(flagged_unavailable)}")
    
    # Check if there's a mismatch between is_available flag and quantity logic
    # Case 1: marked unavailable but has stock
    mismatch1 = [item for item in items_with_flags if item['is_available'] == False and (item['active_store_quantity'] or 0) > 0]
    print(f"\n⚠️  Mismatched: Marked unavailable but has active qty: {len(mismatch1)}")
    for item in mismatch1:
        print(f"    - {item['name']}: is_available={item['is_available']}, active_qty={item['active_store_quantity']}")
    
    # Case 2: marked available but no stock
    mismatch2 = [item for item in items_with_flags if item['is_available'] == True and (item['active_store_quantity'] or 0) == 0]
    print(f"\n⚠️  Mismatched: Marked available but 0 active qty: {len(mismatch2)}")
    for item in mismatch2[:5]:
        print(f"    - {item['name']}: is_available={item['is_available']}, active_qty={item['active_store_quantity']}")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
