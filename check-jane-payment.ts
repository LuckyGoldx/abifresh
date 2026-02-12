import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkPayment() {
  console.log('🔍 Checking Jane Smith commission payment...\n');

  // Get Jane's user ID first
  const { data: janeUser } = await supabase
    .from('users')
    .select('id, email, full_name')
    .ilike('email', '%jane%')
    .single();

  console.log('👤 Jane User:', janeUser);

  if (!janeUser) {
    console.log('❌ Could not find Jane Smith');
    return;
  }

  // Get all payments for Jane
  const { data: payments } = await supabase
    .from('staff_payments')
    .select('*')
    .eq('staff_id', janeUser.id)
    .order('created_at', { ascending: false });

  console.log('\n💰 All payments for Jane:');
  payments?.forEach((p: any) => {
    console.log(`
  ID: ${p.id}
  Amount: ₦${p.amount}
  Payment Type: ${p.payment_type}
  Status: ${p.status}
  Created: ${p.created_at}
    `);
  });

  // Specifically look for ₦10
  const tenNairaPayment = payments?.find((p: any) => p.amount === 10);
  if (tenNairaPayment) {
    console.log('\n✅ Found ₦10 payment:');
    console.log(JSON.stringify(tenNairaPayment, null, 2));
  } else {
    console.log('\n❌ No ₦10 payment found for Jane');
  }
}

checkPayment().catch(console.error);
