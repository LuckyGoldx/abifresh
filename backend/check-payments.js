const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wkyakaunbejmuzqnvgno.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY'
);

(async () => {
  console.log('=== Querying staff_payments table ===');
  const { data, error } = await supabase
    .from('staff_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data?.length} payments:\n`);
    if (data && data.length > 0) {
      data.forEach(p => {
        console.log(`Payment ID: ${p.id}`);
        console.log(`  Staff ID: ${p.staff_id}`);
        console.log(`  Amount: ${p.amount}`);
        console.log(`  Status: ${p.status}`);
        console.log(`  Created: ${p.created_at}`);
        console.log('---');
      });
    } else {
      console.log('No payments found!');
    }
  }
  
  // Also check with relationships
  console.log('\n=== Querying with staff relationship ===');
  const { data: dataWithStaff, error: errorWithStaff } = await supabase
    .from('staff_payments')
    .select(`*,staff:staff_id(id, full_name, email, role)`)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (errorWithStaff) {
    console.error('Error:', errorWithStaff);
  } else {
    console.log(`Found ${dataWithStaff?.length} payments with relationships:\n`);
    if (dataWithStaff && dataWithStaff.length > 0) {
      dataWithStaff.forEach(p => {
        console.log(`Payment ID: ${p.id}`);
        console.log(`  Staff: ${p.staff?.full_name} (${p.staff?.email})`);
        console.log(`  Amount: ${p.amount}`);
        console.log(`  Status: ${p.status}`);
        console.log(`  Notes: ${p.notes}`);
        console.log('---');
      });
    }
  }
  
  process.exit(0);
})();
