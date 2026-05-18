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

    // Step 3: Get payments submitted by this user (exclude admin-paid commissions
    // which belong to /sales/commissions, not /sales/payments)
    const { data: paymentsData } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, items_paid_for, status, created_at')
      .eq('staff_id', userId)
      .eq('payment_type', 'sale');

    const approvedSaleIds = new Set<string>();
    const pendingSaleIds = new Set<string>();
    const rejectedSaleIds = new Set<string>();
    const paidOrPendingQuantities = new Map<string, number>();

    if (paymentsData) {
      paymentsData.forEach((payment: any) => {
        if (payment.items_paid_for && Array.isArray(payment.items_paid_for)) {
          payment.items_paid_for.forEach((paidItem: any) => {
            const saleIds: string[] = Array.isArray(paidItem.sale_ids)
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
                  const originalItem = salesItemsData?.find((si: any) => si.id === sid);
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todaysTotalQuantity = 0;
    let todaysTotalAmount = 0;
    let allTimeQuantity = 0;
    let allTimeTotalAmount = 0;
    let paidQuantity = 0;

    const allSales = (salesItemsData || []).map((item: any) => {
      const itemObj = Array.isArray(item.items) ? item.items[0] : item.items;
      const originalQuantity = parseFloat(item.quantity) || 0;
      const paidOrPendingQty = paidOrPendingQuantities.get(item.id) || 0;
      const remainingQuantity = Math.max(0, originalQuantity - paidOrPendingQty);
      
      const unitPrice = parseFloat(item.unit_price) || 0;
      const totalAmount = remainingQuantity * unitPrice;
      const originalTotalAmount = originalQuantity * unitPrice;
      const saleDate = new Date(item.created_at);

      const isApproved = remainingQuantity === 0 && (approvedSaleIds.has(item.id) || !pendingSaleIds.has(item.id));
      const isPending = remainingQuantity === 0 && pendingSaleIds.has(item.id);
      const isRejected = rejectedSaleIds.has(item.id);

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
        quantity: remainingQuantity,
        original_quantity: originalQuantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        sale_date: item.created_at,
        isApproved,
        isPending,
        isRejected,
      };
    });

    // Filter: return items that have outstanding unpaid quantity (remaining > 0)
    const unpaidItems = allSales.filter((item: any) => item.quantity > 0);

    const approvedAmount = (paymentsData || [])
      .filter((p: any) => p.status === 'approved')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
    const pendingAmount = (paymentsData || [])
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
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
