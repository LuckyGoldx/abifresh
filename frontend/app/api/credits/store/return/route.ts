import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { items } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items to return' }, { status: 400 });
    }

    for (const item of items) {
      const { data: storeItem } = await supabaseAdmin.from('credit_store').select('*').eq('id', item.id).single();
      if (!storeItem) continue;
      if (storeItem.status !== 'available_for_return') continue;

      const returnQty = Number(item.quantity) || Number(storeItem.quantity);
      await supabaseAdmin.from('credit_store')
        .update({ status: 'returned', quantity: storeItem.quantity - returnQty })
        .eq('id', item.id);

      const { data: currentItem } = await supabaseAdmin.from('items').select('active_store_quantity').eq('id', storeItem.item_id).single();
      const newQty = (currentItem?.active_store_quantity || 0) + returnQty;
      await supabaseAdmin.from('items').update({ active_store_quantity: newQty }).eq('id', storeItem.item_id);
    }

    return NextResponse.json({ message: 'Items returned successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
