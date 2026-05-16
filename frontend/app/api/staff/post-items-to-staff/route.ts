import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { staff_id, item_id, quantity, notes, location } = await req.json();

    const itemLocation = location || 'Inside Jalingo';

    if (!staff_id || !item_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'staff_id, item_id, and quantity > 0 are required' }, { status: 400 });
    }

    // Verify item has enough stock
    const { data: item } = await supabaseAdmin
      .from('items')
      .select('id, name, active_store_quantity, price_jalingo, unit_price')
      .eq('id', item_id)
      .single();

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if ((item.active_store_quantity || 0) < quantity) {
      return NextResponse.json({ error: `Not enough stock. Available: ${item.active_store_quantity}` }, { status: 400 });
    }

    // Deduct from active store
    const { error: updateError } = await supabaseAdmin
      .from('items')
      .update({ active_store_quantity: (item.active_store_quantity || 0) - quantity })
      .eq('id', item_id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    // Create posted_items record
    const { data: posted, error: insertError } = await supabaseAdmin
      .from('posted_items')
      .insert([{
        poster_id: authResult.id,
        staff_id,
        item_id,
        quantity,
        unit_price: item.price_jalingo || item.unit_price || 0,
        location: itemLocation,
        status: 'pending',
        notes: notes || null,
      }])
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

    // Notify the staff member
    await supabaseAdmin.from('notifications').insert([{
      user_id: staff_id,
      type: 'items_posted',
      title: '📦 New Items Posted',
      message: `${authResult.full_name || 'Sales'} posted ${quantity}x ${item.name} to you. Please review.`,
      is_read: false,
    }]);

    return NextResponse.json(
      { posted_item: posted, message: 'Item posted to staff successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
