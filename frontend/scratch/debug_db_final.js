const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: creditors } = await supabase.from('creditors').select('id, full_name, unique_code');
  console.log('Creditors found:', creditors?.length);
  
  const { data: sales } = await supabase.from('credit_sales').select('creditor_id, total_amount, status');
  console.log('Sales found:', sales?.length);
  
  if (creditors && sales) {
    creditors.forEach(c => {
      const cSales = sales.filter(s => s.creditor_id === c.id);
      const total = cSales.reduce((acc, s) => acc + Number(s.total_amount), 0);
      const nonCancelled = cSales.filter(s => s.status !== 'cancelled');
      const totalNonCancelled = nonCancelled.reduce((acc, s) => acc + Number(s.total_amount), 0);
      console.log(`Creditor ${c.unique_code} (${c.full_name}): ${cSales.length} sales. Total: ${total}. Non-cancelled: ${nonCancelled.length}. Total Non-cancelled: ${totalNonCancelled}`);
    });
  }
}

checkData().catch(console.error);
