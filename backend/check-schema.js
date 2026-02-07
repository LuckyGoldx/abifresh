const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cifzlkspxjghpgxhrwkg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzMDEzMCwiZXhwIjoyMDg0OTA2MTMwfQ.7Eg2j5-16Mr97DvRhipQ8XSq-BCkDcKiO5NRqkwfHm4'
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
