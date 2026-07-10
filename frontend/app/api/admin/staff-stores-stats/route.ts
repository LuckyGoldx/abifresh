import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Get all staff_store entries grouped by staff — paginated to avoid 1000-row cap
  const PAGE = 1000;
  const storeData: any[] = [];
  {
    let from = 0;
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('staff_store')
        .select(`
          staff_id,
          quantity,
          quantity_sold,
          users:staff_id(full_name, role)
        `)
        .range(from, from + PAGE - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      if (!data || data.length === 0) break;
      storeData.push(...data);
      from += PAGE;
    }
  }

  // Get actual amounts sold from staff_sales (source of truth) — paginated
  const salesData: any[] = [];
  {
    let from = 0;
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('staff_sales')
        .select('staff_id, total_amount')
        .range(from, from + PAGE - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      if (!data || data.length === 0) break;
      salesData.push(...data);
      from += PAGE;
    }
  }

  // Build a map of actual total_amount_sold per staff from sales records
  const salesAmountMap = new Map<string, number>();
  for (const sale of salesData || []) {
    const current = salesAmountMap.get(sale.staff_id) || 0;
    salesAmountMap.set(sale.staff_id, current + (parseFloat(sale.total_amount) || 0));
  }

  // Group by staff_id
  const staffMap = new Map<string, any>();
  for (const entry of storeData || []) {
    const key = entry.staff_id;
    if (!staffMap.has(key)) {
      staffMap.set(key, {
        staff_id: key,
        staff_name: (entry as any).users?.full_name || 'Unknown',
        staff_role: (entry as any).users?.role || 'unknown',
        total_items: 0,
        total_quantity: 0,
        total_sold: 0,
        available: 0,
        total_amount_sold: 0,
      });
    }
    const staff = staffMap.get(key);
    staff.total_items += 1;
    staff.total_quantity += entry.quantity || 0;
    staff.total_sold += entry.quantity_sold || 0;
    const avail = (entry.quantity || 0) - (entry.quantity_sold || 0);
    staff.available += avail;
  }

  // Apply actual amounts from staff_sales records
  for (const [staffId, staff] of staffMap) {
    staff.total_amount_sold = salesAmountMap.get(staffId) || 0;
  }

  const stats = Array.from(staffMap.values()).map(s => ({
    ...s,
    sell_through_rate: s.total_quantity > 0
      ? ((s.total_sold / s.total_quantity) * 100).toFixed(1) + '%'
      : '0%',
  }));

  return NextResponse.json(stats);
}
