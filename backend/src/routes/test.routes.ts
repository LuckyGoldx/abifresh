import express from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = express.Router();

/**
 * Test endpoint to check database content without auth
 */
router.get('/test/db-inspect', async (req, res) => {
  try {
    console.log('\n🔍 === DATABASE INSPECTION ===\n');

    // Check users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5);
    
    console.log('👥 USERS TABLE:');
    console.log(`  Error: ${usersError?.message || 'None'}`);
    console.log(`  Count: ${users?.length || 0}`);
    if (users && users.length > 0) {
      users.forEach((u, i) => {
        console.log(`  [${i}] ${u.email} | Role: ${u.role} | ID: ${u.id?.substring(0, 8)}...`);
      });
    }

    // Check sales table
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('*')
      .limit(5);
    
    console.log('\n💰 SALES TABLE:');
    console.log(`  Error: ${salesError?.message || 'None'}`);
    console.log(`  Count: ${sales?.length || 0}`);
    if (sales && sales.length > 0) {
      sales.forEach((s, i) => {
        console.log(`  [${i}] Staff: ${s.staff_id?.substring(0, 8)}... | Amount: ${s.total_amount} | Date: ${s.created_at}`);
      });
    }

    // Check staff_expenses table
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('staff_expenses')
      .select('*')
      .limit(5);
    
    console.log('\n💸 STAFF_EXPENSES TABLE:');
    console.log(`  Error: ${expensesError?.message || 'None'}`);
    console.log(`  Count: ${expenses?.length || 0}`);
    if (expenses && expenses.length > 0) {
      expenses.forEach((e, i) => {
        console.log(`  [${i}] Staff: ${e.staff_id?.substring(0, 8)}... | Amount: ${e.expense_amount} | Date: ${e.created_at}`);
      });
    }

    // Check inventory tables
    const { data: mainInv, error: mainInvError } = await supabaseAdmin
      .from('inventory_main_store')
      .select('*')
      .limit(5);
    
    console.log('\n📦 INVENTORY_MAIN_STORE TABLE:');
    console.log(`  Error: ${mainInvError?.message || 'None'}`);
    console.log(`  Count: ${mainInv?.length || 0}`);

    const { data: activeInv, error: activeInvError } = await supabaseAdmin
      .from('inventory_active_store')
      .select('*')
      .limit(5);
    
    console.log('\n📦 INVENTORY_ACTIVE_STORE TABLE:');
    console.log(`  Error: ${activeInvError?.message || 'None'}`);
    console.log(`  Count: ${activeInv?.length || 0}`);

    // Check items table
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('*')
      .limit(5);
    
    console.log('\n🏷️  ITEMS TABLE:');
    console.log(`  Error: ${itemsError?.message || 'None'}`);
    console.log(`  Count: ${items?.length || 0}`);
    if (items && items.length > 0) {
      items.forEach((item, i) => {
        console.log(`  [${i}] ${item.name} | SKU: ${item.sku} | Price: ${item.unit_price}`);
      });
    }

    // Try a JOIN query to see if it works
    console.log('\n🔗 TESTING JOIN QUERY:');
    const { data: salesWithJoin, error: joinError } = await supabaseAdmin
      .from('sales')
      .select('id, total_amount, created_at, staff_id, users(id, full_name, email, role), items(id, name)')
      .limit(2);
    
    console.log(`  Error: ${joinError?.message || 'None'}`);
    console.log(`  Result count: ${salesWithJoin?.length || 0}`);
    if (salesWithJoin && salesWithJoin.length > 0) {
      console.log(`  Sample row:`, JSON.stringify(salesWithJoin[0], null, 2));
    }

    res.json({
      status: 'Database inspection complete',
      summary: {
        users_count: users?.length || 0,
        sales_count: sales?.length || 0,
        expenses_count: expenses?.length || 0,
        main_inv_count: mainInv?.length || 0,
        active_inv_count: activeInv?.length || 0,
        items_count: items?.length || 0,
      },
      raw_data: {
        users: users?.slice(0, 2),
        sales: sales?.slice(0, 2),
        expenses: expenses?.slice(0, 2),
        items: items?.slice(0, 2),
        joined_sales_sample: salesWithJoin?.slice(0, 1),
      },
    });
  } catch (error: any) {
    console.error('❌ Inspection error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
