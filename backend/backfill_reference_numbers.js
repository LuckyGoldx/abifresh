const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

// Generate a unique reference number
function generateReferenceNumber(date, paymentId) {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  // Use first 8 chars of payment ID
  const idStr = paymentId.substring(0, 8).toUpperCase();
  return `PYMT-${dateStr}-${idStr}`;
}

async function backfillReferenceNumbers() {
  try {
    console.log('🔧 Backfill Reference Numbers for Payments\n');

    // Get all payments without reference numbers
    const { data: paymentsNeedingRef } = await supabaseAdmin
      .from('staff_payments')
      .select('id, staff_name, created_at, reference_number')
      .is('reference_number', null);

    console.log(`Found ${paymentsNeedingRef?.length || 0} payments without reference numbers\n`);

    if (!paymentsNeedingRef || paymentsNeedingRef.length === 0) {
      console.log('✅ All payments have reference numbers!');
      return;
    }

    let updated = 0;
    for (const payment of paymentsNeedingRef) {
      const createdDate = new Date(payment.created_at);
      const refNumber = generateReferenceNumber(createdDate, payment.id);

      const { error } = await supabaseAdmin
        .from('staff_payments')
        .update({ reference_number: refNumber })
        .eq('id', payment.id);

      if (error) {
        console.log(`❌ Payment ${payment.id}: ${error.message}`);
      } else {
        console.log(`✅ ${payment.staff_name}: Generated reference ${refNumber}`);
        updated++;
      }
    }

    console.log(`\n✅ Successfully updated: ${updated} payments`);

    // Show updated records
    console.log('\n📋 Sample of updated payments:');
    const { data: samples } = await supabaseAdmin
      .from('staff_payments')
      .select('id, staff_name, reference_number, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    (samples || []).forEach((p, idx) => {
      console.log(`[${idx + 1}] ${p.staff_name} | Reference: ${p.reference_number}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

backfillReferenceNumbers();
