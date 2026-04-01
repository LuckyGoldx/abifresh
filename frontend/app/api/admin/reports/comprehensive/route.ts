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

  // Fetch receipts
  let receiptsQuery = supabaseAdmin
    .from('receipts')
    .select('*')
    .gte('created_at', fromISO)
    .lte('created_at', toISO);
  if (staffId) receiptsQuery = receiptsQuery.eq('staff_id', staffId);
  const { data: receiptsRaw, error: receiptsError } = await receiptsQuery;
  if (receiptsError) return NextResponse.json({ error: receiptsError.message }, { status: 400 });

  // Enrich receipts with user data
  const receiptStaffIds = [...new Set((receiptsRaw || []).map((r: any) => r.staff_id))];
  let receiptUsersMap = new Map<string, any>();
  if (receiptStaffIds.length > 0) {
    const { data: receiptStaffData } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .in('id', receiptStaffIds);
    (receiptStaffData || []).forEach((u: any) => receiptUsersMap.set(u.id, u));
  }
  const receipts = (receiptsRaw || []).map((r: any) => ({
    ...r,
    users: receiptUsersMap.get(r.staff_id) || { full_name: null, email: null, role: null },
  }));

  // Fetch receipt items
  const { data: receiptItems } = await supabaseAdmin
    .from('receipt_items')
    .select('*, items(id, name, category)')
    .in('receipt_id', receipts.map((r: any) => r.id));

  // Fetch expenses (use same date range as receipts for consistency)
  let expensesQuery = supabaseAdmin
    .from('staff_expenses')
    .select('*')
    .gte('expense_date', from.toISOString().split('T')[0])
    .lte('expense_date', to.toISOString().split('T')[0]);
  if (staffId) expensesQuery = expensesQuery.eq('staff_id', staffId);
  const { data: expensesRaw } = await expensesQuery;

  // Enrich expenses with user data
  const expenseStaffIds = [...new Set((expensesRaw || []).map((e: any) => e.staff_id))];
  let expenseUsersMap = new Map<string, any>();
  if (expenseStaffIds.length > 0) {
    const { data: expenseStaffData } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .in('id', expenseStaffIds);
    (expenseStaffData || []).forEach((u: any) => expenseUsersMap.set(u.id, u));
  }
  const expenses = (expensesRaw || []).map((e: any) => ({
    ...e,
    users: expenseUsersMap.get(e.staff_id) || { full_name: null, email: null, role: null },
  }));

  // Fetch all items for inventory data
  const { data: allItems } = await supabaseAdmin
    .from('items')
    .select('id,name,sku,category,unit_price,main_store_quantity,active_store_quantity,price_jalingo,price_outside')
    .order('name');

  const mainStoreArray = (allItems || [])
    .filter((item: any) => item.main_store_quantity > 0)
    .map((item: any) => ({
      id: item.id, item_id: item.id, item_name: item.name,
      quantity: item.main_store_quantity || 0, unit_price: item.unit_price || 0,
      sku: item.sku, category: item.category,
    }));

  const activeStoreArray = (allItems || [])
    .filter((item: any) => item.active_store_quantity > 0)
    .map((item: any) => ({
      id: item.id, item_id: item.id, item_name: item.name,
      quantity: item.active_store_quantity || 0, unit_price: item.unit_price || 0,
      sku: item.sku, category: item.category,
    }));

  const { data: staffStoreRaw } = await supabaseAdmin
    .from('staff_store')
    .select('*')
    .order('posted_date', { ascending: false });

  const staffStoreArray = (staffStoreRaw || []).map((storeItem: any) => {
    const itemData = (allItems || []).find((item: any) => item.id === storeItem.item_id);
    return {
      id: storeItem.id, staff_id: storeItem.staff_id, item_id: storeItem.item_id,
      item_name: itemData?.name || `Item ${storeItem.item_id}`,
      quantity: storeItem.quantity || 0,
      quantity_available: storeItem.quantity_available || 0,
      quantity_sold: storeItem.quantity_sold || 0,
      unit_price: itemData?.unit_price || 0, sku: itemData?.sku || 'N/A',
      category: itemData?.category || 'N/A', posted_date: storeItem.posted_date,
    };
  });

  // Summaries
  const totalRevenue = receipts.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.expense_amount || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalItemsSold = (receiptItems || []).reduce((sum: number, ri: any) => sum + (ri.quantity || 0), 0);
  const avgTransaction = receipts.length > 0 ? totalRevenue / receipts.length : 0;

  // Build lookup maps
  const itemsByReceiptId = new Map<string, any[]>();
  (receiptItems || []).forEach((item: any) => {
    if (!itemsByReceiptId.has(item.receipt_id)) itemsByReceiptId.set(item.receipt_id, []);
    itemsByReceiptId.get(item.receipt_id)!.push(item);
  });

  const receiptOutsideMap = new Map<string, boolean>();
  receipts.forEach((r: any) => receiptOutsideMap.set(r.id, r.sold_outside_jalingo || false));

  const itemPriceMap = new Map<string, any>();
  (allItems || []).forEach((item: any) => itemPriceMap.set(item.id, { price_jalingo: item.price_jalingo || 0, price_outside: item.price_outside || 0 }));

  // Group sales by staff
  const salesByStaff = new Map<string, any>();
  receipts.forEach((r: any) => {
    const staffName = r.users?.full_name || `Staff ${r.staff_id}`;
    if (!salesByStaff.has(r.staff_id)) {
      salesByStaff.set(r.staff_id, { staff_id: r.staff_id, staff_name: staffName, total_sales: 0, total_amount: 0, items_count: 0 });
    }
    const cur = salesByStaff.get(r.staff_id);
    cur.total_sales += 1;
    cur.total_amount += r.total_amount || 0;
    const items = itemsByReceiptId.get(r.id) || [];
    cur.items_count += items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  });

  // Group sales by role
  const salesByRole = new Map<string, any>();
  receipts.forEach((r: any) => {
    const role = r.users?.role || 'unknown';
    if (!salesByRole.has(role)) salesByRole.set(role, { role, total_sales: 0, total_amount: 0 });
    const cur = salesByRole.get(role);
    cur.total_sales += 1;
    cur.total_amount += r.total_amount || 0;
  });

  // Group sales by day
  const salesByDay = new Map<string, any>();
  receipts.forEach((r: any) => {
    const date = new Date(r.created_at).toISOString().split('T')[0];
    if (!salesByDay.has(date)) salesByDay.set(date, { date, total_sales: 0, total_amount: 0 });
    const cur = salesByDay.get(date);
    cur.total_sales += 1;
    cur.total_amount += r.total_amount || 0;
  });

  // Group items sold
  const itemsSold = new Map<string, any>();
  (receiptItems || []).forEach((ri: any) => {
    const itemName = ri.items?.name || `Item ${ri.item_id}`;
    if (!itemsSold.has(ri.item_id)) itemsSold.set(ri.item_id, { item_id: ri.item_id, item_name: itemName, quantity_sold: 0, total_revenue: 0 });
    const cur = itemsSold.get(ri.item_id);
    cur.quantity_sold += ri.quantity || 0;
    const soldOutside = receiptOutsideMap.get(ri.receipt_id) || false;
    const prices = itemPriceMap.get(ri.item_id);
    const unitPrice = soldOutside
      ? (prices?.price_outside || prices?.price_jalingo || ri.unit_price || 0)
      : (prices?.price_jalingo || ri.unit_price || 0);
    cur.total_revenue += unitPrice * (ri.quantity || 0);
  });
  itemsSold.forEach((item: any) => { item.avg_price = item.quantity_sold > 0 ? item.total_revenue / item.quantity_sold : 0; });

  // Group expenses
  const expensesByStaff = new Map<string, any>();
  const expensesByType = new Map<string, any>();
  const expensesByDay = new Map<string, any>();
  expenses.forEach((e: any) => {
    const staffName = e.users?.full_name || `Staff ${e.staff_id}`;
    if (!expensesByStaff.has(e.staff_id)) expensesByStaff.set(e.staff_id, { staff_id: e.staff_id, staff_name: staffName, total_amount: 0, count: 0 });
    expensesByStaff.get(e.staff_id).total_amount += e.expense_amount || 0;
    expensesByStaff.get(e.staff_id).count += 1;

    const type = e.expense_category || 'other';
    if (!expensesByType.has(type)) expensesByType.set(type, { expense_type: type, total_amount: 0, count: 0 });
    expensesByType.get(type).total_amount += e.expense_amount || 0;
    expensesByType.get(type).count += 1;

    const date = new Date(e.created_at).toISOString().split('T')[0];
    if (!expensesByDay.has(date)) expensesByDay.set(date, { date, total_amount: 0 });
    expensesByDay.get(date).total_amount += e.expense_amount || 0;
  });

  // Inventory totals + low stock
  const itemQuantitiesMap = new Map<string, any>();
  const addToQtyMap = (arr: any[], storeName: string) => {
    arr.forEach((item: any) => {
      if (!itemQuantitiesMap.has(item.item_id)) {
        itemQuantitiesMap.set(item.item_id, { item_id: item.item_id, item_name: item.item_name, total_quantity: 0, stores: [] });
      }
      const combo = itemQuantitiesMap.get(item.item_id);
      combo.total_quantity += item.quantity || 0;
      combo.stores.push({ store: storeName, quantity: item.quantity });
    });
  };
  addToQtyMap(mainStoreArray, 'Main');
  addToQtyMap(activeStoreArray, 'Active');
  addToQtyMap(staffStoreArray, 'Staff');

  const lowStockItems = Array.from(itemQuantitiesMap.values())
    .filter((item: any) => item.total_quantity < 100)
    .map((item: any) => ({
      ...item,
      status: item.total_quantity >= 50 ? 'Low' : item.total_quantity >= 20 ? 'Critical' : 'Urgent',
    }));

  // Staff performance
  const staffPerformanceMap = new Map<string, any>();
  Array.from(salesByStaff.values()).forEach((sale: any) => {
    staffPerformanceMap.set(sale.staff_id, {
      staff_id: sale.staff_id, staff_name: sale.staff_name, role: 'unknown',
      total_transactions: sale.total_sales, total_revenue: sale.total_amount,
      total_expenses: 0, profit_loss: 0,
    });
  });
  expenses.forEach((e: any) => {
    if (!staffPerformanceMap.has(e.staff_id)) {
      staffPerformanceMap.set(e.staff_id, {
        staff_id: e.staff_id, staff_name: e.users?.full_name || `Staff ${e.staff_id}`,
        role: e.users?.role || 'unknown', total_transactions: 0, total_revenue: 0, total_expenses: 0, profit_loss: 0,
      });
    }
    const cur = staffPerformanceMap.get(e.staff_id);
    cur.total_expenses += e.expense_amount || 0;
    cur.role = e.users?.role || cur.role;
  });
  staffPerformanceMap.forEach((s: any) => { s.profit_loss = s.total_revenue - s.total_expenses; });

  const topStaff = Array.from(salesByStaff.values()).sort((a, b) => b.total_amount - a.total_amount).slice(0, 5);
  const topItems = Array.from(itemsSold.values()).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5);

  return NextResponse.json({
    summary: {
      total_sales: receipts.length, total_revenue: totalRevenue, total_expenses: totalExpenses,
      total_profit: totalProfit, total_items_sold: totalItemsSold, avg_transaction: avgTransaction,
    },
    sales: {
      by_staff: Array.from(salesByStaff.values()),
      by_staff_role: Array.from(salesByRole.values()),
      by_day: Array.from(salesByDay.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      items_list: Array.from(itemsSold.values()).sort((a, b) => b.total_revenue - a.total_revenue),
    },
    expenses: {
      total: totalExpenses,
      by_staff: Array.from(expensesByStaff.values()),
      by_type: Array.from(expensesByType.values()),
      by_day: Array.from(expensesByDay.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    },
    inventory: {
      main_store_total: mainStoreArray.length,
      main_store_total_quantity: mainStoreArray.reduce((s: number, i: any) => s + i.quantity, 0),
      main_store_items: mainStoreArray,
      active_store_total: activeStoreArray.length,
      active_store_total_quantity: activeStoreArray.reduce((s: number, i: any) => s + i.quantity, 0),
      active_store_items: activeStoreArray,
      staff_store_total: staffStoreArray.length,
      staff_store_total_quantity: staffStoreArray.reduce((s: number, i: any) => s + i.quantity, 0),
      staff_store_items: staffStoreArray,
      low_stock_total: lowStockItems.length,
      low_stock_total_quantity: lowStockItems.reduce((s: number, i: any) => s + i.total_quantity, 0),
      low_stock_items: lowStockItems,
    },
    performance: {
      top_staff: topStaff,
      top_items: topItems,
      staff_details: Array.from(staffPerformanceMap.values()),
    },
  });
}
