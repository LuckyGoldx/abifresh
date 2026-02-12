/**
 * Script to fix incorrect commission payment for commission@abifresh.com
 * Run with: npx ts-node fix-commission-payment.ts
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

async function fixCommissionPayment() {
  console.log('\n🔧 === FIXING COMMISSION PAYMENT ===\n');

  try {
    // Step 1: Get the staff user ID
    console.log('📝 Step 1: Finding staff user...');
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('id, name, email, commission_paid')
      .eq('email', 'commission@abifresh.com')
      .single();

    if (staffError || !staff) {
      console.error('❌ Error finding staff:', staffError);
      return;
    }

    console.log(`✅ Found staff: ${staff.name} (${staff.email})`);
    console.log(`   Current commission_paid: ₦${staff.commission_paid.toLocaleString()}`);

    // Step 2: Calculate total commission from staff_sales
    console.log('\n📊 Step 2: Calculating total commission from staff_sales...');
    const { data: salesData, error: salesError } = await supabase
      .from('staff_sales')
      .select('commission_amount')
      .eq('staff_id', staff.id);

    if (salesError) {
      console.error('❌ Error fetching staff sales:', salesError);
      return;
    }

    const totalCommissionGenerated = salesData?.reduce((sum, sale) => sum + (sale.commission_amount || 0), 0) || 0;
    console.log(`   Total commission generated: ₦${totalCommissionGenerated.toLocaleString()}`);
    console.log(`   Expected pending commission: ₦${totalCommissionGenerated.toLocaleString()}`);

    // Step 3: Delete incorrect payment records from today
    console.log('\n🗑️  Step 3: Deleting incorrect payment records...');
    const { data: deletedPayments, error: deleteError } = await supabase
      .from('commission_payments')
      .delete()
      .eq('staff_id', staff.id)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .select();

    if (deleteError) {
      console.error('❌ Error deleting payments:', deleteError);
    } else {
      console.log(`✅ Deleted ${deletedPayments?.length || 0} payment record(s)`);
      if (deletedPayments && deletedPayments.length > 0) {
        deletedPayments.forEach((payment: any) => {
          console.log(`   - Payment ID: ${payment.id}, Amount: ₦${payment.amount.toLocaleString()}`);
        });
      }
    }

    // Step 4: Reset commission_paid to 0
    console.log('\n♻️  Step 4: Resetting commission_paid to 0...');
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ commission_paid: 0 })
      .eq('email', 'commission@abifresh.com')
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }

    console.log('✅ Successfully reset commission_paid to 0');

    // Step 5: Verify the fix
    console.log('\n✅ Step 5: Verifying fix...');
    const { data: verifyStaff, error: verifyError } = await supabase
      .from('users')
      .select('id, name, email, commission_paid')
      .eq('email', 'commission@abifresh.com')
      .single();

    if (verifyError || !verifyStaff) {
      console.error('❌ Error verifying:', verifyError);
      return;
    }

    const pendingCommission = totalCommissionGenerated - verifyStaff.commission_paid;

    console.log('\n📋 FINAL STATUS:');
    console.log(`   Staff: ${verifyStaff.name} (${verifyStaff.email})`);
    console.log(`   Commission Generated: ₦${totalCommissionGenerated.toLocaleString()}`);
    console.log(`   Commission Paid: ₦${verifyStaff.commission_paid.toLocaleString()}`);
    console.log(`   Pending Commission: ₦${pendingCommission.toLocaleString()}`);
    console.log('\n✅ Fix completed successfully!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixCommissionPayment();
