import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function fixJaneCommission() {
  console.log('🔧 Fixing Jane commission payment...\n');

  // Get Jane's user ID
  const { data: janeUser } = await supabase
    .from('users')
    .select('id, email, full_name')
    .ilike('email', '%jane%')
    .single();

  if (!janeUser) {
    console.log('❌ Could not find Jane Smith');
    return;
  }

  console.log('👤 Found Jane:', janeUser.full_name, '(' + janeUser.email + ')');

  // Find the ₦10 commission payment
  const { data: tenNairaPayments } = await supabase
    .from('staff_payments')
    .select('*')
    .eq('staff_id', janeUser.id)
    .eq('amount', 10)
    .order('created_at', { ascending: false });

  console.log('\n💰 Found', tenNairaPayments?.length || 0, 'payment(s) of ₦10 for Jane:');
  
  for (const payment of tenNairaPayments || []) {
    console.log(`
  ID: ${payment.id}
  Amount: ₦${payment.amount}
  Status: ${payment.status}
  Type: ${payment.payment_type}
  Created: ${payment.created_at}
    `);

    // If status is 'approved' and type is NOT 'commission', update it
    if (payment.status === 'approved' && payment.payment_type !== 'commission') {
      console.log('  → Updating to payment_type = "commission"...');
      const { error } = await supabase
        .from('staff_payments')
        .update({ payment_type: 'commission' })
        .eq('id', payment.id);

      if (error) {
        console.log('  ❌ Error:', error.message);
      } else {
        console.log('  ✅ Updated successfully!');
      }
    }
  }
}

fixJaneCommission().catch(console.error);
