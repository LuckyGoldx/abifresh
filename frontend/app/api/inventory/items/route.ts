import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const SELECT_FIELDS = `
  id, name, sku, category, unit_price, commission,
  active_store_quantity, main_store_quantity, is_available,
  created_at, updated_at, brand, package_type,
  price_jalingo, price_outside, image_url
`;

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('items')
    .select(SELECT_FIELDS)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const items = (data || []).map((item: any) => ({
    ...item,
    main_store_quantity: item.main_store_quantity || 0,
    active_store_quantity: item.active_store_quantity || 0,
  }));

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { name, category, unit_price, sku, quantity, commission, brand, package_type, price_jalingo, price_outside, image_url } = body;

  if (!name || !category || unit_price === undefined || !sku) {
    return NextResponse.json({ error: 'name, category, unit_price, and sku are required' }, { status: 400 });
  }

  const insertData: any = {
    name,
    category,
    unit_price,
    sku,
    commission: commission || 0,
    main_store_quantity: quantity || 0,
    active_store_quantity: 0,
    is_available: true,
  };
  if (brand) insertData.brand = brand;
  if (package_type) insertData.package_type = package_type;
  if (price_jalingo !== undefined) insertData.price_jalingo = price_jalingo;
  if (price_outside !== undefined) insertData.price_outside = price_outside;
  if (image_url) insertData.image_url = image_url;

  const { data: item, error } = await supabaseAdmin
    .from('items')
    .insert([insertData])
    .select(SELECT_FIELDS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(item, { status: 201 });
}
