#!/usr/bin/env node

/**
 * Populate auth_user_id for existing users
 * 
 * This script:
 * 1. Fetches all users from public.users
 * 2. For each user, searches auth by email to find their auth UUID
 * 3. Updates the new auth_user_id column
 * 4. Logs results and any users that couldn't be matched
 * 
 * Safe: No passwords touched, no data deleted, just adds mappings
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false, autoRefreshToken: false },
});

interface DBUser {
  id: string;
  email: string;
  full_name: string;
}

interface AuthUser {
  id: string;
  email?: string;
}

interface AuthUsersResponse {
  users?: AuthUser[];
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
  // Try GoTrue filter endpoint first (most reliable)
  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=10`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );
    if (res.ok) {
      const body = (await res.json()) as AuthUsersResponse;
      const match = (body?.users || []).find(
        (u: AuthUser) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (match) return match.id;
    }
  } catch (e) {
    // fall through to paginated search
  }

  // Fallback: paginated search
  for (let page = 1; page <= 20; page++) {
    const { data: pageData, error: pageErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
    if (pageErr || !pageData) break;
    const found = (pageData.users || []).find(
      (u: AuthUser) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found.id;
    if (pageData.users.length < 50) break;
  }

  return null;
}

async function main() {
  console.log('🔍 Fetching all users from public.users...\n');

  const { data: allUsers, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name');

  if (fetchErr || !allUsers) {
    console.error('❌ Failed to fetch users:', fetchErr);
    process.exit(1);
  }

  console.log(`📋 Found ${allUsers.length} users to process\n`);

  let matched = 0;
  let unmatched: DBUser[] = [];
  let errors: Array<{ user: DBUser; error: string }> = [];

  for (const user of allUsers as DBUser[]) {
    process.stdout.write(`Processing ${user.full_name} (${user.email})... `);

    try {
      const authUserId = await findAuthUserByEmail(user.email);

      if (authUserId) {
        const { error: updateErr } = await supabaseAdmin
          .from('users')
          .update({ auth_user_id: authUserId })
          .eq('id', user.id);

        if (updateErr) {
          console.log('❌ UPDATE ERROR');
          errors.push({ user, error: updateErr.message });
        } else {
          console.log('✅');
          matched++;
        }
      } else {
        console.log('⚠️  NOT FOUND IN AUTH');
        unmatched.push(user);
      }
    } catch (e: any) {
      console.log('❌ ERROR');
      errors.push({ user, error: e.message });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Matched: ${matched}/${allUsers.length}`);
  console.log(`⚠️  Unmatched (no auth account): ${unmatched.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (unmatched.length > 0) {
    console.log('📌 Users without matching auth accounts:');
    unmatched.forEach((u) => {
      console.log(`   - ${u.full_name} (${u.email}) [ID: ${u.id}]`);
    });
    console.log(
      '\n💡 These users exist in the database but not in Supabase Auth.\n' +
      '   They can still have passwords set via /admin/staff — new auth accounts will be created.\n'
    );
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors during update:');
    errors.forEach(({ user, error }) => {
      console.log(`   - ${user.full_name} (${user.email}): ${error}`);
    });
  }

  console.log(`\n✨ Migration complete!\n`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
