import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const staffId = authResult.id;

  // 1. Get all sales for this staff
  const { data: sales, error: salesError } = await supabaseAdmin
    .from('staff_sales')
    .select('id, item_id, quantity, unit_price, total_amount, commission, payment_method, sale_date, created_at')
    .eq('staff_id', staffId)
    .order('sale_date', { ascending: false });

  if (salesError) return NextResponse.json({ error: salesError.message }, { status: 400 });

  const allSales = sales || [];

  // 2. Get commission payments made to this staff
  const { data: payments, error: paymentsError } = await supabaseAdmin
    .from('staff_payments')
    .select('id, amount, status, approved_date, paid_date, notes, created_at')
    .eq('staff_id', staffId)
    .eq('payment_type', 'commission')
    .in('status', ['paid', 'approved'])
    .order('approved_date', { ascending: false });

  if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 400 });

  const allPayments = payments || [];

  // 3. Get item details for top_items
  const itemIds = [...new Set(allSales.map((s: any) => s.item_id).filter(Boolean))];
  let itemMap: Record<string, any> = {};
  if (itemIds.length > 0) {
    const { data: itemsData } = await supabaseAdmin
      .from('items')
      .select('id, name, sku, category')
      .in('id', itemIds);
    (itemsData || []).forEach((item: any) => { itemMap[item.id] = item; });
  }

  // 4. Compute summary
  const totalCommissionGenerated = allSales.reduce((sum: number, s: any) => sum + (parseFloat(s.commission) || 0), 0);
  const totalCommissionPaid = allPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  const pendingCommission = Math.max(0, totalCommissionGenerated - totalCommissionPaid);
  const totalItemsSold = allSales.length;
  const totalUnitsSold = allSales.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);

  // 5. Build top_items (group by item_id)
  const itemTotals: Record<string, { quantity: number; commission: number; sales: number }> = {};
  allSales.forEach((s: any) => {
    if (!s.item_id) return;
    if (!itemTotals[s.item_id]) itemTotals[s.item_id] = { quantity: 0, commission: 0, sales: 0 };
    itemTotals[s.item_id].quantity += s.quantity || 0;
    itemTotals[s.item_id].commission += parseFloat(s.commission) || 0;
    itemTotals[s.item_id].sales += 1;
  });
  const topItems = Object.entries(itemTotals)
    .map(([itemId, totals]) => ({
      item_id: itemId,
      name: itemMap[itemId]?.name || 'Unknown',
      sku: itemMap[itemId]?.sku || '',
      category: itemMap[itemId]?.category || '',
      quantity: totals.quantity,
      commission: totals.commission,
      sales: totals.sales,
    }))
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 10);

  // 6. Build monthly_commission (keyed by YYYY-MM)
  const monthly: Record<string, number> = {};
  allSales.forEach((s: any) => {
    const date = s.sale_date || s.created_at;
    if (!date) return;
    const key = date.substring(0, 7); // YYYY-MM
    monthly[key] = (monthly[key] || 0) + (parseFloat(s.commission) || 0);
  });

  // 7. Format commissions list for page (needs amount and approved_date)
  const commissionsList = allPayments.map((p: any) => ({
    id: p.id,
    amount: parseFloat(p.amount) || 0,
    approved_date: p.approved_date || p.paid_date || p.created_at,
    status: p.status,
    notes: p.notes,
  }));

  return NextResponse.json({
    summary: {
      total_commission_generated: totalCommissionGenerated,
      total_commission_paid: totalCommissionPaid,
      pending_commission: pendingCommission,
      total_items_sold: totalItemsSold,
      total_units_commissioned: totalUnitsSold,
    },
    commissions: commissionsList,
    sales: allSales,
    top_items: topItems,
    monthly_commission: monthly,
  });
}
