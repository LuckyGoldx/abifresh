const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Backfill Payment Staff Info Script');
console.log('=====================================');

const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

async function backfillPaymentStaffInfo() {
  try {
    console.log('\n1️⃣ Checking how many payments need staff_name update...');
    
    // Check payments with null staff_name
    const { data: paymentsNeedingUpdate, error: checkError } = await supabaseAdmin
      .from('staff_payments')
      .select('id, staff_id, staff_name, staff_phone')
      .or('staff_name.is.null,staff_name.eq.Unknown');

    if (checkError) {
      console.error('❌ Error checking payments:', checkError);
      return;
    }

    console.log(`   Found ${paymentsNeedingUpdate?.length || 0} payments with null/unknown staff_name`);

    if (!paymentsNeedingUpdate || paymentsNeedingUpdate.length === 0) {
      console.log('   ✅ No payments need updating!');
      return;
    }

    // Get all unique staff_ids
    const staffIds = [...new Set(paymentsNeedingUpdate.map(p => p.staff_id))];
    console.log(`   These are from ${staffIds.length} unique staff members\n`);

    // Fetch staff info
    const { data: staffMembers, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone_number')
      .in('id', staffIds);

    if (staffError) {
      console.error('❌ Error fetching staff info:', staffError);
      return;
    }

    console.log('2️⃣ Fetched staff info, now updating payments...\n');

    // Create a map of staff by ID
    const staffMap = {};
    (staffMembers || []).forEach(staff => {
      staffMap[staff.id] = staff;
    });

    // Update each payment
    let updated = 0;
    for (const payment of paymentsNeedingUpdate) {
      const staff = staffMap[payment.staff_id];
      if (!staff) {
        console.log(`   ⚠️  Payment ${payment.id}: No staff info found for ID ${payment.staff_id}`);
        continue;
      }

      // Update payment with staff info
      const { error: updateError } = await supabaseAdmin
        .from('staff_payments')
        .update({
          staff_name: staff.full_name,
          staff_phone: staff.phone_number,
        })
        .eq('id', payment.id);

      if (updateError) {
        console.log(`   ❌ Payment ${payment.id}: ${updateError.message}`);
      } else {
        console.log(`   ✅ Payment ${payment.id}: Updated with ${staff.full_name} (${staff.phone_number || 'no phone'})`);
        updated++;
      }
    }

    console.log(`\n3️⃣ Update Summary:`);
    console.log(`   ✅ Successfully updated: ${updated} payments`);
    console.log(`   ⚠️  Failed/Skipped: ${paymentsNeedingUpdate.length - updated} payments\n`);

    // Show updated records
    console.log('4️⃣ Sample of updated payments:');
    const { data: samplePayments } = await supabaseAdmin
      .from('staff_payments')
      .select('id, staff_id, staff_name, staff_phone, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    (samplePayments || []).forEach((p, idx) => {
      console.log(`   [${idx + 1}] ${p.staff_name} | Phone: ${p.staff_phone || 'N/A'} | ₦${p.amount} | Status: ${p.status}`);
    });

    console.log('\n✨ Backfill complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

backfillPaymentStaffInfo();
