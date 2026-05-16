const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: creditors } = await supabase.from('creditors').select('id, full_name, unique_code');
  const { data: sales } = await supabase.from('credit_sales').select('id, creditor_id, total_amount, status');
  
  if (creditors && sales) {
    const musa = creditors.find(c => c.unique_code === 'CR00001');
    console.log('Musa ID:', musa.id);
    const musaSales = sales.filter(s => s.creditor_id === musa.id);
    console.log('Musa sales count (direct filter):', musaSales.length);
    
    if (sales.length > 0) {
        console.log('First sale creditor_id:', sales[0].creditor_id);
        console.log('Type of first sale creditor_id:', typeof sales[0].creditor_id);
        console.log('Type of Musa ID:', typeof musa.id);
    }
  }
}

checkData().catch(console.error);
