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
      .lte('created_at', toISO)
      .neq('status', 'cancelled');
    
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
        .select('*, credit_sales(staff_id)')
        .in('credit_sale_id', saleIds);
      itemsData = saleItems || [];
    }

    // 3b. Fetch credit_payment_items for approved payments to track paid quantities
    const paymentIds = (payments || []).map(p => p.id);
    let paymentItems: any[] = [];
    if (paymentIds.length > 0) {
      const { data: pi } = await supabaseAdmin
        .from('credit_payment_items')
        .select('credit_sale_item_id, quantity')
        .in('credit_payment_id', paymentIds);
      paymentItems = pi || [];
    }

    // Build map: credit_sale_item_id → total paid quantity (from approved payments)
    const paidQtyMap = new Map<string, number>();
    paymentItems.forEach(pi => {
      if (pi.credit_sale_item_id) {
        paidQtyMap.set(pi.credit_sale_item_id, (paidQtyMap.get(pi.credit_sale_item_id) || 0) + (Number(pi.quantity) || 0));
      }
    });

    // Fetch credit_sale_items referenced by payment items that are NOT in itemsData
    // (handles payments made in this period for sales from previous periods)
    let paidItemsData: any[] = [];
    const missingItemIds = [...paidQtyMap.keys()].filter(id => !itemsData.some(ri => ri.id === id));
    if (missingItemIds.length > 0) {
      const { data: extraItems } = await supabaseAdmin
        .from('credit_sale_items')
        .select('*, credit_sales(staff_id)')
        .in('id', missingItemIds);
      paidItemsData = extraItems || [];
    }

    // --- CALCULATIONS ---

    // Summary
    const totalIssuance = (sales || []).reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const totalCollection = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalQuantity = (sales || []).reduce((sum, s) => sum + (Number(s.total_quantity) || 0), 0);
    const totalTransactions = (sales || []).length + (payments || []).length;

    // Total cost price of ALL items given on credit in this period (issued)
    const totalCostPriceIssued = itemsData.reduce((sum, ri) => {
      return sum + (Number(ri.quantity) || 0) * (Number(ri.cost_price) || 0);
    }, 0);

    // Total cost price of items money has been collected for (matched via credit_payment_items)
    // Includes items from current period AND previous periods that received payments this period
    const allPaidItems = [...itemsData, ...paidItemsData];
    const totalCostPriceCollected = allPaidItems.reduce((sum, ri) => {
      const paidQty = paidQtyMap.get(ri.id) || 0;
      const effectivePaid = Math.min(paidQty, Number(ri.quantity) || 0);
      return sum + effectivePaid * (Number(ri.cost_price) || 0);
    }, 0);

    const creditProfit = totalCollection - totalCostPriceCollected;

    // Trends (Group by Day)
    const trends: Record<string, { date: string; issuance: number; collection: number }> = {};
    (sales || []).forEach(s => {
      const d = s.created_at.split('T')[0];
      if (!trends[d]) trends[d] = { date: d, issuance: 0, collection: 0 };
      trends[d].issuance += Number(s.total_amount) || 0;
    });
    (payments || []).forEach(p => {
      const d = p.created_at.split('T')[0];
      if (!trends[d]) trends[d] = { date: d, issuance: 0, collection: 0 };
      trends[d].collection += Number(p.amount) || 0;
    });

    // Staff Performance
    const staffPerf: Record<string, { staff_name: string; issuance: number; collection: number; transactions: number }> = {};
    (sales || []).forEach(s => {
      const id = s.staff_id;
      const name = s.users?.full_name || s.users?.username || 'Unknown';
      if (!staffPerf[id]) staffPerf[id] = { staff_name: name, issuance: 0, collection: 0, transactions: 0 };
      staffPerf[id].issuance += Number(s.total_amount) || 0;
      staffPerf[id].transactions += 1;
    });
    (payments || []).forEach(p => {
      const id = p.staff_id;
      const name = p.users?.full_name || p.users?.username || 'Unknown';
      if (!staffPerf[id]) staffPerf[id] = { staff_name: name, issuance: 0, collection: 0, transactions: 0 };
      staffPerf[id].collection += Number(p.amount) || 0;
      staffPerf[id].transactions += 1;
    });

    // Item Analysis
    const itemAnalysis: Record<string, { item_name: string; quantity: number; amount: number }> = {};
    itemsData.forEach(ri => {
      const name = ri.item_name;
      if (!itemAnalysis[name]) itemAnalysis[name] = { item_name: name, quantity: 0, amount: 0 };
      itemAnalysis[name].quantity += Number(ri.quantity) || 0;
      itemAnalysis[name].amount += (Number(ri.quantity) || 0) * (Number(ri.unit_price) || 0);
    });

    // Creditor Leaderboard
    const creditorPerf: Record<string, { creditor_name: string; issuance: number; collection: number }> = {};
    (sales || []).forEach(s => {
      const id = s.creditor_id;
      const name = s.creditors?.full_name || 'Unknown';
      if (!creditorPerf[id]) creditorPerf[id] = { creditor_name: name, issuance: 0, collection: 0 };
      creditorPerf[id].issuance += Number(s.total_amount) || 0;
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
        total_transactions: totalTransactions,
        collection_rate: totalIssuance > 0 ? (totalCollection / totalIssuance) * 100 : 0
      },
      active_staff: activeStaffList,
      trends: Object.values(trends).sort((a, b) => a.date.localeCompare(b.date)),
      staff_performance: Object.values(staffPerf).sort((a, b) => b.issuance - a.issuance),
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
