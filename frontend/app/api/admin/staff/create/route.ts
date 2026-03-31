import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { email, password, full_name, username, phone_number, role, store_location } =
      await req.json();

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const derivedUsername =
      username || email.split('@')[0].replace(/\./g, '_').toLowerCase();

    const insertData: any = {
      id: authData.user.id,
      auth_user_id: authData.user.id,
      email,
      full_name,
      username: derivedUsername,
      role,
      is_active: true,
      store_location: store_location || 'Jalingo',
    };
    if (phone_number) insertData.phone_number = phone_number;

    const { data: user, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([insertData])
      .select()
      .single();

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

    return NextResponse.json({ user, message: 'Staff created successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
