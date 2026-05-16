// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wkyakaunbejmuzqnvgno.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjYzMDIsImV4cCI6MjA5Mzk0MjMwMn0.bCkj6hvZcOkXziajxADs_l3h1HJLHMGj3Ux_vKS-8W0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSalesStaff() {
  console.log('🔍 Checking users in Supabase...\n');

  // Get all users
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .order('role');

  if (allError) {
    console.error('❌ Error fetching all users:', allError);
    return;
  }

  console.log(`✅ Total users: ${allUsers?.length || 0}`);
  console.log('All users:');
  allUsers?.forEach((u) => {
    console.log(`   - ${u.email.padEnd(25)} | Role: "${u.role.padEnd(20)}" | Name: ${u.full_name}`);
  });

  // Get unique roles
  const uniqueRoles = Array.from(new Set(allUsers?.map(u => u.role) || []));
  console.log(`\n📋 Unique roles found: ${uniqueRoles.join(', ')}`);

  // Query for sales staff
  console.log('\n🔍 Looking for users with role IN ["sales", "sales_staff"]...');
  const { data: salesUsers, error: salesError } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .in('role', ['sales', 'sales_staff']);

  if (salesError) {
    console.error('❌ Error fetching sales staff:', salesError);
    return;
  }

  console.log(`✅ Found ${salesUsers?.length || 0} sales staff:`);
  salesUsers?.forEach((u) => {
    console.log(`   - ${u.email.padEnd(25)} | Role: "${u.role}" | Name: ${u.full_name}`);
  });

  if ((salesUsers?.length || 0) === 0) {
    console.log('\n⚠️  No sales staff found with role "sales" or "sales_staff"');
    console.log('Available roles in system:', uniqueRoles);
    console.log('\nTrying alternative queries...');

    // Try each unique role to see which one has sales staff
    for (const role of uniqueRoles) {
      const { data: usersWithRole } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('role', role);

      console.log(`\n   Role "${role}": ${usersWithRole?.length || 0} users`);
      usersWithRole?.forEach((u) => {
        console.log(`      - ${u.email.padEnd(25)} | ${u.full_name}`);
      });
    }
  }
}

checkSalesStaff().catch(console.error);
