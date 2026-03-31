import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('staff_store')
    .select(`
      id,
      quantity,
      quantity_sold,
      items:item_id(id, name, sku, category, unit_price, commission, brand, package_type, price_jalingo, price_outside, image_url)
    `)
    .eq('staff_id', authResult.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const storeItems = (data || [])
    .map((entry: any) => {
      const available = (entry.quantity || 0) - (entry.quantity_sold || 0);
      return {
        id: entry.items?.id,
        staff_store_id: entry.id,
        name: entry.items?.name || 'Unknown',
        sku: entry.items?.sku || '',
        category: entry.items?.category || '',
        brand: entry.items?.brand || null,
        package_type: entry.items?.package_type || null,
        unit_price: entry.items?.unit_price || 0,
        price_jalingo: entry.items?.price_jalingo || 0,
        price_outside: entry.items?.price_outside || 0,
        commission: entry.items?.commission || 0,
        image_url: entry.items?.image_url || null,
        quantity: available,
      };
    })
    .filter((item: any) => item.id && item.quantity > 0);

  return NextResponse.json(storeItems);
}
