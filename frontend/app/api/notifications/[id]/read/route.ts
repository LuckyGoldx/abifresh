import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = params;
  const userId = authResult.id;

  // Virtual notification (posted-item-*, payment-*, return-*)
  if (id.startsWith('posted-item-') || id.startsWith('payment-') || id.startsWith('return-')) {
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'virtual_read_marker')
      .eq('title', id)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'virtual_read_marker',
        title: id,
        message: '',
        is_read: true,
      });
    }
    return NextResponse.json({ message: 'Notification marked as read' });
  }

  // DB notification (UUID)
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Notification marked as read' });
}

// Support PUT as well
export { PATCH as PUT };
