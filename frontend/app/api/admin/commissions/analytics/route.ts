import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const COMMISSION_ROLES = ['commission_staff', 'staff_commission'];

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const period = parseFloat(searchParams.get('period') || '30');

  // Determine date range
  const now = new Date();
  const effectiveEnd = endDate ? new Date(endDate) : now;
  const effectiveStart = startDate
    ? new Date(startDate)
    : new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

  const startISO = effectiveStart.toISOString();
  const endISO = effectiveEnd.toISOString();

  // 1. Get all commission sales in date range
  const { data: salesData, error: salesError } = await supabaseAdmin
    .from('staff_sales')
    .select('id, staff_id, item_id, quantity, total_amount, commission, sale_date, created_at')
    .gte('sale_date', startISO)
    .lte('sale_date', endISO);

  if (salesError) return NextResponse.json({ error: salesError.message }, { status: 400 });

  const sales = salesData || [];

  // 2. Get commission staff info
  const { data: staffData } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email')
    .in('role', COMMISSION_ROLES);
  const staffMap: Record<string, any> = {};
  (staffData || []).forEach((s: any) => { staffMap[s.id] = s; });

  // 3. Build top performers
  const staffTotals: Record<string, { commission: number; sales: number; units: number }> = {};
  sales.forEach((s: any) => {
    const id = s.staff_id;
    if (!staffTotals[id]) staffTotals[id] = { commission: 0, sales: 0, units: 0 };
    staffTotals[id].commission += parseFloat(s.commission) || 0;
    staffTotals[id].sales += parseFloat(s.total_amount) || 0;
    staffTotals[id].units += s.quantity || 0;
  });
  const topPerformers = Object.entries(staffTotals)
    .map(([id, totals]) => ({
      staff_id: id,
      staff_name: staffMap[id]?.full_name || 'Unknown',
      total_commission: totals.commission,
      total_sales: totals.sales,
      items_sold: totals.units,
    }))
    .sort((a, b) => b.total_commission - a.total_commission)
    .slice(0, 10);

  // 4. Build commission trends (daily)
  const dailyTotals: Record<string, number> = {};
  sales.forEach((s: any) => {
    const date = s.sale_date || s.created_at;
    if (!date) return;
    const day = date.substring(0, 10); // YYYY-MM-DD
    dailyTotals[day] = (dailyTotals[day] || 0) + (parseFloat(s.commission) || 0);
  });
  const commissionTrends = Object.entries(dailyTotals)
    .map(([date, commission]) => ({ date, commission }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 5. Build items with highest commission
  const itemSalesIds = [...new Set(sales.map((s: any) => s.item_id).filter(Boolean))];
  let itemMap: Record<string, any> = {};
  if (itemSalesIds.length > 0) {
    const { data: itemsData } = await supabaseAdmin
      .from('items')
      .select('id, name, sku, category, commission')
      .in('id', itemSalesIds);
    (itemsData || []).forEach((item: any) => { itemMap[item.id] = item; });
  }

  const itemTotals: Record<string, { commission: number; quantity: number }> = {};
  sales.forEach((s: any) => {
    if (!s.item_id) return;
    if (!itemTotals[s.item_id]) itemTotals[s.item_id] = { commission: 0, quantity: 0 };
    itemTotals[s.item_id].commission += parseFloat(s.commission) || 0;
    itemTotals[s.item_id].quantity += s.quantity || 0;
  });
  const itemsWithHighestCommission = Object.entries(itemTotals)
    .map(([id, totals]) => ({
      item_id: id,
      item_name: itemMap[id]?.name || 'Unknown',
      category: itemMap[id]?.category || '',
      commission_per_unit: parseFloat(itemMap[id]?.commission) || 0,
      quantity_sold: totals.quantity,
      total_commission: totals.commission,
    }))
    .sort((a, b) => b.total_commission - a.total_commission)
    .slice(0, 10);

  return NextResponse.json({
    top_performers: topPerformers,
    commission_trends: commissionTrends,
    items_with_highest_commission: itemsWithHighestCommission,
    period_days: period,
  });
}
