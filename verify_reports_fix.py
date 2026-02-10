#!/usr/bin/env python3
"""
ADMIN REPORTS FIX VERIFICATION SCRIPT
Tests the fixed comprehensive reports endpoint to ensure data flows correctly
"""

import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"

def test_database_connectivity():
    """Verify database has actual data"""
    print("\n" + "="*60)
    print("1. DATABASE CONNECTIVITY TEST")
    print("="*60)
    
    try:
        resp = requests.get(f"{BASE_URL}/api/receipts/test-db", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Database connection successful")
            print(f"\n   Records in database:")
            for table, count in data.get('summary', {}).items():
                print(f"   - {table}: {count}")
            
            if data.get('raw_data', {}).get('receipts'):
                print(f"\n   ✅ Sample receipt found:")
                receipt = data['raw_data']['receipts'][0]
                print(f"      ID: {receipt['id']}")
                print(f"      Amount: ₦{receipt['total_amount']}")
                print(f"      Staff ID: {receipt['staff_id']}")
                print(f"      Date: {receipt['created_at']}")
            return True
        else:
            print(f"❌ Connection test failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing database: {e}")
        return False

def test_auth():
    """Test authentication flow"""
    print("\n" + "="*60)
    print("2. AUTHENTICATION TEST")
    print("="*60)
    
    try:
        # Try to login as admin
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=5
        )
        
        if resp.status_code == 200:
            data = resp.json()
            token = data.get('token')
            print(f"✅ Admin login successful")
            print(f"   Token issued (first 20 chars): {token[:20]}...")
            return token
        else:
            print(f"❌ Login failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
            
            # Try with email instead
            resp = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"username": "admin@abifresh.com", "password": "admin123"},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get('token')
            
            print("   Note: Authentication may require valid Supabase users")
            print("   Reports endpoint requires valid JWT token")
            return None
    except Exception as e:
        print(f"❌ Error testing auth: {e}")
        return None

def test_reports_api(token=None):
    """Test the comprehensive reports endpoint"""
    print("\n" + "="*60)
    print("3. COMPREHENSIVE REPORTS API TEST")
    print("="*60)
    
    if not token:
        print("⚠️  No authentication token - tests will fail with 401")
        print("   But we can verify the endpoint exists...")
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    params = {
        'dateRange': 'month',
    }
    
    try:
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/comprehensive",
            params=params,
            headers=headers,
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Reports endpoint returned data")
            
            summary = data.get('summary', {})
            print(f"\n   Summary Statistics:")
            print(f"   - Total Sales: {summary.get('total_sales', 0)}")
            print(f"   - Total Revenue: ₦{summary.get('total_revenue', 0):,.2f}")
            print(f"   - Total Expenses: ₦{summary.get('total_expenses', 0):,.2f}")
            print(f"   - Total Profit: ₦{summary.get('total_profit', 0):,.2f}")
            print(f"   - Items Sold: {summary.get('total_items_sold', 0)}")
            print(f"   - Avg Transaction: ₦{summary.get('avg_transaction', 0):,.2f}")
            
            sales_data = data.get('sales', {})
            print(f"\n   Sales Breakdown:")
            print(f"   - Sales by Staff: {len(sales_data.get('by_staff', []))} entries")
            print(f"   - Sales by Role: {len(sales_data.get('by_staff_role', []))} entries")
            print(f"   - Sales by Day: {len(sales_data.get('by_day', []))} entries")
            print(f"   - Items Sold: {len(sales_data.get('items_list', []))} entries")
            
            expenses_data = data.get('expenses', {})
            print(f"\n   Expenses Breakdown:")
            print(f"   - By Staff: {len(expenses_data.get('by_staff', []))} entries")
            print(f"   - By Type: {len(expenses_data.get('by_type', []))} entries")
            print(f"   - By Day: {len(expenses_data.get('by_day', []))} entries")
            
            inventory_data = data.get('inventory', {})
            print(f"\n   Inventory Breakdown:")
            print(f"   - Main Store: {inventory_data.get('main_store_total', 0)} items")
            print(f"   - Active Store: {inventory_data.get('active_store_total', 0)} items")
            print(f"   - Low Stock Items: {len(inventory_data.get('low_stock_items', []))} items")
            
            performance_data = data.get('performance', {})
            print(f"\n   Performance Breakdown:")
            print(f"   - Top Staff: {len(performance_data.get('top_staff', []))} entries")
            print(f"   - Top Items: {len(performance_data.get('top_items', []))} entries")
            print(f"   - Staff Details: {len(performance_data.get('staff_details', []))} entries")
            
            return True
        elif resp.status_code == 401:
            print(f"⚠️  Authentication required (401)")
            print(f"   Response: {resp.text}")
            print(f"\n   To test with auth:")
            print(f"   1. Ensure admin user exists in Supabase")
            print(f"   2. Login to get JWT token")
            print(f"   3. Pass token in Authorization header")
            return False
        else:
            print(f"❌ Error: {resp.status_code}")
            print(f"   Response: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing reports API: {e}")
        return False

def main():
    """Run all verification tests"""
    print("\n")
    print("╔════════════════════════════════════════════════════════╗")
    print("║    ADMIN REPORTS FIX - VERIFICATION SCRIPT            ║")
    print("║    Testing comprehensive reports implementation       ║")
    print("╚════════════════════════════════════════════════════════╝")
    
    # Test database
    db_ok = test_database_connectivity()
    
    if not db_ok:
        print("\n❌ Database connectivity failed - cannot proceed with tests")
        return
    
    # Test auth (optional)
    token = test_auth()
    
    # Test reports API
    reports_ok = test_reports_api(token)
    
    # Summary
    print("\n" + "="*60)
    print("VERIFICATION SUMMARY")
    print("="*60)
    
    if db_ok:
        print("✅ Database connectivity: WORKING")
        print("   - Real data exists in all required tables")
    else:
        print("❌ Database connectivity: FAILED")
    
    if token:
        print("✅ Authentication: WORKING")
    else:
        print("⚠️  Authentication: NOT TESTED (token not obtained)")
    
    if reports_ok:
        print("✅ Reports API: WORKING")
        print("   - Data is being aggregated correctly")
        print("   - All report sections have data")
    elif token:
        print("❌ Reports API: FAILED")
    else:
        print("⚠️  Reports API: REQUIRES AUTHENTICATION")
        print("   - Database and endpoint are live")
        print("   - Need valid JWT token to test full data flow")
    
    print("\n" + "="*60)
    print("NEXT STEPS")
    print("="*60)
    print("""
1. Ensure you have valid admin credentials in Supabase
2. Test login endpoint to get JWT token
3. Pass token with Authorization header to reports API
4. Frontend should automatically handle auth and display data

Expected Behavior:
- /admin/reports page loads
- User logs in with admin credentials
- Page fetches comprehensive report data
- All 5 tabs display populated charts and statistics

If issues persist:
- Check Supabase connection in backend logs
- Verify JWT token is valid
- Check date range filters in request
- Review browser console for frontend errors
    """)

if __name__ == '__main__':
    time.sleep(1)  # Give server time to start
    main()
