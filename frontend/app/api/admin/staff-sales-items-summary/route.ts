import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const PAGE = 1000;
  let totalQuantity = 0;
  let totalCount = 0;
  let from = 0;

  // Count staff_sales (commission + non-commission staff)
  while (true) {
    const { data } = await supabaseAdmin
      .from('staff_sales')
      .select('quantity')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    totalQuantity += data.reduce((sum: number, s: any) => sum + (parseFloat(s.quantity) || 0), 0);
    totalCount += data.length;
    from += PAGE;
  }

  // Also count sales_items (front-desk sales staff)
  from = 0;
  while (true) {
    const { data } = await supabaseAdmin
      .from('sales')
      .select('id, sales_items(quantity)')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const sale of data) {
      const items = sale.sales_items || [];
      for (const si of items) {
        totalQuantity += parseFloat(si.quantity) || 0;
      }
    }
    from += PAGE;
  }

  return NextResponse.json({ total_quantity: totalQuantity, total_count: totalCount });
}
