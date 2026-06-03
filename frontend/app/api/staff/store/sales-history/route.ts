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
    .eq('payment_type', 'sale');

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

  const approvedSaleIds = new Set<string>();
  const pendingSaleIds = new Set<string>();
  const rejectedSaleIds = new Set<string>();
  const paidOrPendingQuantities = new Map<string, number>();

  if (payments) {
    payments.forEach((payment: any) => {
      if (payment.items_paid_for && Array.isArray(payment.items_paid_for)) {
        payment.items_paid_for.forEach((paidItem: any) => {
          const saleIds = Array.isArray(paidItem.sale_ids)
            ? paidItem.sale_ids
            : paidItem.sale_id
            ? [paidItem.sale_id]
            : [];

          saleIds.forEach((saleId: string) => {
            if (!saleId) return;
            if (payment.status === 'approved') approvedSaleIds.add(saleId);
            else if (payment.status === 'pending') pendingSaleIds.add(saleId);
            else if (payment.status === 'rejected') rejectedSaleIds.add(saleId);
          });

          if (saleIds.length > 0 && (payment.status === 'approved' || payment.status === 'pending')) {
            if (saleIds.length === 1) {
              const sid = saleIds[0];
              const existingQty = paidOrPendingQuantities.get(sid) || 0;
              paidOrPendingQuantities.set(sid, existingQty + (parseFloat(paidItem.quantity) || 0));
            } else {
              let remainingToAllocate = parseFloat(paidItem.quantity) || 0;
              for (const sid of saleIds) {
                if (remainingToAllocate <= 0) break;
                const originalItem = sales?.find((si: any) => si.id === sid);
                if (originalItem) {
                  const origQty = parseFloat(originalItem.quantity) || 0;
                  const alreadyAllocated = paidOrPendingQuantities.get(sid) || 0;
                  const cap = Math.max(0, origQty - alreadyAllocated);
                  const allocation = Math.min(cap, remainingToAllocate);
                  paidOrPendingQuantities.set(sid, alreadyAllocated + allocation);
                  remainingToAllocate -= allocation;
                }
              }
              if (remainingToAllocate > 0 && saleIds[0]) {
                const sid = saleIds[0];
                paidOrPendingQuantities.set(sid, (paidOrPendingQuantities.get(sid) || 0) + remainingToAllocate);
              }
            }
          }
        });
      }
    });
  }

  // Build allItems grouped by item_id — compute proper remaining quantity
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
