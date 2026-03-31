import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: postedItems, error } = await supabaseAdmin
    .from('posted_items')
    .select(`
      *,
      item:item_id(id, name, sku),
      staff:staff_id(id, full_name, username, role)
    `)
    .eq('poster_id', authResult.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const activities = (postedItems || []).map((item: any) => ({
    id: item.id,
    type: 'post-items',
    title:
      item.status === 'accepted'
        ? `Items Accepted by ${item.staff?.full_name || 'Staff'}`
        : item.status === 'rejected'
        ? `Items Rejected by ${item.staff?.full_name || 'Staff'}`
        : `Items posted to ${item.staff?.full_name || 'Staff'}`,
    description: `${item.quantity} x ${item.item?.name || 'Unknown Item'}`,
    item_name: item.item?.name,
    quantity: item.quantity,
    staff_name: item.staff?.full_name,
    status: item.status,
    timestamp: new Date(item.updated_at || item.created_at),
    amount: (item.unit_price || 0) * item.quantity,
  }));

  return NextResponse.json(activities);
}
