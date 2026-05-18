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
  const dateRange = (searchParams.get('dateRange') || 'all') as string;
  const customFrom = searchParams.get('customFrom') || undefined;
  const customTo = searchParams.get('customTo') || undefined;
  const staffId = searchParams.get('staffId') || undefined;
  const staffRole = searchParams.get('staffRole') || undefined;

  try {
    // 1. Calculate Date Range ISO Boundaries
    const now = new Date();
    let from = new Date();
    let to = new Date();
    let applyDateFilter = true;

    switch (dateRange) {
      case 'all':
        applyDateFilter = false;
        break;
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'yesterday':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'custom':
        if (customFrom) from = new Date(customFrom);
        if (customTo) {
          // Set to end of custom day
          const toDate = new Date(customTo);
          to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
        }
        break;
    }

    const fromISO = applyDateFilter ? from.toISOString() : 'N/A';
    const toISO = applyDateFilter ? to.toISOString() : 'N/A';

    // 2. Fetch Users Map for Quick Enrichment
    const { data: usersRaw, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, username, email');
    if (usersError) throw usersError;

    const usersMap = new Map<string, any>();
    (usersRaw || []).forEach((u: any) => usersMap.set(u.id, u));

    // Resolve Role-based Staff Filter
    let roleStaffIds: string[] | null = null;
    if (staffRole && !staffId) {
      const roleMap: Record<string, string[]> = {
        'admin': ['admin', 'superadmin'],
        'superadmin': ['superadmin'],
        'sales': ['sales', 'sales_staff'],
        'commission': ['commission_staff', 'staff_commission'],
        'non_commission': ['non_commission_staff', 'staff_non_commission'],
      };
      const targetRoles = roleMap[staffRole] || [staffRole];
      roleStaffIds = (usersRaw || [])
        .filter((u: any) => targetRoles.includes(u.role))
        .map((u: any) => u.id);
    }

    // 3. Fetch Receipts
    let receiptsQuery = supabaseAdmin
      .from('receipts')
      .select('id, staff_id, total_amount, sold_outside_jalingo, created_at');

    if (applyDateFilter) {
      receiptsQuery = receiptsQuery
        .gte('created_at', fromISO)
        .lte('created_at', toISO);
    }

    if (staffId) {
      receiptsQuery = receiptsQuery.eq('staff_id', staffId);
    } else if (roleStaffIds !== null) {
      if (roleStaffIds.length === 0) {
        // No staff matches this role, return empty early
        return NextResponse.json({
          stats: { totalAmountSold: 0, totalTransactions: 0, totalItemsSold: 0, totalQuantitySold: 0 },
          items: [],
          salesTrend: [],
          staffPerformance: [],
          filters: { dateRange, resolvedFrom: fromISO, resolvedTo: toISO }
        });
      }
      receiptsQuery = receiptsQuery.in('staff_id', roleStaffIds);
    }

    const { data: receipts, error: receiptsError } = await receiptsQuery;
    if (receiptsError) throw receiptsError;

    const receiptIds = (receipts || []).map((r: any) => r.id);

    // 4. Fetch Receipt Items
    let receiptItems: any[] = [];
    if (receiptIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabaseAdmin
        .from('receipt_items')
        .select('id, receipt_id, item_id, quantity, unit_price, total_price')
        .in('receipt_id', receiptIds);
      if (itemsError) throw itemsError;
      receiptItems = itemsData || [];
    }

    // 5. Fetch All Products/Items in the system
    const { data: dbItems, error: dbItemsError } = await supabaseAdmin
      .from('items')
      .select('id, name, sku, category, unit_price, brand, package_type')
      .order('name');
    if (dbItemsError) throw dbItemsError;

    // 6. Aggregate Overall Statistics
    const totalAmountSold = (receipts || []).reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    const totalTransactions = (receipts || []).length;
    const totalQuantitySold = receiptItems.reduce((sum, ri) => sum + (Number(ri.quantity) || 0), 0);
    const totalItemsSold = new Set(receiptItems.map(ri => ri.item_id)).size;

    // 7. Group Receipts by Date for Sales Trend
    const trendMap = new Map<string, number>();
    (receipts || []).forEach((r: any) => {
      const dateStr = new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + (Number(r.total_amount) || 0));
    });

    const salesTrend = Array.from(trendMap.entries()).map(([date, revenue]) => ({
      date,
      revenue
    }));

    // If empty trend, pad with current range dates to look nice
    if (salesTrend.length === 0) {
      salesTrend.push({ date: from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: 0 });
      salesTrend.push({ date: new Date(to.getTime() - 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: 0 });
    }

    // 8. Group by Staff for Staff Performance
    const staffPerfMap = new Map<string, { quantity: number; revenue: number; transactions: Set<string> }>();
    (receipts || []).forEach((r: any) => {
      if (!staffPerfMap.has(r.staff_id)) {
        staffPerfMap.set(r.staff_id, { quantity: 0, revenue: 0, transactions: new Set() });
      }
      const perf = staffPerfMap.get(r.staff_id)!;
      perf.revenue += Number(r.total_amount) || 0;
      perf.transactions.add(r.id);
    });

    receiptItems.forEach((ri: any) => {
      const receipt = (receipts || []).find(r => r.id === ri.receipt_id);
      if (receipt) {
        const perf = staffPerfMap.get(receipt.staff_id);
        if (perf) {
          perf.quantity += Number(ri.quantity) || 0;
        }
      }
    });

    const staffPerformance = Array.from(staffPerfMap.entries()).map(([staffId, perf]) => {
      const user = usersMap.get(staffId);
      return {
        staff_id: staffId,
        name: user?.full_name || `Staff ${staffId.slice(0, 5)}`,
        role: user?.role || 'staff',
        quantity: perf.quantity,
        revenue: perf.revenue,
        transactions: perf.transactions.size
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // 9. Aggregate Item-wise Metrics & Staff-wise Breakdowns
    // Map items list
    const itemsMap = new Map<string, any>();
    (dbItems || []).forEach((item: any) => {
      itemsMap.set(item.id, {
        item_id: item.id,
        item_name: item.name,
        sku: item.sku,
        category: item.category,
        brand: item.brand,
        package_type: item.package_type,
        unit_price: item.unit_price,
        total_quantity_sold: 0,
        total_revenue: 0,
        total_transactions: 0,
        staff_breakdown_map: new Map<string, { quantity: number; revenue: number; transactions: Set<string> }>()
      });
    });

    // Populate actual sales and breakdowns
    receiptItems.forEach((ri: any) => {
      const item = itemsMap.get(ri.item_id);
      const receipt = (receipts || []).find(r => r.id === ri.receipt_id);
      
      if (item && receipt) {
        const qty = Number(ri.quantity) || 0;
        const revenue = Number(ri.total_price) || (qty * (Number(ri.unit_price) || 0));

        item.total_quantity_sold += qty;
        item.total_revenue += revenue;
        item.total_transactions += 1;

        // Populate staff breakdown for this item
        if (!item.staff_breakdown_map.has(receipt.staff_id)) {
          item.staff_breakdown_map.set(receipt.staff_id, { quantity: 0, revenue: 0, transactions: new Set() });
        }
        const staffBreakdown = item.staff_breakdown_map.get(receipt.staff_id)!;
        staffBreakdown.quantity += qty;
        staffBreakdown.revenue += revenue;
        staffBreakdown.transactions.add(ri.receipt_id);
      }
    });

    // Format items into clean output array
    const items = Array.from(itemsMap.values()).map((item: any) => {
      const staff_breakdown = Array.from(item.staff_breakdown_map.entries()).map((entry: any) => {
        const [staffId, sb] = entry;
        const user = usersMap.get(staffId);
        return {
          staff_id: staffId,
          staff_name: user?.full_name || `Staff ${staffId.slice(0, 5)}`,
          staff_role: user?.role || 'staff',
          quantity_sold: sb.quantity,
          total_revenue: sb.revenue,
          transactions_count: sb.transactions.size
        };
      }).sort((a, b) => b.total_revenue - a.total_revenue);

      // Delete maps to keep JSON payload clean
      delete item.staff_breakdown_map;

      return {
        ...item,
        staff_breakdown
      };
    });

    return NextResponse.json({
      stats: {
        totalAmountSold,
        totalTransactions,
        totalItemsSold,
        totalQuantitySold
      },
      items,
      salesTrend,
      staffPerformance,
      filters: {
        dateRange,
        resolvedFrom: fromISO,
        resolvedTo: toISO
      }
    });

  } catch (error: any) {
    console.error('Next.js API reports/sales-analysis error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate report' }, { status: 500 });
  }
}
