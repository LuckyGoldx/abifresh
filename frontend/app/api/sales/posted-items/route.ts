import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('posted_items')
    .select(`
      *,
      item:item_id(id, name, sku),
      staff:staff_id(id, full_name, role)
    `)
    .eq('poster_id', authResult.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const mapped = (data || []).map((item: any) => ({
    id: item.id,
    item_name: item.item?.name || 'Unknown',
    staff_name: item.staff?.full_name || 'Unknown',
    quantity: item.quantity,
    posted_at: item.created_at,
    status: item.status,
  }));

  return NextResponse.json(mapped);
}
