const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugReceipt() {
  const receiptNumber = 'CR-1778522369330';
  
  console.log(`Searching for receipt: ${receiptNumber}`);
  
  const { data: sale, error } = await supabase
    .from('credit_sales')
    .select('*, credit_sale_items(*)')
    .eq('receipt_number', receiptNumber)
    .single();
    
  if (error) {
    console.error('Error fetching sale:', error);
  } else {
    console.log('Sale found:', JSON.stringify(sale, null, 2));
  }
}

debugReceipt();
