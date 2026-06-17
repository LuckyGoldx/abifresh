import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayStartISO = todayStart.toISOString();
    const todayEndISO = todayEnd.toISOString();

    // Fetch ALL credit sales (including cancelled)
    let allSalesQuery = supabaseAdmin
      .from('credit_sales')
      .select('id, total_amount, total_quantity, status, created_at');

    let todaySalesQuery = supabaseAdmin
      .from('credit_sales')
      .select('id, total_amount, total_quantity, status')
      .gte('created_at', todayStartISO)
      .lte('created_at', todayEndISO);

    if (isSalesStaff) {
      allSalesQuery = allSalesQuery.eq('staff_id', authResult.id);
      todaySalesQuery = todaySalesQuery.eq('staff_id', authResult.id);
    }

    const [allSalesRes, todaySalesRes] = await Promise.all([allSalesQuery, todaySalesQuery]);
    const allSales = allSalesRes.data || [];
    const todaySales = todaySalesRes.data || [];

    // Fetch approved payments for computing paid amounts
    let paymentsQuery = supabaseAdmin
      .from('credit_payments')
      .select('credit_sale_id, amount')
      .eq('status', 'approved');

    if (isSalesStaff) {
      paymentsQuery = paymentsQuery.eq('staff_id', authResult.id);
    }

    const { data: paymentsData } = await paymentsQuery;
    const payments = paymentsData || [];

    // Paid amount per sale
    const paidAmountBySale = new Map<string, number>();
    for (const p of payments) {
      const saleId = p.credit_sale_id;
      paidAmountBySale.set(saleId, (paidAmountBySale.get(saleId) || 0) + Number(p.amount));
    }

    // Get all cancelled sale IDs across all-time and today
    const allCancelledIds = allSales.filter(s => s.status === 'cancelled').map(s => s.id);
    const todayCancelledIds = todaySales.filter(s => s.status === 'cancelled').map(s => s.id);
    const allCancelledSet = new Set([...allCancelledIds, ...todayCancelledIds]);
    const allCancelledUnique = [...allCancelledSet];

    // Map from payment id to credit_sale_id for cancelled payments
    let paidQtyBySale = new Map<string, number>();
    let paidItemsMap = new Map<string, { itemId: string; qty: number }[]>();

    if (allCancelledUnique.length > 0) {
      const { data: cancelledPayments } = await supabaseAdmin
        .from('credit_payments')
        .select('id, credit_sale_id')
        .in('credit_sale_id', allCancelledUnique)
        .eq('status', 'approved');

      const paymentToSale = new Map<string, string>();
      for (const cp of cancelledPayments || []) {
        paymentToSale.set(cp.id, cp.credit_sale_id);
      }

      const cancelledPaymentIds = [...paymentToSale.keys()];

      if (cancelledPaymentIds.length > 0) {
        const { data: paymentItems } = await supabaseAdmin
          .from('credit_payment_items')
          .select('credit_payment_id, item_id, quantity')
          .in('credit_payment_id', cancelledPaymentIds);

        for (const pi of paymentItems || []) {
          const saleId = paymentToSale.get(pi.credit_payment_id);
          if (saleId) {
            paidQtyBySale.set(saleId, (paidQtyBySale.get(saleId) || 0) + Number(pi.quantity));

            // Track items with quantities for today's unique items count
            if (todayCancelledIds.includes(saleId)) {
              const entry = paidItemsMap.get(saleId) || [];
              entry.push({ itemId: pi.item_id, qty: Number(pi.quantity) || 0 });
              paidItemsMap.set(saleId, entry);
            }
          }
        }
      }
    }

    // Effective amount/quantity for a sale (paid portion for cancelled)
    const saleEffective = (sale: any) => {
      if (sale.status !== 'cancelled') {
        return {
          amount: Number(sale.total_amount) || 0,
          quantity: Number(sale.total_quantity) || 0,
        };
      }
      return {
        amount: paidAmountBySale.get(sale.id) || 0,
        quantity: paidQtyBySale.get(sale.id) || 0,
      };
    };

    // All-time totals
    let totalCreditsAmount = 0;
    let totalCreditsQuantity = 0;
    for (const sale of allSales) {
      const eff = saleEffective(sale);
      totalCreditsAmount += eff.amount;
      totalCreditsQuantity += eff.quantity;
    }

    // Today totals
    let todayCreditsAmount = 0;
    let todayQuantitySold = 0;
    const todayUniqueItems = new Set<string>();
    const todaySaleIds = todaySales.map(s => s.id);

    if (todaySaleIds.length > 0) {
      // Fetch items for today's sales (non-cancelled items count fully)
      const { data: todayItemsData } = await supabaseAdmin
        .from('credit_sale_items')
        .select('credit_sale_id, item_id, quantity')
        .in('credit_sale_id', todaySaleIds);

      for (const item of todayItemsData || []) {
        const sale = todaySales.find(s => s.id === item.credit_sale_id);
        if (!sale || sale.status !== 'cancelled') {
          todayUniqueItems.add(item.item_id);
          todayQuantitySold += Number(item.quantity) || 0;
        }
      }

      // Add paid items/quantities from cancelled sales
      for (const [, items] of paidItemsMap) {
        for (const pi of items) {
          if (pi.itemId) todayUniqueItems.add(pi.itemId);
          todayQuantitySold += pi.qty;
        }
      }
    }

    for (const sale of todaySales) {
      const eff = saleEffective(sale);
      todayCreditsAmount += eff.amount;
    }

    // Today's collections (approved payments made today)
    let todayPaymentsQuery = supabaseAdmin
      .from('credit_payments')
      .select('amount')
      .eq('status', 'approved')
      .gte('created_at', todayStartISO)
      .lte('created_at', todayEndISO);

    if (isSalesStaff) {
      todayPaymentsQuery = todayPaymentsQuery.eq('staff_id', authResult.id);
    }

    const { data: todayPayments } = await todayPaymentsQuery;
    const todayCreditsCollected = (todayPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);

    // Creditors count
    let creditorsQuery = supabaseAdmin.from('creditors').select('id').eq('is_active', true);
    if (isSalesStaff) {
      creditorsQuery = creditorsQuery.eq('added_by', authResult.id);
    }
    const { data: creditorsRes } = await creditorsQuery;

    // Total amount paid all-time
    const totalAmountPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
      total_credits_amount: totalCreditsAmount,
      total_credits_quantity: totalCreditsQuantity,
      total_creditors: creditorsRes?.length || 0,
      total_amount_paid: totalAmountPaid,
      today_credits_amount: todayCreditsAmount,
      today_credits_collected: todayCreditsCollected,
      today_credit_items: todayUniqueItems.size,
      today_quantity_sold: todayQuantitySold,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
