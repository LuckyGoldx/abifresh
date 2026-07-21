import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  // Get all staff_sales for this staff with receipt info
  const { data: sales, error } = await supabaseAdmin
    .from('staff_sales')
    .select('*, items:item_id(id, name, sku, unit_price, price_jalingo, price_outside), receipt:receipt_id(id, receipt_number)')
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
    .neq('payment_type', 'credit_remittance');

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
          const found = (sales || []).find((s: any) => s.id === sid);
          const origQty = found ? (parseFloat(found.quantity) || 0) : 0;
          const currentPaid = paidOrPendingQuantities.get(sid) || 0;
          const cap = Math.max(0, origQty - currentPaid);
          paidOrPendingQuantities.set(sid, currentPaid + Math.min(paidQty, cap));
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
          if (remaining > 0 && saleIds[0] && (sales || []).find((s: any) => s.id === saleIds[0])) {
            paidOrPendingQuantities.set(saleIds[0], (paidOrPendingQuantities.get(saleIds[0]) || 0) + remaining);
          }
        }
      });
    });

  // Build individual items — one row per staff_sale with remaining quantity
  const allItems = (sales || []).map((sale: any) => {
    const originalQuantity = parseFloat(sale.quantity) || 0;
    const paidOrPendingQty = paidOrPendingQuantities.get(sale.id) || 0;
    let remainingQuantity = Math.max(0, originalQuantity - paidOrPendingQty);
    remainingQuantity = Math.round(remainingQuantity * 100) / 100;

    const outsideJalingo = sale.sold_outside_jalingo || sale.location === 'Outside Jalingo';
    const unitPrice = parseFloat(sale.unit_price) || 0;

    return {
      id: sale.id,
      item_id: sale.item_id,
      item_name: sale.items?.name || 'Unknown',
      quantity: remainingQuantity,
      unit_price: unitPrice,
      price_jalingo: unitPrice,
      total_amount: remainingQuantity * unitPrice,
      sale_date: sale.sale_date,
      sale_ids: [sale.id],
      sold_outside_jalingo: outsideJalingo,
      receipt_number: sale.receipt_number || (Array.isArray(sale.receipt) ? sale.receipt[0]?.receipt_number : sale.receipt?.receipt_number) || '',
      payment_method: sale.payment_method || 'cash',
    };
  }).filter((item: any) => item.quantity > 0);

  const rawOutstanding = allItems.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

  const approvedTotal = (payments || []).filter((p: any) => p.status === 'approved').reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
  const pendingTotal = (payments || []).filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
  const financialOutstanding = Math.max(0, allTimeTotalAmount - approvedTotal - pendingTotal);

  const totalQuantity = allItems.reduce((s: number, i: any) => s + i.quantity, 0);

  return NextResponse.json({
    allItems,
    stats: {
      allTimeQuantity,
      allTimeTotalAmount,
      totalQuantity,
      totalSalesAmount: allTimeTotalAmount,
      outstandingQuantity: totalQuantity,
      outstandingAmount: Math.max(rawOutstanding, financialOutstanding),
    },
  });
}
