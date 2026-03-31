import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('items')
    .select('id,name,sku,category,unit_price,commission,active_store_quantity,main_store_quantity,is_available,brand,package_type,price_jalingo,price_outside,image_url')
    .gt('active_store_quantity', 0)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json((data || []).map((item: any) => ({ ...item, main_store_quantity: item.main_store_quantity || 0, active_store_quantity: item.active_store_quantity || 0 })));
}
