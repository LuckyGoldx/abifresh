const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
  const { count, error } = await supabase
    .from('credit_sales')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error fetching count:', error);
  } else {
    console.log('Total credit sales count:', count);
  }
}

checkCount();
