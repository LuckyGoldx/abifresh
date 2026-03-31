import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { full_name, username, email, phone_number, role, store_location, password } =
      await req.json();
    const { id } = params;

    // Verify user exists
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_user_id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const oldEmail = existing.email as string;
    const newEmail = email as string | undefined;
    let newAuthUserId: string | null = null; // Track any newly-created auth UUID

    // Step 1: Sync auth FIRST (before updating profile) to avoid out-of-sync state
    // Find the auth user: prefer direct UUID if available, fall back to email search
    if (newEmail || password) {
      let authUserId: string | null = existing.auth_user_id || null;

      // If we have the cached auth UUID, use it directly — much faster and more reliable
      // Skip all the email-based searches
      if (!authUserId) {
        // Fallback for unmapped users (legacy or not yet populated): email-based search

        // Step 1a: Try getUserById, but only accept if email matches (proves it's the right account)
        const { data: authByIdData } = await supabaseAdmin.auth.admin.getUserById(id);
        if (authByIdData?.user?.email?.toLowerCase() === oldEmail.toLowerCase()) {
          authUserId = authByIdData.user.id;
        }

        // Step 1b: GoTrue admin REST filter search by email (most reliable)
        if (!authUserId) {
          try {
            const supabaseUrl = process.env.SUPABASE_URL!;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
            const res = await fetch(
              `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(oldEmail)}&per_page=10`,
              {
                headers: {
                  apikey: serviceKey,
                  Authorization: `Bearer ${serviceKey}`,
                },
              }
            );
            if (res.ok) {
              const body = await res.json();
              const match = (body?.users || []).find(
                (u: any) => u.email?.toLowerCase() === oldEmail.toLowerCase()
              );
              if (match) authUserId = match.id;
            }
          } catch {
            // ignore; fall through to paginated search
          }
        }

        // Step 1c: paginated listUsers fallback
        if (!authUserId) {
          for (let page = 1; page <= 20; page++) {
            const { data: pageData, error: pageErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
            if (pageErr || !pageData) break;
            const found = (pageData.users || []).find(
              (u: any) => u.email?.toLowerCase() === oldEmail.toLowerCase()
            );
            if (found) { authUserId = found.id; break; }
            if (pageData.users.length < 50) break;
          }
        }
      }

      // Step 2: Update auth user (email and/or password)
      if (authUserId) {
        const authUpdateData: any = {};
        if (newEmail && newEmail.toLowerCase() !== oldEmail.toLowerCase()) {
          authUpdateData.email = newEmail;
        }
        if (password) {
          if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
          }
          authUpdateData.password = password;
        }

        if (Object.keys(authUpdateData).length > 0) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, authUpdateData);
          if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
        }
      } else {
        // No auth user found — create one if password is provided
        if (password) {
          if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
          }
          const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: newEmail || oldEmail,
            password,
            email_confirm: true,
          });
          if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });
          // Capture the newly-created auth UUID and store it in authUserId for update below
          if (createData?.user?.id) {
            authUserId = createData.user.id;
            newAuthUserId = createData.user.id; // Track to store in DB
          }
        }
      }
    }

    // Step 3: Build profile update
    const updateData: any = {};
    if (full_name) updateData.full_name = full_name;
    if (username) updateData.username = username.toLowerCase();
    if (newEmail) updateData.email = newEmail;
    if (phone_number) updateData.phone_number = phone_number;
    if (role) updateData.role = role;
    if (store_location) updateData.store_location = store_location;
    if (newAuthUserId) updateData.auth_user_id = newAuthUserId; // Store newly-created auth UUID

    const { error: profileErr } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id);

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });

    return NextResponse.json({
      message: password ? 'Staff updated and password changed successfully' : 'Staff updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = params;

  // Verify user exists
  const { data: user, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, auth_user_id')
    .eq('id', id)
    .single();

  if (fetchErr || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Clean up related records safely
  const tables = [
    { table: 'notifications', col: 'user_id' },
    { table: 'activity_logs', col: 'user_id' },
    { table: 'staff_payments', col: 'staff_id' },
    { table: 'staff_expenses', col: 'staff_id' },
    { table: 'staff_commissions', col: 'staff_id' },
    { table: 'staff_store', col: 'staff_id' },
    { table: 'posted_items', col: 'staff_id' },
    { table: 'sales', col: 'staff_id' },
    { table: 'daily_sales_summary', col: 'salesperson_id' },
  ];

  for (const { table, col } of tables) {
    await supabaseAdmin.from(table).delete().eq(col, id);
  }

  // Delete user profile
  await supabaseAdmin.from('users').delete().eq('id', id);

  // Delete from Supabase Auth — use cached UUID if available, fallback to email search
  let authDeleteId: string | null = user.auth_user_id || null;

  if (!authDeleteId) {
    // Fallback for unmapped users: email-based search
    for (let pg = 1; pg <= 20; pg++) {
      const { data: pd } = await supabaseAdmin.auth.admin.listUsers({ page: pg, perPage: 50 });
      if (!pd) break;
      const found = (pd.users || []).find((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase());
      if (found) { authDeleteId = found.id; break; }
      if (pd.users.length < 50) break;
    }
  }

  if (authDeleteId) {
    await supabaseAdmin.auth.admin.deleteUser(authDeleteId);
  }

  return NextResponse.json({ message: 'Staff deleted successfully' });
}
