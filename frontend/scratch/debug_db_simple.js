const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: creditors } = await supabase.from('creditors').select('id, full_name, unique_code');
  console.log('Creditors found:', creditors?.length);
  
  const { data: sales } = await supabase.from('credit_sales').select('creditor_id, total_amount, status');
  console.log('Sales found:', sales?.length);
  
  if (creditors && sales) {
    creditors.forEach(c => {
      const cSales = sales.filter(s => s.creditor_id === c.id);
      console.log(`Creditor ${c.unique_code} (${c.full_name}): ${cSales.length} sales. Total: ${cSales.reduce((acc, s) => acc + Number(s.total_amount), 0)}`);
    });
  }
}

checkData().catch(console.error);
