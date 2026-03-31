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

    // Step 2: Get sales_items for those sales
    const { data: salesItemsData, error: itemsError } = await supabaseAdmin
      .from('sales_items')
      .select(`
        id, sale_id, item_id, quantity, unit_price, logistics_fee, created_at,
        items:item_id (id, name, unit_price)
      `)
      .in('sale_id', saleIds)
      .order('created_at', { ascending: false });

    if (itemsError) throw itemsError;

    // Step 3: Get all payments for this user
    const { data: paymentsData } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, items_paid_for, status, created_at')
      .eq('staff_id', userId);

    const approvedPayments = (paymentsData || []).filter((p: any) => p.status === 'approved');
    const pendingPayments = (paymentsData || []).filter((p: any) => p.status === 'pending');

    const paidItemIds = new Set<string>();
    const pendingItemIds = new Set<string>();

    for (const payment of approvedPayments) {
      const items = payment.items_paid_for || [];
      items.forEach((item: any) => { if (item.id) paidItemIds.add(item.id); });
    }
    for (const payment of pendingPayments) {
      const items = payment.items_paid_for || [];
      items.forEach((item: any) => { if (item.id) pendingItemIds.add(item.id); });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todaysTotalQuantity = 0;
    let todaysTotalAmount = 0;
    let allTimeQuantity = 0;
    let allTimeTotalAmount = 0;
    let paidQuantity = 0;

    const allItems = (salesItemsData || []).map((item: any) => {
      const itemObj = Array.isArray(item.items) ? item.items[0] : item.items;
      const totalAmount = item.quantity * item.unit_price;
      const saleDate = new Date(item.created_at);
      const isApproved = paidItemIds.has(item.id);
      const isPending = pendingItemIds.has(item.id);

      allTimeQuantity += item.quantity;
      allTimeTotalAmount += totalAmount;

      if (saleDate >= today) {
        todaysTotalQuantity += item.quantity;
        todaysTotalAmount += totalAmount;
      }

      if (isApproved) paidQuantity += item.quantity;

      return {
        id: item.id,
        item_id: item.item_id,
        item_name: itemObj?.name || 'Unknown',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: totalAmount,
        sale_date: item.created_at,
        isApproved,
        isPending,
        isRejected: false,
      };
    });

    // Filter: return items not in approved or pending state
    const unpaidItems = allItems.filter((item: any) => !item.isApproved && !item.isPending);

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
        totalItems: allItems.length,
        totalSalesAmount: allTimeTotalAmount,
        outstandingAmount: Math.max(0, outstandingAmount),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
