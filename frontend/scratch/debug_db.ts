import { supabaseAdmin } from '../lib/server/supabase-admin';

async function checkData() {
  const { data: creditors } = await supabaseAdmin.from('creditors').select('*');
  console.log('Creditors:', creditors?.map(c => ({ id: c.id, name: c.full_name, code: c.unique_code })));

  const { data: sales } = await supabaseAdmin.from('credit_sales').select('*');
  console.log('Total Sales:', sales?.length);
  console.log('Sales sample:', sales?.slice(0, 5).map(s => ({ creditor_id: s.creditor_id, amount: s.total_amount, status: s.status })));

  const { data: payments } = await supabaseAdmin.from('credit_payments').select('*');
  console.log('Total Payments:', payments?.length);
}

checkData();
