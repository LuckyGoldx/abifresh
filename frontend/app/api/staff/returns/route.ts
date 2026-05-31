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
      location: r.location || 'Inside Jalingo',
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

    if (!receiver_staff_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'receiver_staff_id and items array are required' }, { status: 400 });
    }

    const returnEntries = items.map((item: any) => ({
      requester_staff_id: authResult.id,
      receiver_staff_id,
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      status: 'pending',
    }));

    const { data: insertedReturns, error } = await supabaseAdmin
      .from('returned_items')
      .insert(returnEntries)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Notify the sales receiver
    await supabaseAdmin.from('notifications').insert([{
      user_id: receiver_staff_id,
      type: 'items_return_request',
      title: '↩️ Return Request',
      message: `${authResult.full_name || 'Staff'} has requested to return ${(insertedReturns || []).length} item(s) to you`,
      is_read: false,
    }]);

    return NextResponse.json(
      { message: 'Return request created successfully', returns: insertedReturns || [] },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create return request' }, { status: 400 });
  }
}
