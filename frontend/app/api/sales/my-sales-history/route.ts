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
      .or('payment_type.neq.commission,paid_by.is.null');

    const approvedPayments = (paymentsData || []).filter((p: any) => p.status === 'approved');
    const pendingPayments = (paymentsData || []).filter((p: any) => p.status === 'pending');

    const paidItemIds = new Set<string>();
    const pendingItemIds = new Set<string>();

    for (const payment of approvedPayments) {
      (payment.items_paid_for || []).forEach((item: any) => {
        (item.sale_ids || []).forEach((sid: string) => { if (sid) paidItemIds.add(String(sid)); });
      });
    }
    for (const payment of pendingPayments) {
      (payment.items_paid_for || []).forEach((item: any) => {
        (item.sale_ids || []).forEach((sid: string) => { if (sid) pendingItemIds.add(String(sid)); });
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

      const soldOutsideJalingo = saleObj?.sold_outside_jalingo || false;
      const baseUnitPrice = parseFloat(item.unit_price) || 0;
      const logisticsFee = parseFloat(item.logistics_fee) || 0;
      const effectiveUnitPrice = soldOutsideJalingo ? baseUnitPrice + logisticsFee : baseUnitPrice;
      const originalTotalAmount = originalQuantity * effectiveUnitPrice;
      const saleDate = new Date(item.created_at);

      const isApproved = paidItemIds.has(item.id);
      const isPending = pendingItemIds.has(item.id);

      allTimeQuantity += originalQuantity;
      allTimeTotalAmount += originalTotalAmount;

      if (saleDate >= today) {
        todaysTotalQuantity += originalQuantity;
        todaysTotalAmount += originalTotalAmount;
      }

      if (isApproved) paidQuantity += originalQuantity;

      return {
        id: item.id,
        item_id: item.item_id,
        item_name: itemObj?.name || 'Unknown',
        quantity: originalQuantity,
        unit_price: effectiveUnitPrice,
        total_amount: originalTotalAmount,
        sale_date: item.created_at,
        sold_outside_jalingo: soldOutsideJalingo,
        isApproved,
        isPending,
      };
    });

    // Filter: return items not in approved or pending state
    const unpaidItems = allSales.filter((item: any) => !item.isApproved && !item.isPending);

    const approvedAmount = approvedPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
    const pendingAmount = pendingPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
    const outstandingAmount = allTimeTotalAmount - approvedAmount - pendingAmount;

    return NextResponse.json({
      allItems: unpaidItems,
      stats: {
        todaysTotalQuantity,
        todaysTotalAmount,
        allTimeQuantity,
        allTimeTotalAmount,
        paidQuantity,
        totalQuantity: allTimeQuantity,
        totalItems: allSales.length,
        totalSalesAmount: allTimeTotalAmount,
        outstandingAmount: Math.max(0, outstandingAmount),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
