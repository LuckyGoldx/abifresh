/**
 * Check commission data in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCommissionData() {
  console.log('\n🔍 === CHECKING COMMISSION DATA ===\n');

  try {
    // 1. Check commission staff
    console.log('👥 COMMISSION STAFF:');
    const { data: commissionStaff, error: staffError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .or('role.eq.staff_commission,role.eq.commission_staff');

    if (staffError) {
      console.error('❌ Error:', staffError);
    } else {
      console.log(`   Found: ${commissionStaff?.length || 0} commission staff`);
      commissionStaff?.forEach((staff, idx) => {
        console.log(`   ${idx + 1}. ${staff.full_name} (${staff.email}) - Role: ${staff.role}`);
      });
    }

    if (!commissionStaff || commissionStaff.length === 0) {
      console.log('   ⚠️ No commission staff found!');
      return;
    }

    // 2. Check receipts table
    console.log('\n📄 RECEIPTS TABLE:');
    const { data: receipts, error: receiptsError, count: receiptsCount } = await supabase
      .from('receipts')
      .select('*', { count: 'exact' })
      .limit(5);

    if (receiptsError) {
      console.log('   ⚠️ Error or table not found:', receiptsError.message);
    } else {
      console.log(`   Total receipts: ${receiptsCount || 0}`);
      if (receipts && receipts.length > 0) {
        console.log('   Sample:', receipts[0]);
      }
    }

    // 3. Check receipt_items table
    console.log('\n📦 RECEIPT_ITEMS TABLE:');
    const { data: receiptItems, error: itemsError, count: itemsCount } = await supabase
      .from('receipt_items')
      .select('*', { count: 'exact' })
      .limit(5);

    if (itemsError) {
      console.log('   ⚠️ Error or table not found:', itemsError.message);
    } else {
      console.log(`   Total items: ${itemsCount || 0}`);
      if (receiptItems && receiptItems.length > 0) {
        console.log('   Sample:', receiptItems[0]);
      }
    }

    // 4. Check sales table (alternative)
    console.log('\n🛒 SALES TABLE:');
    const { data: sales, error: salesError, count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .limit(5);

    if (salesError) {
      console.log('   ⚠️ Error or table not found:', salesError.message);
    } else {
      console.log(`   Total sales: ${salesCount || 0}`);
      if (sales && sales.length > 0) {
        console.log('   Sample:', sales[0]);
      }
    }

    // 5. Check items table for commission values
    console.log('\n💰 ITEMS WITH COMMISSION:');
    const { data: items, error: itemsCommError } = await supabase
      .from('items')
      .select('id, name, commission, unit_price')
      .limit(10);

    if (itemsCommError) {
      console.log('   ⚠️ Error:', itemsCommError.message);
    } else {
      console.log(`   Total items: ${items?.length || 0}`);
      items?.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name} - Commission: ₦${item.commission || 0}`);
      });
    }

    // 6. Check staff_payments for commission type
    console.log('\n💳 COMMISSION PAYMENTS:');
    const { data: payments, error: paymentsError, count: paymentsCount } = await supabase
      .from('staff_payments')
      .select('*', { count: 'exact' })
      .eq('payment_type', 'commission');

    if (paymentsError) {
      console.log('   ⚠️ Error:', paymentsError.message);
    } else {
      console.log(`   Total payments: ${paymentsCount || 0}`);
      if (payments && payments.length > 0) {
        console.log('   Sample:', payments[0]);
      }
    }

    // 7. Check for commission staff receipts
    if (commissionStaff && commissionStaff.length > 0) {
      console.log('\n📊 CHECKING COMMISSION STAFF SALES:');
      for (const staff of commissionStaff) {
        console.log(`\n   Staff: ${staff.full_name}`);
        
        // Check receipts
        const { data: staffReceipts, count: staffReceiptsCount } = await supabase
          .from('receipts')
          .select('*', { count: 'exact' })
          .eq('staff_id', staff.id);

        console.log(`   - Receipts: ${staffReceiptsCount || 0}`);

        // Check sales
        const { data: staffSales, count: staffSalesCount } = await supabase
          .from('sales')
          .select('*', { count: 'exact' })
          .eq('staff_id', staff.id);

        console.log(`   - Sales: ${staffSalesCount || 0}`);
      }
    }

    console.log('\n✅ === CHECK COMPLETE ===\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

checkCommissionData();
