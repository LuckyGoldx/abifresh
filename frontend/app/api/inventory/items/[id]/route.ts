import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const SELECT_FIELDS = `
  id, name, sku, category, unit_price, commission,
  active_store_quantity, main_store_quantity, is_available,
  created_at, updated_at, brand, package_type,
  price_jalingo, price_outside, image_url
`;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('items')
    .select(SELECT_FIELDS)
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  return NextResponse.json({
    ...data,
    main_store_quantity: data.main_store_quantity || 0,
    active_store_quantity: data.active_store_quantity || 0,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const updates: any = {};
  const fields = [
    'name', 'category', 'unit_price', 'sku', 'commission',
    'main_store_quantity', 'active_store_quantity', 'brand',
    'package_type', 'price_jalingo', 'price_outside', 'image_url',
  ];
  fields.forEach((f) => { if (body[f] !== undefined) updates[f] = body[f]; });

  const { data, error } = await supabaseAdmin
    .from('items')
    .update(updates)
    .eq('id', params.id)
    .select(SELECT_FIELDS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    ...data,
    main_store_quantity: data.main_store_quantity || 0,
    active_store_quantity: data.active_store_quantity || 0,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('items').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Item deleted successfully' });
}
