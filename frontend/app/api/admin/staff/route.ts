import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'admin', 'sales', 'sales_staff')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  const isSuperadmin = authResult.role === 'superadmin';
  const HIDDEN_EMAILS = '("staff@abifresh.com","commission@abifresh.com","sales.@abifresh.com")';

  // Fetch users with pagination
  let usersQuery = supabaseAdmin
    .from('users')
    .select('*');
  if (!isSuperadmin) usersQuery = usersQuery.not('email', 'in', HIDDEN_EMAILS);
  const { data: users, error } = await usersQuery
    .range(offset, offset + limit - 1)
    .order('full_name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Fetch aggregate sales data in three batch queries (constant time, not N+1)
  const staffIds = (users || []).map((s: any) => s.id);

  const [salesItemsAggResult, salesAggResult, staffSalesAggResult] = await Promise.all([
    staffIds.length > 0
      ? supabaseAdmin
          .from('sales_items')
          .select('quantity, sale_id!inner(staff_id)')
          .in('sale_id.staff_id', staffIds)
      : { data: [] },
    staffIds.length > 0
      ? supabaseAdmin
          .from('sales')
          .select('staff_id, total_amount')
          .in('staff_id', staffIds)
      : { data: [] },
    staffIds.length > 0
      ? supabaseAdmin
          .from('staff_sales')
          .select('staff_id, quantity, total_amount')
          .in('staff_id', staffIds)
      : { data: [] },
  ]);

  // Aggregate per staff_id using Maps (O(n) merge instead of O(n*m) nested loops)
  const itemsCountByStaff = new Map<string, number>();
  (salesItemsAggResult.data || []).forEach((si: any) => {
    const sid = (si.sale_id as any)?.staff_id;
    if (sid) itemsCountByStaff.set(sid, (itemsCountByStaff.get(sid) || 0) + (si.quantity || 0));
  });

  const amountByStaff = new Map<string, number>();
  (salesAggResult.data || []).forEach((s: any) => {
    amountByStaff.set(s.staff_id, (amountByStaff.get(s.staff_id) || 0) + (s.total_amount || 0));
  });

  // Merge staff_sales data for commission/non-commission staff
  (staffSalesAggResult.data || []).forEach((ss: any) => {
    if (ss.staff_id) {
      itemsCountByStaff.set(ss.staff_id, (itemsCountByStaff.get(ss.staff_id) || 0) + (ss.quantity || 0));
      amountByStaff.set(ss.staff_id, (amountByStaff.get(ss.staff_id) || 0) + (parseFloat(ss.total_amount) || 0));
    }
  });

  const enriched = (users || []).map((staff: any) => ({
    ...staff,
    total_sales_items: itemsCountByStaff.get(staff.id) || 0,
    total_sales_amount: amountByStaff.get(staff.id) || 0,
  }));

  return NextResponse.json(enriched);
}
