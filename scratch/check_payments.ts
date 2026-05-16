import { supabaseAdmin } from './frontend/lib/server/supabase-admin';

async function checkData() {
  const { data, error } = await supabaseAdmin
    .from('credit_payments')
    .select('*, creditors(full_name)')
    .limit(5);
  
  console.log('Payments:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

checkData();
