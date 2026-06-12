import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const isAdminUser = hasRole(authResult.role, 'admin', 'superadmin');

  const { data, error } = await supabaseAdmin
    .from('expense_categories')
    .select('id, name, is_built_in, scope, created_by, created_at')
    .order('is_built_in', { ascending: false })
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const filtered = (data || []).filter((cat: any) => {
    if (cat.is_built_in) {
      return cat.scope === 'all' || (isAdminUser ? cat.scope === 'admin' : cat.scope === 'staff');
    }
    return isAdminUser ? cat.scope === 'admin' : cat.scope === 'staff';
  });

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const isSuperadmin = authResult.role === 'superadmin';
    const scope = isSuperadmin || hasRole(authResult.role, 'admin') ? 'admin' : 'staff';

    const { data, error } = await supabaseAdmin
      .from('expense_categories')
      .insert({ name: name.trim(), is_built_in: false, scope, created_by: authResult.id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
