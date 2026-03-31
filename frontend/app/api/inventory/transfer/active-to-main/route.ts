import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { item_id, quantity } = body;
  if (!item_id || !quantity) {
    return NextResponse.json({ error: 'Missing required fields: item_id, quantity' }, { status: 400 });
  }

  const { data: item, error: fetchError } = await supabaseAdmin
    .from('items')
    .select('main_store_quantity, active_store_quantity')
    .eq('id', item_id)
    .single();

  if (fetchError || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (item.active_store_quantity < quantity) {
    return NextResponse.json(
      { error: `Insufficient quantity in active store. Available: ${item.active_store_quantity}, Requested: ${quantity}` },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from('items')
    .update({
      active_store_quantity: item.active_store_quantity - quantity,
      main_store_quantity: item.main_store_quantity + quantity,
    })
    .eq('id', item_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Transfer successful' });
}
