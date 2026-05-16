import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
  console.log('🔍 Checking users in Supabase...\n');

  // Get all users
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, username, full_name, role, is_active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching users:', error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No users found in the database!');
    return;
  }

  console.log(`✅ Found ${users.length} users:\n`);
  console.table(users);
}

checkUsers();
