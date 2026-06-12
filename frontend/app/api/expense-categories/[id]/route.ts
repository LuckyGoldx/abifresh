import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch the category to check permissions
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('expense_categories')
      .select('id, is_built_in')
      .eq('id', params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Admin can only rename custom categories; superadmin can rename any
    if (existing.is_built_in && !hasRole(authResult.role, 'superadmin')) {
      return NextResponse.json({ error: 'Only superadmin can rename built-in categories' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('expense_categories')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
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
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('expense_categories')
    .select('id, is_built_in')
    .eq('id', params.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  if (existing.is_built_in) {
    return NextResponse.json({ error: 'Cannot delete built-in categories' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('expense_categories')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: 'Category deleted' });
}
