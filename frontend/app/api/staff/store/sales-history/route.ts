import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  // Get all staff_sales for this staff
  const { data: sales, error } = await supabaseAdmin
    .from('staff_sales')
    .select('*, items:item_id(id, name, sku, unit_price, price_jalingo, price_outside)')
    .eq('staff_id', authResult.id)
    .order('sale_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Get staff_payments to calculate what's been paid and what's pending
  const { data: payments } = await supabaseAdmin
    .from('staff_payments')
    .select('amount, status, items_paid_for')
    .eq('staff_id', authResult.id);

  // All-time totals from every sale (before any filtering)
  const allTimeQuantity = (sales || []).reduce((s: number, sale: any) => s + (sale.quantity || 0), 0);
  const allTimeTotalAmount = (sales || []).reduce((s: number, sale: any) => s + (parseFloat(sale.total_amount) || 0), 0);

  // Amounts already covered by approved and pending payments
  const approvedAmount = (payments || [])
    .filter((p: any) => p.status === 'approved' || p.status === 'paid')
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  const pendingAmount = (payments || [])
    .filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  const outstandingAmount = Math.max(0, allTimeTotalAmount - approvedAmount - pendingAmount);

  // Collect sale IDs that are already in a pending or approved payment
  // items_paid_for stores { sale_ids: string[], item_id, ... }
  const lockedSaleIds = new Set<string>();
  (payments || [])
    .filter((p: any) => p.status === 'pending' || p.status === 'approved')
    .forEach((p: any) => {
      (p.items_paid_for || []).forEach((item: any) => {
        (item.sale_ids || []).forEach((sid: string) => { if (sid) lockedSaleIds.add(String(sid)); });
      });
    });

  // Build allItems grouped by item_id — skip any sale already in a pending/approved payment
  const groupedMap = new Map<string, any>();
  for (const sale of sales || []) {
    if (lockedSaleIds.has(String(sale.id))) continue;

    const key = sale.item_id;
    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key);
      existing.quantity += sale.quantity;
      existing.total_amount += parseFloat(sale.total_amount) || 0;
      existing.sale_ids.push(sale.id);
    } else {
      groupedMap.set(key, {
        id: sale.id,
        item_id: sale.item_id,
        item_name: sale.items?.name || 'Unknown',
        quantity: sale.quantity,
        unit_price: parseFloat(sale.unit_price) || 0,
        price_jalingo: sale.items?.price_jalingo || parseFloat(sale.unit_price) || 0,
        total_amount: parseFloat(sale.total_amount) || 0,
        sale_date: sale.sale_date,
        sale_ids: [sale.id],
        sold_outside_jalingo: sale.sold_outside_jalingo || false,
      });
    }
  }
  const allItems = Array.from(groupedMap.values());

  // Recent sales (individual rows, most recent first)
  const recentSales = (sales || []).map((sale: any) => ({
    id: sale.id,
    item_id: sale.item_id,
    item_name: sale.items?.name || 'Unknown',
    quantity: sale.quantity,
    unit_price: parseFloat(sale.unit_price) || 0,
    total_amount: parseFloat(sale.total_amount) || 0,
    payment_method: sale.payment_method || 'cash',
    sale_date: sale.sale_date,
    receipt_number: sale.receipt_number || '',
    sold_outside_jalingo: false,
    commission: parseFloat(sale.commission) || 0,
  }));

  const totalQuantity = allItems.reduce((s: number, i: any) => s + i.quantity, 0);

  return NextResponse.json({
    allItems,
    recentSales,
    stats: {
      // Field names must match what staff/payments/page.tsx displays
      allTimeQuantity,
      allTimeTotalAmount,
      totalQuantity,
      totalSalesAmount: allTimeTotalAmount,
      outstandingQuantity: totalQuantity,
      outstandingAmount,
    },
  });
}
