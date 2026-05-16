import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active') !== 'false';

  let query = supabaseAdmin.from('creditors').select('*');
  if (activeOnly) query = query.eq('is_active', true);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { full_name, phone_number, email, address } = body;

  if (!full_name?.trim()) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
  }

  const prefix = 'CR';
  const { count } = await supabaseAdmin.from('creditors').select('*', { count: 'exact', head: true });
  const uniqueCode = `${prefix}${String((count || 0) + 1).padStart(5, '0')}`;

  const { data, error } = await supabaseAdmin.from('creditors').insert({
    unique_code: uniqueCode,
    full_name: full_name.trim(),
    phone_number: phone_number?.trim() || null,
    email: email?.trim() || null,
    address: address?.trim() || null,
    added_by: authResult.id,
  }).select().single();

  if (error) {
    if (error.message?.includes('unique_code')) {
      const { count: retryCount } = await supabaseAdmin.from('creditors').select('*', { count: 'exact', head: true });
      const retryCode = `${prefix}${String((retryCount || 0) + 1).padStart(5, '0')}`;
      const { data: retryData, error: retryError } = await supabaseAdmin.from('creditors').insert({
        unique_code: retryCode,
        full_name: full_name.trim(),
        phone_number: phone_number?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        added_by: authResult.id,
      }).select().single();
      if (retryError) return NextResponse.json({ error: retryError.message }, { status: 400 });
      return NextResponse.json(retryData, { status: 201 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabaseAdmin.from('credit_activities').insert({
    creditor_id: data.id,
    staff_id: authResult.id,
    action: 'CREDITOR_CREATED',
    details: { full_name, unique_code: uniqueCode },
  });

  return NextResponse.json(data, { status: 201 });
}
