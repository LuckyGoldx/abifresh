import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString();

  const [todayReceipts, allReceipts, staffCount, pendingPayments] = await Promise.all([
    supabaseAdmin.from('receipts').select('id, total_amount, items_count, receipt_items(id)').gte('created_at', todayStr).lt('created_at', tomorrowStr),
    supabaseAdmin.from('receipts').select('id, total_amount, items_count, receipt_items(id)'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('staff_payments').select('id, amount').eq('status', 'pending'),
  ]);

  const todayData = todayReceipts.data || [];
  const allReceiptsData = allReceipts.data || [];
  const pending = pendingPayments.data || [];

  const todaySales = todayData.length;
  const todayAmount = todayData.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  const todayItems = todayData.reduce((s, r) => s + (r.items_count || (r.receipt_items?.length || 0)), 0);

  // All-time stats from receipts + staff_sales (for total_sales count)
  let totalSales = allReceiptsData.length;
  let salesFrom = 0;
  const SALES_PAGE = 1000;
  while (true) {
    const { data } = await supabaseAdmin
      .from('staff_sales')
      .select('id')
      .range(salesFrom, salesFrom + SALES_PAGE - 1);
    if (!data || data.length === 0) break;
    totalSales += data.length;
    salesFrom += SALES_PAGE;
  }

  // All-time total items from staff_sales + sales (matches payments/reports)
  let totalItems = 0;
  const QUANTITY_PAGE = 1000;
  let qtyFrom = 0;
  while (true) {
    const { data } = await supabaseAdmin
      .from('staff_sales')
      .select('quantity')
      .range(qtyFrom, qtyFrom + QUANTITY_PAGE - 1);
    if (!data || data.length === 0) break;
    totalItems += data.reduce((sum: number, s: any) => sum + (parseFloat(s.quantity) || 0), 0);
    qtyFrom += QUANTITY_PAGE;
  }
  qtyFrom = 0;
  while (true) {
    const { data } = await supabaseAdmin
      .from('sales')
      .select('id, sales_items(quantity)')
      .range(qtyFrom, qtyFrom + QUANTITY_PAGE - 1);
    if (!data || data.length === 0) break;
    totalItems += data.reduce((sum: number, s: any) => {
      const items = s.sales_items || [];
      return sum + items.reduce((isum: number, si: any) => isum + (parseFloat(si.quantity) || 0), 0);
    }, 0);
    qtyFrom += QUANTITY_PAGE;
  }

  // All-time total amount from staff_sales + sales (matches payments/reports)
  let totalAmount = 0;
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data } = await supabaseAdmin
        .from('staff_sales')
        .select('total_amount')
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      totalAmount += data.reduce((sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0), 0);
      from += PAGE;
    }
  }
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data } = await supabaseAdmin
        .from('sales')
        .select('total_amount')
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      totalAmount += data.reduce((sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0), 0);
      from += PAGE;
    }
  }

  const pendingAmount = pending.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return NextResponse.json({
    today_sales: todaySales,
    today_amount: todayAmount,
    today_items: todayItems,
    total_sales: totalSales,
    total_amount: totalAmount,
    total_staff_sales: totalAmount,
    total_items: totalItems,
    total_staff: staffCount.count ?? 0,
    pending_approvals: pending.length,
    pending_amount: pendingAmount,
  });
}
