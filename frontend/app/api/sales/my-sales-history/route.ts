import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const userId = authResult.id;

    // Step 1: Get all sales by this user
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id, receipt_number, total_amount, created_at')
      .eq('staff_id', userId)
      .neq('payment_method', 'credit')
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    const saleIds = (salesData || []).map((sale: any) => sale.id);

    if (saleIds.length === 0) {
      return NextResponse.json({
        allItems: [],
        stats: {
          todaysTotalQuantity: 0, todaysTotalAmount: 0,
          allTimeQuantity: 0, allTimeTotalAmount: 0,
          paidQuantity: 0, totalQuantity: 0, totalItems: 0,
          totalSalesAmount: 0, outstandingAmount: 0,
        },
      });
    }

    // Step 2: Get sales_items for those sales (join with sales for sold_outside_jalingo flag)
    const { data: salesItemsData, error: itemsError } = await supabaseAdmin
      .from('sales_items')
      .select(`
        id, sale_id, item_id, quantity, unit_price, logistics_fee, created_at,
        items:item_id (id, name, unit_price),
        sale:sale_id (sold_outside_jalingo)
      `)
      .in('sale_id', saleIds)
      .order('created_at', { ascending: false });

    if (itemsError) throw itemsError;

    // Step 3: Get payments submitted by this user (exclude admin-paid commissions
    // which belong to /sales/commissions, not /sales/payments)
    const { data: paymentsData } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, items_paid_for, status, created_at')
      .eq('staff_id', userId)
      .neq('payment_type', 'credit_remittance');

    const paidOrPendingQuantities = new Map<string, number>();

    if (paymentsData) {
      paymentsData.forEach((payment: any) => {
        if ((payment.status === 'approved' || payment.status === 'pending') && payment.items_paid_for && Array.isArray(payment.items_paid_for)) {
          payment.items_paid_for.forEach((paidItem: any) => {
            const saleIds: string[] = Array.isArray(paidItem.sale_ids)
              ? paidItem.sale_ids
              : paidItem.sale_id
              ? [paidItem.sale_id]
              : [];
            const paidQty = parseFloat(paidItem.quantity) || 0;
            if (paidQty <= 0) return;

            if (saleIds.length === 1) {
              const sid = saleIds[0];
              const found = salesItemsData?.find((si: any) => si.id === sid);
              const origQty = found ? (parseFloat(found.quantity) || 0) : 0;
              const currentPaid = paidOrPendingQuantities.get(sid) || 0;
              const cap = Math.max(0, origQty - currentPaid);
              paidOrPendingQuantities.set(sid, currentPaid + Math.min(paidQty, cap));
            } else if (saleIds.length > 1) {
              let remaining = paidQty;
              for (const sid of saleIds) {
                if (remaining <= 0) break;
                const found = salesItemsData?.find((si: any) => si.id === sid);
                const origQty = found ? parseFloat(found.quantity) || 0 : 0;
                if (origQty <= 0) continue;
                const already = paidOrPendingQuantities.get(sid) || 0;
                const cap = Math.max(0, origQty - already);
                const alloc = Math.min(cap, remaining);
                paidOrPendingQuantities.set(sid, already + alloc);
                remaining -= alloc;
              }
              if (remaining > 0 && saleIds[0] && salesItemsData?.find((si: any) => si.id === saleIds[0])) {
                paidOrPendingQuantities.set(saleIds[0], (paidOrPendingQuantities.get(saleIds[0]) || 0) + remaining);
              }
            }
          });
        }
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todaysTotalQuantity = 0;
    let todaysTotalAmount = 0;
    let allTimeQuantity = 0;
    let allTimeTotalAmount = 0;
    let paidQuantity = 0;

    const allSales = (salesItemsData || []).map((item: any) => {
      const itemObj = Array.isArray(item.items) ? item.items[0] : item.items;
      const saleObj = Array.isArray(item.sale) ? item.sale[0] : item.sale;
      const originalQuantity = parseFloat(item.quantity) || 0;
      const paidOrPendingQty = paidOrPendingQuantities.get(item.id) || 0;
      const remainingQuantity = Math.round(Math.max(0, originalQuantity - paidOrPendingQty) * 100) / 100;

      const soldOutsideJalingo = saleObj?.sold_outside_jalingo || false;
      const baseUnitPrice = parseFloat(item.unit_price) || 0;
      const logisticsFee = parseFloat(item.logistics_fee) || 0;
      const effectiveUnitPrice = soldOutsideJalingo ? baseUnitPrice + logisticsFee : baseUnitPrice;
      const totalAmount = remainingQuantity * effectiveUnitPrice;
      const originalTotalAmount = originalQuantity * effectiveUnitPrice;
      const saleDate = new Date(item.created_at);

      allTimeQuantity += originalQuantity;
      allTimeTotalAmount += originalTotalAmount;

      if (saleDate >= today) {
        todaysTotalQuantity += originalQuantity;
        todaysTotalAmount += originalTotalAmount;
      }

      if (remainingQuantity === 0) paidQuantity += originalQuantity;

      return {
        id: item.id,
        item_id: item.item_id,
        item_name: itemObj?.name || 'Unknown',
        quantity: remainingQuantity,
        unit_price: effectiveUnitPrice,
        total_amount: totalAmount,
        sale_date: item.created_at,
        sold_outside_jalingo: soldOutsideJalingo,
      };
    });

    const unpaidItems = allSales.filter((item: any) => item.quantity > 0);
    const rawOutstanding = unpaidItems.reduce((sum: number, item: any) => sum + item.total_amount, 0);

    // Scale unpaid items to match financial outstanding (same as admin staff-detail)
    let approvedTotal = 0;
    let pendingTotal = 0;
    for (const p of paymentsData || []) {
      if (p.status === 'approved') approvedTotal += parseFloat(p.amount) || 0;
      if (p.status === 'pending') pendingTotal += parseFloat(p.amount) || 0;
    }
    const financialOutstanding = Math.max(0, allTimeTotalAmount - approvedTotal - pendingTotal);

    if (financialOutstanding <= 0) {
      // All money paid — clear all items
      for (const item of unpaidItems) item.quantity = 0;
    } else if (rawOutstanding > 0 && Math.abs(rawOutstanding - financialOutstanding) > 1) {
      const scale = Math.min(financialOutstanding / rawOutstanding, 1.0);
      let adj = 0;
      for (let i = 0; i < unpaidItems.length; i++) {
        unpaidItems[i].total_amount = Math.round(unpaidItems[i].total_amount * scale * 100) / 100;
        adj += unpaidItems[i].total_amount;
      }
      const diff = Math.round((financialOutstanding - adj) * 100) / 100;
      if (unpaidItems.length > 0) unpaidItems[unpaidItems.length - 1].total_amount += diff;
    }

    const visibleItems = unpaidItems.filter((item: any) => item.quantity > 0);

    return NextResponse.json({
      allItems: visibleItems,
      stats: {
        todaysTotalQuantity,
        todaysTotalAmount,
        allTimeQuantity,
        allTimeTotalAmount,
        paidQuantity,
        totalQuantity: allTimeQuantity,
        totalItems: allSales.length,
        totalSalesAmount: allTimeTotalAmount,
        outstandingAmount: financialOutstanding,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
