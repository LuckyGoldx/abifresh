const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('credit_sale_items').select('*').limit(1);
  if (error) console.error(error);
  else console.log('Columns:', Object.keys(data[0] || {}));
}

checkSchema();
