import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.id;
  const now = new Date().toISOString();

  // 1. Mark all DB notifications as read
  await supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: now })
    .eq('user_id', userId)
    .eq('is_read', false)
    .neq('type', 'virtual_read_marker');

  // 2. Update last_notifications_read_at for virtual notifications
  try {
    await supabaseAdmin.from('users').update({ last_notifications_read_at: now }).eq('id', userId);
  } catch {
    // Column may not exist yet
  }

  // 3. Clean up virtual_read_marker records (now covered by timestamp)
  await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'virtual_read_marker');

  return NextResponse.json({ message: 'All notifications marked as read' });
}

// Support PUT as well (Express used PUT)
export { POST as PUT };
