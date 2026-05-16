const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wkyakaunbejmuzqnvgno.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY'
);

(async () => {
  console.log('=== Checking staff_payments schema ===');
  
  // Query without relationship
  const { data, error } = await supabase
    .from('staff_payments')
    .select('*')
    .limit(1);
  
  if (data && data.length > 0) {
    const payment = data[0];
    console.log('Sample payment:');
    console.log(JSON.stringify(payment, null, 2));
  }
  
  // Get staff info separately
  console.log('\n=== Looking up staff by ID ===');
  const paymentStaffId = data?.[0]?.staff_id;
  if (paymentStaffId) {
    const { data: staffData, error: staffError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('id', paymentStaffId)
      .single();
    
    if (staffError) {
      console.error('Error fetching staff:', staffError);
    } else {
      console.log('Staff info:', JSON.stringify(staffData, null, 2));
    }
  }
  
  process.exit(0);
})();
