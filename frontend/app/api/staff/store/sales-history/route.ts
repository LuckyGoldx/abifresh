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
    .neq('payment_method', 'credit')
    .order('sale_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Get staff_payments to calculate what's been paid and what's pending
  // Exclude admin-paid commissions (those belong to /staff/commissions, not /staff/payments)
  const { data: payments } = await supabaseAdmin
    .from('staff_payments')
    .select('amount, status, items_paid_for')
    .eq('staff_id', authResult.id)
    .neq('payment_type', 'credit_remittance')
    .or('payment_type.neq.commission,paid_by.is.null');

  // All-time totals from every sale (before any filtering)
  const allTimeQuantity = (sales || []).reduce((s: number, sale: any) => s + (sale.quantity || 0), 0);
  const allTimeTotalAmount = (sales || []).reduce((s: number, sale: any) => s + (parseFloat(sale.total_amount) || 0), 0);

  // Collect paid quantities per sale_id from approved and pending payments
  const paidOrPendingQuantities = new Map<string, number>();
  (payments || [])
    .filter((p: any) => p.status === 'pending' || p.status === 'approved')
    .forEach((p: any) => {
      (p.items_paid_for || []).forEach((item: any) => {
        const saleIds: string[] = Array.isArray(item.sale_ids)
          ? item.sale_ids
          : item.sale_id
          ? [item.sale_id]
          : [];
        const paidQty = parseFloat(item.quantity) || 0;
        if (paidQty <= 0) return;

        if (saleIds.length === 1) {
          const sid = saleIds[0];
          const existing = paidOrPendingQuantities.get(sid) || 0;
          paidOrPendingQuantities.set(sid, existing + paidQty);
        } else if (saleIds.length > 1) {
          let remaining = paidQty;
          for (const sid of saleIds) {
            if (remaining <= 0) break;
            const found = (sales || []).find((s: any) => s.id === sid);
            const origQty = found ? parseFloat(found.quantity) || 0 : 0;
            if (origQty <= 0) continue;
            const already = paidOrPendingQuantities.get(sid) || 0;
            const cap = Math.max(0, origQty - already);
            const alloc = Math.min(cap, remaining);
            paidOrPendingQuantities.set(sid, already + alloc);
            remaining -= alloc;
          }
          if (remaining > 0 && saleIds[0]) {
            paidOrPendingQuantities.set(saleIds[0], (paidOrPendingQuantities.get(saleIds[0]) || 0) + remaining);
          }
        }
      });
    });

  // Build allItems grouped by item_id — compute remaining quantity
  const groupedMap = new Map<string, any>();
  for (const sale of sales || []) {
    const originalQuantity = parseFloat(sale.quantity) || 0;
    const paidOrPendingQty = paidOrPendingQuantities.get(sale.id) || 0;
    const remainingQuantity = Math.max(0, originalQuantity - paidOrPendingQty);
    if (remainingQuantity <= 0) continue;

    const outsideJalingo = sale.sold_outside_jalingo || sale.location === 'Outside Jalingo';
    const locKey = outsideJalingo ? 'outside' : 'inside';
    const key = `${sale.item_id}_${locKey}`;
    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key);
      existing.quantity += remainingQuantity;
      existing.total_amount += remainingQuantity * (parseFloat(sale.unit_price) || 0);
      existing.sale_ids.push(sale.id);
    } else {
      groupedMap.set(key, {
        id: key,
        item_id: sale.item_id,
        item_name: sale.items?.name || 'Unknown',
        quantity: remainingQuantity,
        unit_price: parseFloat(sale.unit_price) || 0,
        price_jalingo: parseFloat(sale.unit_price) || 0,
        total_amount: remainingQuantity * (parseFloat(sale.unit_price) || 0),
        sale_date: sale.sale_date,
        sale_ids: [sale.id],
        sold_outside_jalingo: outsideJalingo,
      });
    }
  }
  const allItems = Array.from(groupedMap.values());

  const outstandingAmount = allItems.reduce((sum: number, i: any) => sum + i.total_amount, 0);

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
    sold_outside_jalingo: sale.sold_outside_jalingo || sale.location === 'Outside Jalingo',
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
