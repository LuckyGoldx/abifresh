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
        const paidAmount = parseFloat(item.amount) || 0;
        if (paidAmount <= 0) return;

        if (saleIds.length === 1) {
          const sid = saleIds[0];
          const found = (sales || []).find((s: any) => s.id === sid);
          const price = found ? (parseFloat(found.unit_price) || 1) : 1;
          const paidQty = price > 0 ? paidAmount / price : 0;
          paidOrPendingQuantities.set(sid, (paidOrPendingQuantities.get(sid) || 0) + paidQty);
        } else if (saleIds.length > 1) {
          // Proportional distribution by item value
          const itemValues: Record<string, number> = {};
          let totalValue = 0;
          for (const sid of saleIds) {
            const found = (sales || []).find((s: any) => s.id === sid);
            if (found) {
              const price = parseFloat(found.unit_price) || 1;
              const val = (parseFloat(found.quantity) || 0) * price;
              itemValues[sid] = val;
              totalValue += val;
            }
          }
          if (totalValue > 0) {
            for (const sid of saleIds) {
              if (!itemValues[sid]) continue;
              const found = (sales || []).find((s: any) => s.id === sid);
              const price = found ? (parseFloat(found.unit_price) || 1) : 1;
              const share = paidAmount * (itemValues[sid] / totalValue);
              const shareQty = price > 0 ? share / price : 0;
              paidOrPendingQuantities.set(sid, (paidOrPendingQuantities.get(sid) || 0) + shareQty);
            }
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

  const rawOutstanding = allItems.reduce((sum: number, i: any) => sum + i.total_amount, 0);

  // Scale unpaid items to match financial outstanding (same as admin staff-detail)
  let approvedTotal = 0;
  let pendingTotal = 0;
  for (const p of payments || []) {
    const amt = parseFloat(p.amount) || 0;
    if (p.status === 'approved') approvedTotal += amt;
    if (p.status === 'pending') pendingTotal += amt;
  }
  const financialOutstanding = Math.max(0, allTimeTotalAmount - approvedTotal - pendingTotal);

  if (financialOutstanding <= 0) {
    // All money paid — clear all items
    for (const item of allItems) item.quantity = 0;
  } else if (allItems.length > 0 && rawOutstanding > 0 && Math.abs(rawOutstanding - financialOutstanding) > 1) {
    const scale = financialOutstanding / rawOutstanding;
    let adj = 0;
    for (let i = 0; i < allItems.length; i++) {
      allItems[i].total_amount = Math.round(allItems[i].total_amount * scale * 100) / 100;
      adj += allItems[i].total_amount;
    }
    const diff = Math.round((financialOutstanding - adj) * 100) / 100;
    if (allItems.length > 0) allItems[allItems.length - 1].total_amount += diff;
  }

  // Remove items with zero quantity after scaling
  const visibleItems = allItems.filter((item: any) => item.quantity > 0);

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

  const totalQuantity = visibleItems.reduce((s: number, i: any) => s + i.quantity, 0);

  return NextResponse.json({
    allItems: visibleItems,
    recentSales,
    stats: {
      // Field names must match what staff/payments/page.tsx displays
      allTimeQuantity,
      allTimeTotalAmount,
      totalQuantity,
      totalSalesAmount: allTimeTotalAmount,
      outstandingQuantity: totalQuantity,
      outstandingAmount: financialOutstanding,
    },
  });
}
