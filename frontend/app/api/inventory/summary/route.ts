import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'all';

  const { data: allItems, error } = await supabaseAdmin
    .from('items')
    .select('id,name,sku,category,unit_price,commission,active_store_quantity,main_store_quantity,is_available,brand,package_type,price_jalingo,price_outside,image_url')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const items = (allItems || []).map((item: any) => ({
    ...item,
    main_store_quantity: item.main_store_quantity || 0,
    active_store_quantity: item.active_store_quantity || 0,
  }));

  if (view === 'main') {
    const filtered = items.filter((i: any) => i.main_store_quantity > 0);
    const totalQty = filtered.reduce((s: number, i: any) => s + i.main_store_quantity, 0);
    return NextResponse.json({
      total_items: filtered.length, total_quantity: totalQty, total_main_store: totalQty,
      total_active_store: 0, available_items: filtered.length, unavailable_items: 0,
      total_value: filtered.reduce((s: number, i: any) => s + i.main_store_quantity * (i.unit_price || 0), 0),
      view: 'main',
    });
  }

  if (view === 'active') {
    const filtered = items.filter((i: any) => i.active_store_quantity > 0);
    const totalQty = filtered.reduce((s: number, i: any) => s + i.active_store_quantity, 0);
    return NextResponse.json({
      total_items: filtered.length, total_quantity: totalQty, total_main_store: 0,
      total_active_store: totalQty, available_items: filtered.length, unavailable_items: 0,
      total_value: filtered.reduce((s: number, i: any) => s + i.active_store_quantity * (i.unit_price || 0), 0),
      view: 'active',
    });
  }

  if (view === 'unavailable') {
    const filtered = items.filter((i: any) => i.is_available === false || i.active_store_quantity === 0);
    return NextResponse.json({
      total_items: filtered.length, total_quantity: 0, total_main_store: 0,
      total_active_store: 0, available_items: 0, unavailable_items: filtered.length,
      total_value: 0, view: 'unavailable',
    });
  }

  // All
  const totalMain = items.reduce((s: number, i: any) => s + i.main_store_quantity, 0);
  const totalActive = items.reduce((s: number, i: any) => s + i.active_store_quantity, 0);
  const available = items.filter((i: any) => i.is_available === true && i.active_store_quantity > 0).length;
  const unavailable = items.filter((i: any) => i.is_available === false || i.active_store_quantity === 0).length;
  const totalValue = items.reduce((s: number, i: any) => s + (i.main_store_quantity + i.active_store_quantity) * (i.unit_price || 0), 0);

  return NextResponse.json({
    total_items: items.length, total_quantity: totalMain + totalActive,
    total_main_store: totalMain, total_active_store: totalActive,
    available_items: available, unavailable_items: unavailable, total_value: totalValue,
  });
}
