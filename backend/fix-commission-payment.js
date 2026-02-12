/**
 * Script to fix incorrect commission payment for commission@abifresh.com
 * Run with: node fix-commission-payment.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCommissionPayment() {
  console.log('\n🔧 === FIXING COMMISSION PAYMENT ===\n');

  try {
    // Step 1: Get the staff user ID
    console.log('📝 Step 1: Finding staff user...');
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('email', 'commission@abifresh.com')
      .single();

    if (staffError || !staff) {
      console.error('❌ Error finding staff:', staffError);
      return;
    }

    console.log(`✅ Found staff: ${staff.full_name} (${staff.email})`);

    // Step 2: Calculate total commission from staff_sales
    console.log('\n📊 Step 2: Calculating total commission from staff_sales...');
    const { data: salesData, error: salesError } = await supabase
      .from('staff_sales')
      .select('quantity, total_amount, items:item_id(commission)')
      .eq('staff_id', staff.id);

    if (salesError) {
      console.error('❌ Error fetching staff sales:', salesError);
      return;
    }

    let totalCommissionGenerated = 0;
    let totalSales = 0;
    let itemsSold = 0;

    if (salesData && salesData.length > 0) {
      salesData.forEach((sale) => {
        const quantity = sale.quantity || 0;
        const commissionPerUnit = sale.items?.commission || 0;
        
        totalSales += sale.total_amount || 0;
        itemsSold += quantity;
        totalCommissionGenerated += commissionPerUnit * quantity;
      });
    }

    console.log(`   Total commission generated: ₦${totalCommissionGenerated.toLocaleString()}`);
    console.log(`   Total sales: ₦${totalSales.toLocaleString()}`);
    console.log(`   Items sold: ${itemsSold}`);

    // Step 3: Get current payments
    console.log('\n💰 Step 3: Getting current payments...');
    const { data: currentPayments, error: currentPaymentsError } = await supabase
      .from('staff_payments')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('payment_type', 'commission');

    if (currentPaymentsError) {
      console.error('❌ Error fetching payments:', currentPaymentsError);
    } else {
      const totalCurrentPaid = currentPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      console.log(`   Current total paid: ₦${totalCurrentPaid.toLocaleString()}`);
      console.log(`   Number of payment records: ${currentPayments?.length || 0}`);
      
      if (currentPayments && currentPayments.length > 0) {
        console.log('\n   Recent payments:');
        currentPayments.slice(0, 5).forEach((payment) => {
          console.log(`   - ID: ${payment.id}, Amount: ₦${payment.amount.toLocaleString()}, Date: ${new Date(payment.created_at).toLocaleString()}`);
        });
      }
    }

    // Step 4: Delete incorrect payment records from today
    console.log('\n🗑️  Step 4: Deleting incorrect payment records from today...');
    const { data: deletedPayments, error: deleteError } = await supabase
      .from('staff_payments')
      .delete()
      .eq('staff_id', staff.id)
      .eq('payment_type', 'commission')
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .select();

    if (deleteError) {
      console.error('❌ Error deleting payments:', deleteError);
    } else {
      console.log(`✅ Deleted ${deletedPayments?.length || 0} payment record(s)`);
      if (deletedPayments && deletedPayments.length > 0) {
        deletedPayments.forEach((payment) => {
          console.log(`   - Payment ID: ${payment.id}, Amount: ₦${payment.amount.toLocaleString()}`);
        });
      }
    }

    // Step 5: Verify the fix
    console.log('\n✅ Step 5: Verifying fix...');
    const { data: finalPayments, error: finalError } = await supabase
      .from('staff_payments')
      .select('amount')
      .eq('staff_id', staff.id)
      .eq('payment_type', 'commission');

    if (finalError) {
      console.error('❌ Error verifying:', finalError);
      return;
    }

    const finalTotalPaid = finalPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const pendingCommission = totalCommissionGenerated - finalTotalPaid;

    console.log('\n📋 FINAL STATUS:');
    console.log(`   Staff: ${staff.full_name} (${staff.email})`);
    console.log(`   Commission Generated: ₦${totalCommissionGenerated.toLocaleString()}`);
    console.log(`   Commission Paid: ₦${finalTotalPaid.toLocaleString()}`);
    console.log(`   Pending Commission: ₦${pendingCommission.toLocaleString()}`);
    console.log('\n✅ Fix completed successfully!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixCommissionPayment();
