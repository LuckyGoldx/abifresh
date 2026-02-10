/**
 * Diagnostic script to check Supabase data
 * Run with: ts-node check-supabase-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseData() {
  console.log('\n🔍 === CHECKING SUPABASE DATA ===\n');

  try {
    // Check sales table
    console.log('📊 SALES TABLE:');
    const { data: sales, error: salesError, count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (salesError) {
      console.error('❌ Error fetching sales:', salesError);
    } else {
      console.log(`   Total records: ${salesCount || 0}`);
      console.log(`   Sample records: ${sales?.length || 0}`);
      if (sales && sales.length > 0) {
        console.log('   First record:', JSON.stringify(sales[0], null, 2));
      }
    }

    // Check staff_expenses table
    console.log('\n💸 STAFF_EXPENSES TABLE:');
    const { data: expenses, error: expensesError, count: expensesCount } = await supabase
      .from('staff_expenses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (expensesError) {
      console.error('❌ Error fetching expenses:', expensesError);
    } else {
      console.log(`   Total records: ${expensesCount || 0}`);
      console.log(`   Sample records: ${expenses?.length || 0}`);
      if (expenses && expenses.length > 0) {
        console.log('   First record:', JSON.stringify(expenses[0], null, 2));
      }
    }

    // Check users table
    console.log('\n👥 USERS TABLE:');
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`   Total records: ${usersCount || 0}`);
      console.log(`   Sample records: ${users?.length || 0}`);
      if (users && users.length > 0) {
        console.log('   First record:', JSON.stringify(users[0], null, 2));
      }
    }

    // Check items table
    console.log('\n📦 ITEMS TABLE:');
    const { data: items, error: itemsError, count: itemsCount } = await supabase
      .from('items')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (itemsError) {
      console.error('❌ Error fetching items:', itemsError);
    } else {
      console.log(`   Total records: ${itemsCount || 0}`);
      console.log(`   Sample records: ${items?.length || 0}`);
      if (items && items.length > 0) {
        console.log('   First record:', JSON.stringify(items[0], null, 2));
      }
    }

    // Check inventory tables
    console.log('\n📊 INVENTORY_MAIN_STORE TABLE:');
    const { data: mainInventory, error: mainError, count: mainCount } = await supabase
      .from('inventory_main_store')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (mainError) {
      console.error('❌ Error fetching main inventory:', mainError);
    } else {
      console.log(`   Total records: ${mainCount || 0}`);
      console.log(`   Sample records: ${mainInventory?.length || 0}`);
    }

    console.log('\n📊 INVENTORY_ACTIVE_STORE TABLE:');
    const { data: activeInventory, error: activeError, count: activeCount } = await supabase
      .from('inventory_active_store')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (activeError) {
      console.error('❌ Error fetching active inventory:', activeError);
    } else {
      console.log(`   Total records: ${activeCount || 0}`);
      console.log(`   Sample records: ${activeInventory?.length || 0}`);
    }

    // Summary
    console.log('\n✅ === DATA SUMMARY ===');
    console.log(`   Sales: ${salesCount || 0} records`);
    console.log(`   Expenses: ${expensesCount || 0} records`);
    console.log(`   Users: ${usersCount || 0} records`);
    console.log(`   Items: ${itemsCount || 0} records`);
    console.log(`   Main Store Inventory: ${mainCount || 0} records`);
    console.log(`   Active Store Inventory: ${activeCount || 0} records`);

    // Recommendations
    const recommendations: string[] = [];
    if ((salesCount || 0) === 0) recommendations.push('No sales data - create test sales');
    if ((expensesCount || 0) === 0) recommendations.push('No expenses data - create test expenses');
    if ((usersCount || 0) === 0) recommendations.push('No users data - create test users');
    if ((itemsCount || 0) === 0) recommendations.push('No items data - create test items');

    if (recommendations.length > 0) {
      console.log('\n📋 Recommendations:');
      recommendations.forEach(r => console.log(`   - ${r}`));
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

checkSupabaseData();
