const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRemittance() {
  const ref = 'CR-RM-20260513-IL2SY3';
  
  console.log(`Searching for remittance: ${ref}`);
  
  const { data, error } = await supabase
    .from('staff_payments')
    .select('*')
    .eq('reference_number', ref)
    .single();
    
  if (error) {
    console.error('Error fetching remittance:', error);
  } else {
    console.log('Remittance found:', JSON.stringify(data, null, 2));
  }
}

debugRemittance();
