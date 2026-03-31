import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('returned_items')
    .select(`
      *,
      item:item_id(id, name, unit_price),
      receiver:receiver_staff_id(id, full_name)
    `)
    .eq('requester_staff_id', authResult.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(
    (data || []).map((r: any) => ({
      id: r.id,
      item_id: r.item_id,
      item_name: r.item?.name || 'Unknown',
      quantity: r.quantity,
      unit_price: r.unit_price,
      status: r.status,
      reject_reason: r.reject_reason,
      receiver_name: r.receiver?.full_name || 'Unknown',
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))
  );
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { receiver_staff_id, items } = await req.json();

    if (!receiver_staff_id) {
      return NextResponse.json({ error: 'receiver_staff_id is required' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    // Verify receiver is a sales staff member
    const { data: receiver } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role')
      .eq('id', receiver_staff_id)
      .in('role', ['sales', 'sales_staff'])
      .single();

    if (!receiver) {
      return NextResponse.json({ error: 'Invalid receiver: must be a sales staff member' }, { status: 400 });
    }

    const insertedReturns = [];
    for (const item of items) {
      const { item_id, quantity, unit_price } = item;

      if (!item_id || !quantity || quantity <= 0) {
        return NextResponse.json({ error: 'Each item requires item_id and quantity > 0' }, { status: 400 });
      }

      // Verify staff has enough stock in their store
      const { data: storeEntry } = await supabaseAdmin
        .from('staff_store')
        .select('quantity, quantity_sold')
        .eq('staff_id', authResult.id)
        .eq('item_id', item_id)
        .single();

      const stockAvailable = storeEntry
        ? (storeEntry.quantity || 0) - (storeEntry.quantity_sold || 0)
        : 0;

      if (stockAvailable < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for item ${item_id}. Available: ${stockAvailable}` },
          { status: 400 }
        );
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('returned_items')
        .insert([{
          item_id,
          requester_staff_id: authResult.id,
          receiver_staff_id,
          quantity,
          unit_price: unit_price || 0,
          status: 'pending',
        }])
        .select()
        .single();

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
      insertedReturns.push(inserted);
    }

    // Notify the sales receiver
    await supabaseAdmin.from('notifications').insert([{
      user_id: receiver_staff_id,
      type: 'items_return_request',
      title: '↩️ Return Request',
      message: `${authResult.full_name || 'Staff'} has requested to return ${insertedReturns.length} item(s) to you`,
      is_read: false,
    }]);

    return NextResponse.json(
      { message: 'Return request created successfully', returns: insertedReturns },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
