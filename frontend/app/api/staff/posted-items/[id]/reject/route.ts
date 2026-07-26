import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { withIdempotency } from '@/lib/server/idempotency';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = params;
  const idempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key') || null;

  try {
    return await withIdempotency(idempotencyKey, async () => {
      const body = await req.json().catch(() => ({}));
      const comment = body.comment;

      const { data: postedItem, error: fetchError } = await supabaseAdmin
        .from('posted_items')
        .select('*, items:item_id(*)')
        .eq('id', id)
        .eq('staff_id', authResult.id)
        .single();

      if (fetchError || !postedItem) {
        return NextResponse.json({ error: 'Posted item not found' }, { status: 404 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('posted_items')
        .update({ status: 'rejected', staff_comment: comment || null })
        .eq('id', id);

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

      const { data: currentItem } = await supabaseAdmin
        .from('items')
        .select('active_store_quantity')
        .eq('id', postedItem.item_id)
        .single();

      await supabaseAdmin
        .from('items')
        .update({ active_store_quantity: (currentItem?.active_store_quantity || 0) + postedItem.quantity })
        .eq('id', postedItem.item_id);

      await supabaseAdmin.from('notifications').insert([{
        user_id: postedItem.poster_id,
        type: 'items_rejected',
        title: '❌ Items Rejected',
        message: `${authResult.full_name || 'Staff'} rejected ${postedItem.quantity}x ${postedItem.items?.name || 'item'}${comment ? ` — ${comment}` : ''}`,
        is_read: false,
      }]);

      return NextResponse.json({ message: 'Posted items rejected' });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reject posted items' }, { status: 400 });
  }
}