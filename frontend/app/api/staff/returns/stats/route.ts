import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const [
    { count: totalReturned },
    { count: pendingToAccept },
    storeResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('returned_items')
      .select('id', { count: 'exact', head: true })
      .eq('requester_staff_id', authResult.id)
      .eq('status', 'accepted'),
    supabaseAdmin
      .from('returned_items')
      .select('id', { count: 'exact', head: true })
      .eq('requester_staff_id', authResult.id)
      .eq('status', 'pending'),
    supabaseAdmin
      .from('staff_store')
      .select('quantity, quantity_sold')
      .eq('staff_id', authResult.id),
  ]);

  // Count store entries where available > 0
  const availableForReturn = (storeResult.data || []).filter(
    (e: any) => (e.quantity || 0) - (e.quantity_sold || 0) > 0
  ).length;

  return NextResponse.json({
    total_returned: totalReturned || 0,
    pending_to_accept: pendingToAccept || 0,
    available_for_return: availableForReturn,
  });
}
