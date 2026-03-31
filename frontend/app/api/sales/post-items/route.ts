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
    const { staff_id, items } = await req.json();

    if (!staff_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'staff_id and items are required' }, { status: 400 });
    }

    const postedItems = [];
    for (const item of items) {
      // Check stock availability
      const { data: itemData } = await supabaseAdmin
        .from('items')
        .select('active_store_quantity, name')
        .eq('id', item.item_id)
        .single();

      if (!itemData || (itemData.active_store_quantity || 0) < item.quantity) {
        return NextResponse.json(
          { error: `Not enough stock for ${itemData?.name || item.item_id}. Available: ${itemData?.active_store_quantity || 0}` },
          { status: 400 }
        );
      }

      // Deduct from active store
      await supabaseAdmin
        .from('items')
        .update({ active_store_quantity: (itemData.active_store_quantity || 0) - item.quantity })
        .eq('id', item.item_id);

      const { data, error } = await supabaseAdmin
        .from('posted_items')
        .insert([
          {
            poster_id: authResult.id,
            staff_id,
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      postedItems.push(data);
    }

    // Notify the staff member
    await supabaseAdmin.from('notifications').insert([{
      user_id: staff_id,
      type: 'items_posted',
      title: '📦 New Items Posted',
      message: `${authResult.full_name || 'Sales'} posted ${items.length} item(s) to you. Please review.`,
      is_read: false,
    }]);

    return NextResponse.json(
      {
        posted_items: postedItems,
        message: `Successfully posted ${items.length} item(s) to staff`,
        count: postedItems.length,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
