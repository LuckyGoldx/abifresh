import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { data, error } = await supabaseAdmin
      .from('items')
      .select(`
        id, name, sku, category, unit_price, commission,
        active_store_quantity, main_store_quantity, is_available,
        created_at, updated_at, brand, package_type,
        price_jalingo, price_outside, image_url
      `)
      .or('is_available.eq.false,active_store_quantity.eq.0')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
