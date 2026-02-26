const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

async function backfillAllPaymentPhones() {
  try {
    console.log('🔧 Backfill all payment phone numbers\n');

    // Get all payments with null phone
    const { data: paymentsNeedingPhone } = await supabaseAdmin
      .from('staff_payments')
      .select('id, staff_id, staff_phone')
      .is('staff_phone', null);

    console.log(`Found ${paymentsNeedingPhone?.length || 0} payments with null phone\n`);

    if (!paymentsNeedingPhone || paymentsNeedingPhone.length === 0) {
      console.log('✅ No payments need phone update!');
      return;
    }

    // Get staff phone numbers
    const staffIds = paymentsNeedingPhone.map(p => p.staff_id);
    const { data: staffPhones } = await supabaseAdmin
      .from('users')
      .select('id, phone_number');

    const phoneMap = {};
    (staffPhones || []).forEach(s => {
      phoneMap[s.id] = s.phone_number;
    });

    // Update each payment
    let updated = 0;
    for (const payment of paymentsNeedingPhone) {
      const phone = phoneMap[payment.staff_id];
      if (!phone) {
        console.log(`⚠️  Payment ${payment.id}: Staff has no phone number`);
        continue;
      }

      const { error } = await supabaseAdmin
        .from('staff_payments')
        .update({ staff_phone: phone })
        .eq('id', payment.id);

      if (error) {
        console.log(`❌ Payment ${payment.id}: ${error.message}`);
      } else {
        console.log(`✅ Payment ${payment.id}: Phone updated to ${phone}`);
        updated++;
      }
    }

    console.log(`\n✅ Successfully updated: ${updated} payments`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

backfillAllPaymentPhones();
