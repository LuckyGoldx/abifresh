const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

async function checkPaymentFields() {
  try {
    console.log('🔍 Checking payment records...\n');

    const { data: payments } = await supabaseAdmin
      .from('staff_payments')
      .select('id, staff_name, staff_phone, reference_number, receipt_url, items_paid_for, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Recent Payments:\n');
    (payments || []).forEach((p, idx) => {
      console.log(`[${idx + 1}] ID: ${p.id}`);
      console.log(`    Staff: ${p.staff_name} | Phone: ${p.staff_phone || 'NULL'}`);
      console.log(`    Reference: ${p.reference_number || 'NULL'} | Receipt: ${p.receipt_url ? 'YES' : 'NO'}`);
      console.log(`    Items: ${p.items_paid_for ? JSON.stringify(p.items_paid_for).substring(0, 50) : 'NULL'}`);
      console.log(`    Created: ${p.created_at}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPaymentFields();
