import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const comment = body.comment;

  // Verify the item belongs to this staff member
  const { data: postedItem, error: fetchError } = await supabaseAdmin
    .from('posted_items')
    .select('*, items:item_id(*)')
    .eq('id', id)
    .eq('staff_id', authResult.id)
    .single();

  if (fetchError || !postedItem) {
    return NextResponse.json({ error: 'Posted item not found' }, { status: 404 });
  }

  // Update status to accepted
  const { error: updateError } = await supabaseAdmin
    .from('posted_items')
    .update({ status: 'accepted', staff_comment: comment || null })
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  // Add to staff store
  const { data: existing } = await supabaseAdmin
    .from('staff_store')
    .select('id, quantity')
    .eq('staff_id', authResult.id)
    .eq('item_id', postedItem.item_id)
    .eq('location', postedItem.location || 'Inside Jalingo')
    .single();

  if (existing) {
    await supabaseAdmin
      .from('staff_store')
      .update({ quantity: existing.quantity + postedItem.quantity, last_updated: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin.from('staff_store').insert([
      {
        staff_id: authResult.id,
        item_id: postedItem.item_id,
        quantity: postedItem.quantity,
        location: postedItem.location || 'Inside Jalingo',
        posted_from_id: postedItem.poster_id,
        posted_date: postedItem.created_at,
      },
    ]);
  }

  // Notify the poster
  await supabaseAdmin.from('notifications').insert([
    {
      user_id: postedItem.poster_id,
      type: 'items_accepted',
      title: '✅ Items Accepted',
      message: `${authResult.full_name || 'Staff'} accepted ${postedItem.quantity}x ${postedItem.items?.name || 'item'}`,
      is_read: false,
    },
  ]);

  return NextResponse.json({ message: 'Posted items accepted successfully' });
}
