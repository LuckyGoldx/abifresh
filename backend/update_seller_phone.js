const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

async function updateSellerPhone() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ phone_number: '08123456789' })
      .eq('email', 'seller@abifresh.com')
      .select();

    if (error) {
      console.error('❌ Error updating phone:', error);
      return;
    }

    console.log('✅ Updated seller phone number:');
    console.log('   Email:', data?.[0]?.email);
    console.log('   Name:', data?.[0]?.full_name);
    console.log('   Phone:', data?.[0]?.phone_number);
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

updateSellerPhone();
