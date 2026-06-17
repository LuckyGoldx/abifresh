import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateRange = (searchParams.get('dateRange') || 'month') as string;
  const customFrom = searchParams.get('customFrom') || undefined;
  const customTo = searchParams.get('customTo') || undefined;
  const staffId = searchParams.get('staffId') || undefined;

  // Calculate date range
  const now = new Date();
  let from = new Date();
  let to = new Date();

  switch (dateRange) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'week':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      from = new Date('1900-01-01');
      break;
    case 'custom':
      if (customFrom) from = new Date(customFrom);
      if (customTo) to = new Date(customTo);
      break;
  }

  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  try {
    // 1. Fetch Credit Sales
    let salesQuery = supabaseAdmin
      .from('credit_sales')
      .select('*, creditors(full_name), users:staff_id(full_name, username)')
      .gte('created_at', fromISO)
      .lte('created_at', toISO);
    
    if (staffId) salesQuery = salesQuery.eq('staff_id', staffId);
    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    // 2. Fetch Credit Payments
    let paymentsQuery = supabaseAdmin
      .from('credit_payments')
      .select('*, creditors(full_name), users:staff_id(full_name, username)')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .eq('status', 'approved');
    
    if (staffId) paymentsQuery = paymentsQuery.eq('staff_id', staffId);
    const { data: payments, error: paymentsError } = await paymentsQuery;
    if (paymentsError) throw paymentsError;

    // 3. Fetch Sale Items and Payment Items for cost/profit calculations
    const saleIds = (sales || []).map(s => s.id);
    let itemsData: any[] = [];
    if (saleIds.length > 0) {
      const { data: saleItems } = await supabaseAdmin
        .from('credit_sale_items')
        .select('*, item:item_id(price_jalingo), credit_sales(staff_id, creditor_id, status)')
        .in('credit_sale_id', saleIds);
      itemsData = saleItems || [];
    }

    // 3b. Fetch credit_payment_items for approved payments to track paid quantities and amounts
    const paymentIds = (payments || []).map(p => p.id);
    let paymentItems: any[] = [];
    if (paymentIds.length > 0) {
      const { data: pi } = await supabaseAdmin
        .from('credit_payment_items')
        .select('credit_sale_item_id, quantity, amount')
        .in('credit_payment_id', paymentIds);
      paymentItems = pi || [];
    }

    // Build map: credit_sale_item_id → total paid quantity and total paid amount (from approved payments)
    const paidQtyMap = new Map<string, number>();
    const paidAmountMap = new Map<string, number>();
    paymentItems.forEach(pi => {
      if (pi.credit_sale_item_id) {
        paidQtyMap.set(pi.credit_sale_item_id, (paidQtyMap.get(pi.credit_sale_item_id) || 0) + (Number(pi.quantity) || 0));
        paidAmountMap.set(pi.credit_sale_item_id, (paidAmountMap.get(pi.credit_sale_item_id) || 0) + (Number(pi.amount) || 0));
      }
    });

    // Fetch credit_sale_items referenced by payment items that are NOT in itemsData
    // (handles payments made in this period for sales from previous periods)
    let paidItemsData: any[] = [];
    const missingItemIds = [...paidQtyMap.keys()].filter(id => !itemsData.some(ri => ri.id === id));
    if (missingItemIds.length > 0) {
    const { data: extraItems } = await supabaseAdmin
      .from('credit_sale_items')
      .select('*, item:item_id(price_jalingo), credit_sales(staff_id, creditor_id, status)')
      .in('id', missingItemIds);
    paidItemsData = extraItems || [];
    }

    // Helper: get effective selling price matching payment allocation logic
    const getSellingPrice = (ri: any): number => {
      return Number(ri.item?.price_jalingo) || Number(ri.unit_price) || 0;
    };

    // Helper: check if sale is cancelled from item's credit_sales join
    const isCancelled = (ri: any): boolean => {
      const sale = Array.isArray(ri.credit_sales) ? ri.credit_sales[0] : ri.credit_sales;
      return sale?.status === 'cancelled';
    };

    // --- CALCULATIONS ---
    // Compute issuance and quantity from credit_sale_items so cancelled sales
    // with partial payment contribute only their paid portion

    let totalIssuance = 0;
    let totalQuantity = 0;
    let totalCostPriceIssued = 0;
    let cancelledUnpaidAmount = 0;
    let cancelledUnpaidQuantity = 0;
    let cancelledUnpaidItems = 0;
    let cancelledCost = 0;

    itemsData.forEach((ri: any) => {
      const qty = Number(ri.quantity) || 0;
      const paidQty = Number(ri.quantity_paid) || 0;
      const sellingPrice = getSellingPrice(ri);
      const costPrice = Number(ri.cost_price) || 0;
      const cancelled = isCancelled(ri);

      if (cancelled) {
        // Use actual payment amounts from credit_payment_items for cancelled items
        // This ensures totalIssuance matches totalCollection exactly
        const actualPaidAmount = paidAmountMap.get(ri.id) || 0;
        const fullAmount = qty * sellingPrice;
        const fullCost = qty * costPrice;
        const paidRatio = fullAmount > 0 ? actualPaidAmount / fullAmount : 0;
        totalIssuance += actualPaidAmount;
        totalQuantity += paidQty;
        totalCostPriceIssued += paidRatio * fullCost;
        const unpaidAmount = fullAmount - actualPaidAmount;
        cancelledUnpaidAmount += unpaidAmount;
        cancelledUnpaidQuantity += qty - paidQty;
        cancelledCost += (1 - paidRatio) * fullCost;
        if (unpaidAmount > 0) cancelledUnpaidItems += 1;
      } else {
        totalIssuance += qty * sellingPrice;
        totalQuantity += qty;
        totalCostPriceIssued += qty * costPrice;
      }
    });

    const totalIssuanceWithCancelled = totalIssuance + cancelledUnpaidAmount;
    const cancelRate = totalIssuanceWithCancelled > 0
      ? (cancelledUnpaidAmount / totalIssuanceWithCancelled) * 100
      : 0;

    const totalCollection = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalTransactions = (sales || []).length + (payments || []).length;

    // Total cost price of items money has been collected for (matched via credit_payment_items)
    // Includes items from current period AND previous periods that received payments this period
    const allPaidItems = [...itemsData, ...paidItemsData];
    const totalCostPriceCollected = allPaidItems.reduce((sum, ri) => {
      const paidQty = paidQtyMap.get(ri.id) || 0;
      const effectivePaid = Math.min(paidQty, Number(ri.quantity) || 0);
      return sum + effectivePaid * (Number(ri.cost_price) || 0);
    }, 0);

    const creditProfit = totalCollection - totalCostPriceCollected;

    // Outstanding credit quantity (items not fully paid, excluding cancelled)
    const creditQuantity = itemsData.reduce((sum, ri) => {
      if (isCancelled(ri)) return sum;
      const qty = Number(ri.quantity) || 0;
      const paid = Number(ri.quantity_paid) || 0;
      return sum + Math.max(0, qty - paid);
    }, 0);

    // All-time total quantity (ignoring date filter)
    // For cancelled sales, only count what was paid
    const { data: allTimeSales } = await supabaseAdmin
      .from('credit_sales')
      .select('id, total_quantity, status');

    const { data: allTimeItems } = await supabaseAdmin
      .from('credit_sale_items')
      .select('credit_sale_id, quantity, quantity_paid')
      .in('credit_sale_id', (allTimeSales || []).map(s => s.id).filter(Boolean));

    const allTimeSaleStatus = new Map((allTimeSales || []).map(s => [s.id, s.status]));
    let totalQuantityAllTime = 0;
    (allTimeItems || []).forEach((ri: any) => {
      const status = allTimeSaleStatus.get(ri.credit_sale_id);
      const qty = Number(ri.quantity) || 0;
      const paidQty = Number(ri.quantity_paid) || 0;
      if (status === 'cancelled') {
        totalQuantityAllTime += paidQty;
      } else {
        totalQuantityAllTime += qty;
      }
    });

    // Trends (Group by Day) — skip cancelled sales for issuance, their paid portion is in payments
    const trends: Record<string, { date: string; issuance: number; collection: number }> = {};
    (sales || []).forEach(s => {
      if (s.status === 'cancelled') return;
      const d = s.created_at.split('T')[0];
      if (!trends[d]) trends[d] = { date: d, issuance: 0, collection: 0 };
      trends[d].issuance += Number(s.total_amount) || 0;
    });
    (payments || []).forEach(p => {
      const d = p.created_at.split('T')[0];
      if (!trends[d]) trends[d] = { date: d, issuance: 0, collection: 0 };
      trends[d].collection += Number(p.amount) || 0;
    });

    // Staff Performance — compute from itemsData (consistent with summary cards)
    const staffPerf: Record<string, { staff_name: string; issuance: number; collection: number; transactions: number; saleIds: Set<string> }> = {};
    itemsData.forEach((ri: any) => {
      const sale = Array.isArray(ri.credit_sales) ? ri.credit_sales[0] : ri.credit_sales;
      const id = sale?.staff_id || 'unknown';
      const qty = Number(ri.quantity) || 0;
      const paidQty = Number(ri.quantity_paid) || 0;
      const sellingPrice = getSellingPrice(ri);
      const cancelled = isCancelled(ri);
      const issuanceAmount = cancelled ? (paidAmountMap.get(ri.id) || 0) : qty * sellingPrice;
      if (!staffPerf[id]) staffPerf[id] = { staff_name: 'Loading...', issuance: 0, collection: 0, transactions: 0, saleIds: new Set() };
      staffPerf[id].issuance += issuanceAmount;
      staffPerf[id].saleIds.add(ri.credit_sale_id);
    });
    // Convert saleIds sets to counts
    Object.values(staffPerf).forEach(p => { p.transactions = p.saleIds.size; });
    // Override staff names from the sales query
    (sales || []).forEach(s => {
      if (staffPerf[s.staff_id]) {
        staffPerf[s.staff_id].staff_name = s.users?.full_name || s.users?.username || 'Unknown';
      }
    });
    (payments || []).forEach(p => {
      const id = p.staff_id;
      const name = p.users?.full_name || p.users?.username || 'Unknown';
      if (!staffPerf[id]) staffPerf[id] = { staff_name: name, issuance: 0, collection: 0, transactions: 0, saleIds: new Set() };
      staffPerf[id].collection += Number(p.amount) || 0;
    });

    // Item Analysis
    const itemAnalysis: Record<string, { item_name: string; quantity: number; amount: number }> = {};
    itemsData.forEach(ri => {
      const name = ri.item_name;
      if (!itemAnalysis[name]) itemAnalysis[name] = { item_name: name, quantity: 0, amount: 0 };
      const qty = Number(ri.quantity) || 0;
      const paidQty = Number(ri.quantity_paid) || 0;
      const sellingPrice = getSellingPrice(ri);
      if (isCancelled(ri)) {
        const actualPaidAmount = paidAmountMap.get(ri.id) || 0;
        itemAnalysis[name].quantity += paidQty;
        itemAnalysis[name].amount += actualPaidAmount;
      } else {
        itemAnalysis[name].quantity += qty;
        itemAnalysis[name].amount += qty * sellingPrice;
      }
    });

    // Creditor Leaderboard — compute from itemsData (consistent with summary cards)
    const creditorPerf: Record<string, { creditor_name: string; issuance: number; collection: number }> = {};
    itemsData.forEach((ri: any) => {
      const sale = Array.isArray(ri.credit_sales) ? ri.credit_sales[0] : ri.credit_sales;
      const id = sale?.creditor_id || ri.credit_sale_id || 'unknown';
      const qty = Number(ri.quantity) || 0;
      const paidQty = Number(ri.quantity_paid) || 0;
      const sellingPrice = getSellingPrice(ri);
      const cancelled = isCancelled(ri);
      const issuanceAmount = cancelled ? (paidAmountMap.get(ri.id) || 0) : qty * sellingPrice;
      if (!creditorPerf[id]) creditorPerf[id] = { creditor_name: 'Loading...', issuance: 0, collection: 0 };
      creditorPerf[id].issuance += issuanceAmount;
    });
    // Override creditor names from the sales query
    (sales || []).forEach(s => {
      if (creditorPerf[s.creditor_id]) {
        creditorPerf[s.creditor_id].creditor_name = s.creditors?.full_name || 'Unknown';
      }
    });
    (payments || []).forEach(p => {
      const id = p.creditor_id;
      const name = p.creditors?.full_name || 'Unknown';
      if (!creditorPerf[id]) creditorPerf[id] = { creditor_name: name, issuance: 0, collection: 0 };
      creditorPerf[id].collection += Number(p.amount) || 0;
    });

    // 5. Fetch ALL staff who have EVER used the credit system (issuance, collection, or adding creditors)
    const { data: salesStaffIds } = await supabaseAdmin.from('credit_sales').select('staff_id');
    const { data: paymentsStaffIds } = await supabaseAdmin.from('credit_payments').select('staff_id');
    const { data: addedByStaffIds } = await supabaseAdmin.from('creditors').select('added_by');

    const uniqueActiveIds = [...new Set([
      ...(salesStaffIds || []).map(s => s.staff_id),
      ...(paymentsStaffIds || []).map(p => p.staff_id),
      ...(addedByStaffIds || []).map(c => c.added_by)
    ])].filter(Boolean);

    let activeStaffList: any[] = [];
    if (uniqueActiveIds.length > 0) {
      const { data: activeStaff } = await supabaseAdmin
        .from('users')
        .select('id, full_name, username')
        .in('id', uniqueActiveIds);
      activeStaffList = activeStaff || [];
    }

    return NextResponse.json({
      summary: {
        total_issuance: totalIssuance,
        total_collection: totalCollection,
        total_cost_price_issued: totalCostPriceIssued,
        total_cost_price_collected: totalCostPriceCollected,
        credit_profit: creditProfit,
        total_quantity: totalQuantity,
        total_quantity_all_time: totalQuantityAllTime,
        credit_quantity: creditQuantity,
        total_transactions: totalTransactions,
        collection_rate: totalIssuance > 0 ? (totalCollection / totalIssuance) * 100 : 0,
        total_issuance_with_cancelled: totalIssuanceWithCancelled,
        cancelled_unpaid_amount: cancelledUnpaidAmount,
        cancelled_unpaid_quantity: cancelledUnpaidQuantity,
        cancelled_unpaid_items: cancelledUnpaidItems,
        cancelled_cost: cancelledCost,
        cancel_rate: cancelRate,
      },
      active_staff: activeStaffList,
      trends: Object.values(trends).sort((a, b) => a.date.localeCompare(b.date)),
      staff_performance: Object.values(staffPerf).map(p => ({ staff_name: p.staff_name, issuance: p.issuance, collection: p.collection, transactions: p.transactions })).sort((a, b) => b.issuance - a.issuance),
      item_analysis: Object.values(itemAnalysis).sort((a, b) => b.amount - a.amount),
      creditor_performance: Object.values(creditorPerf).sort((a, b) => b.issuance - a.issuance),
      raw: {
        sales: sales || [],
        payments: payments || []
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
