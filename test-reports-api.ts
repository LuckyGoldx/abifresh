/**
 * Test script to diagnose reports API issues
 * Run with: ts-node test-reports-api.ts
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:4000';
const TOKEN = 'your-token-here'; // Replace with actual token from login

async function testReportsAPI() {
  console.log('\n🧪 === TESTING REPORTS API ===\n');

  try {
    // Test the comprehensive reports endpoint
    const endpoint = `${API_BASE_URL}/api/admin/reports/comprehensive?dateRange=month`;
    
    console.log(`📨 Calling: ${endpoint}\n`);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json() as any;
    
    console.log('✅ Response received successfully\n');
    
    // Check summary
    if (data.summary) {
      console.log('📊 Summary:');
      console.log(`  - Total Sales: ${data.summary.total_sales}`);
      console.log(`  - Total Revenue: ₦${(data.summary.total_revenue || 0).toLocaleString()}`);
      console.log(`  - Total Expenses: ₦${(data.summary.total_expenses || 0).toLocaleString()}`);
      console.log(`  - Total Profit: ₦${(data.summary.total_profit || 0).toLocaleString()}`);
      console.log(`  - Total Items Sold: ${data.summary.total_items_sold}`);
      console.log(`  - Avg Transaction: ₦${(data.summary.avg_transaction || 0).toLocaleString()}`);
    }

    // Check sales data
    if (data.sales) {
      console.log('\n💰 Sales Data:');
      console.log(`  - By Staff: ${data.sales.by_staff?.length || 0} records`);
      if (data.sales.by_staff?.length > 0) {
        console.log('    Sample:', data.sales.by_staff[0]);
      }
      console.log(`  - By Role: ${data.sales.by_staff_role?.length || 0} records`);
      console.log(`  - By Day: ${data.sales.by_day?.length || 0} records`);
      console.log(`  - Items: ${data.sales.items_list?.length || 0} records`);
    }

    // Check expenses data
    if (data.expenses) {
      console.log('\n💸 Expenses Data:');
      console.log(`  - Total: ₦${(data.expenses.total || 0).toLocaleString()}`);
      console.log(`  - By Staff: ${data.expenses.by_staff?.length || 0} records`);
      if (data.expenses.by_staff?.length > 0) {
        console.log('    Sample:', data.expenses.by_staff[0]);
      }
      console.log(`  - By Type: ${data.expenses.by_type?.length || 0} records`);
      console.log(`  - By Day: ${data.expenses.by_day?.length || 0} records`);
    }

    // Check inventory data
    if (data.inventory) {
      console.log('\n📦 Inventory Data:');
      console.log(`  - Main Store Total: ${data.inventory.main_store_total || 0} items`);
      console.log(`  - Active Store Total: ${data.inventory.active_store_total || 0} items`);
      console.log(`  - Low Stock Items: ${data.inventory.low_stock_items?.length || 0}`);
    }

    // Check performance data
    if (data.performance) {
      console.log('\n⭐ Performance Data:');
      console.log(`  - Top Staff: ${data.performance.top_staff?.length || 0} records`);
      console.log(`  - Top Items: ${data.performance.top_items?.length || 0} records`);
      console.log(`  - Staff Details: ${data.performance.staff_details?.length || 0} records`);
      if (data.performance.staff_details?.length > 0) {
        console.log('    Sample:', data.performance.staff_details[0]);
      }
    }

    // Calculate issue counts
    const issues: string[] = [];
    if (data.summary?.total_sales === 0) issues.push('No sales data found');
    if (data.summary?.total_revenue === 0) issues.push('No revenue calculated');
    if (data.summary?.total_expenses === 0) issues.push('No expenses data found');
    if (!data.sales?.by_staff || data.sales.by_staff.length === 0) issues.push('No sales by staff');
    if (!data.expenses?.by_staff || data.expenses.by_staff.length === 0) issues.push('No expenses by staff');

    if (issues.length > 0) {
      console.log('\n⚠️  Potential Issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('\n✅ No obvious issues detected');
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run the test
testReportsAPI().catch(console.error);
