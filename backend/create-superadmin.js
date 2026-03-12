require('dotenv').config();
const { supabaseAdmin } = require('./dist/config/supabase');

async function createSuperAdmin() {
  try {
    // First, try to delete existing user if it exists
    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const lucky = existingUser.users.find(u => u.email === 'lucky@abifresh.com');
      
      if (lucky) {
        console.log('🗑️  Found existing user, deleting...');
        await supabaseAdmin.auth.admin.deleteUser(lucky.id);
        console.log('✅ Old auth user deleted');
      }
    } catch (err) {
      console.log('ℹ️  No existing user found or error checking:', err.message);
    }
    
    // Create auth user
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'lucky@abifresh.com',
      password: '#ebuka5788',
      email_confirm: true,
      user_metadata: {
        full_name: 'Lucky - Superadmin'
      }
    });
    
    if (error) {
      console.error('❌ Error creating auth user:', error);
      return;
    }
    
    console.log('✅ Auth user created:', user.user.id);
    
    // Delete old profile if exists
    await supabaseAdmin
      .from('public.users')
      .delete()
      .eq('email', 'lucky@abifresh.com');
    
    console.log('✅ Old profile deleted');
    
    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('public.users')
      .insert({
        id: user.user.id,
        email: 'lucky@abifresh.com',
        full_name: 'Lucky - Superadmin',
        username: 'lucky',
        role: 'superadmin',
        is_active: true,
        store_location: 'Jalingo'
      })
      .select();
    
    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return;
    }
    
    console.log('✅ Profile created:', profile);
    console.log('\n✅✅✅ SUPERADMIN CREATED SUCCESSFULLY! ✅✅✅');
    console.log('Username: lucky');
    console.log('Password: #ebuka5788');
    console.log('\nNow try logging in at http://localhost:3000/login');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

createSuperAdmin();
