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

    // 3. Build role filter ID list (early exit if empty)
    if (staffRole && !staffId && roleStaffIds !== null && roleStaffIds.length === 0) {
      return NextResponse.json({
        stats: { totalAmountSold: 0, totalTransactions: 0, totalItemsSold: 0, totalQuantitySold: 0 },
        items: [],
        salesTrend: [],
        staffPerformance: [],
        filters: { dateRange, resolvedFrom: fromISO, resolvedTo: toISO }
      });
    }

    // 4. Fetch Sales Data from Source-of-Truth Tables
    // We use staff_sales (commission/non-commission staff) and sales+sales_items (sales portal staff)
    // instead of receipts+receipt_items, because:
    //   - receipt_items.unit_price does NOT include logistics fee
    //   - receipt creation can fail silently, losing data
    //   - staff_sales.unit_price already includes logistics fee for outside Jalingo

    interface SaleRow {
      staff_id: string;
      item_id: string;
      quantity: number;
      unit_price: number;
      total_amount: number;
      transaction_id: string;
      created_at: string;
      sold_outside_jalingo: boolean;
    }

    const allSalesRows: SaleRow[] = [];

    // 4a. Query staff_sales (commission / non-commission staff) — paginated to avoid 1000-row cap
    {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        let ssQuery = supabaseAdmin
          .from('staff_sales')
          .select('id, staff_id, item_id, quantity, unit_price, total_amount, sale_date, created_at, sold_outside_jalingo, location');

        if (applyDateFilter) {
          ssQuery = ssQuery.gte('created_at', fromISO).lte('created_at', toISO);
        }
        if (staffId) {
          ssQuery = ssQuery.eq('staff_id', staffId);
        } else if (roleStaffIds !== null) {
          ssQuery = ssQuery.in('staff_id', roleStaffIds);
        }

        const { data: staffSalesData, error: ssError } = await ssQuery.range(from, from + PAGE - 1);
        if (ssError) throw ssError;
        if (!staffSalesData || staffSalesData.length === 0) break;

        for (const row of staffSalesData) {
          const qty = Number(row.quantity) || 0;
          const unitPrice = Number(row.unit_price) || 0;
          const totalAmt = Number(row.total_amount) || (qty * unitPrice);
          const outsideJalingo = row.sold_outside_jalingo || row.location === 'Outside Jalingo';
          allSalesRows.push({
            staff_id: row.staff_id,
            item_id: row.item_id,
            quantity: qty,
            unit_price: unitPrice,
            total_amount: totalAmt,
            transaction_id: `ss_${row.id}`,
            created_at: row.created_at || row.sale_date,
            sold_outside_jalingo: outsideJalingo,
          });
        }
        from += PAGE;
      }
    }

    // 4b. Query sales + sales_items (sales portal staff) — paginated
    const portalSaleIds: string[] = [];
    const saleStaffMap = new Map<string, string>();
    const saleDateMap = new Map<string, string>();
    const saleLocationMap = new Map<string, boolean>();
    {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        let salesQuery = supabaseAdmin
          .from('sales')
          .select('id, staff_id, created_at, sold_outside_jalingo');

        if (applyDateFilter) {
          salesQuery = salesQuery.gte('created_at', fromISO).lte('created_at', toISO);
        }
        if (staffId) {
          salesQuery = salesQuery.eq('staff_id', staffId);
        } else if (roleStaffIds !== null) {
          salesQuery = salesQuery.in('staff_id', roleStaffIds);
        }

        const { data: salesData, error: salesError } = await salesQuery.range(from, from + PAGE - 1);
        if (salesError) throw salesError;
        if (!salesData || salesData.length === 0) break;

        for (const s of salesData) {
          portalSaleIds.push(s.id);
          saleStaffMap.set(s.id, s.staff_id);
          saleDateMap.set(s.id, s.created_at);
          saleLocationMap.set(s.id, s.sold_outside_jalingo || false);
        }
        from += PAGE;
      }
    }

    if (portalSaleIds.length > 0) {
      const { data: salesItemsData, error: siError } = await supabaseAdmin
        .from('sales_items')
        .select('id, sale_id, item_id, quantity, unit_price, logistics_fee')
        .in('sale_id', portalSaleIds);
      if (siError) throw siError;

      for (const row of salesItemsData || []) {
        const sid = row.sale_id;
        const qty = Number(row.quantity) || 0;
        const basePrice = Number(row.unit_price) || 0;
        const logisticsFee = Number(row.logistics_fee) || 0;
        const effectiveUnitPrice = basePrice + logisticsFee;
        const totalAmt = qty * effectiveUnitPrice;
        allSalesRows.push({
          staff_id: saleStaffMap.get(sid) || '',
          item_id: row.item_id,
          quantity: qty,
          unit_price: effectiveUnitPrice,
          total_amount: totalAmt,
          transaction_id: `si_${row.id}`,
          created_at: saleDateMap.get(sid) || '',
          sold_outside_jalingo: saleLocationMap.get(sid) || false,
        });
      }
    }

    // 5. Fetch All Products/Items in the system
    const { data: dbItems, error: dbItemsError } = await supabaseAdmin
      .from('items')
      .select('id, name, sku, category, unit_price, brand, package_type')
      .order('name');
    if (dbItemsError) throw dbItemsError;

    // 6. Aggregate Overall Statistics from unified sales rows
    const totalAmountSold = allSalesRows.reduce((sum, r) => sum + r.total_amount, 0);
    const totalTransactions = new Set(allSalesRows.map(r => r.transaction_id)).size;
    const totalQuantitySold = allSalesRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalItemsSold = new Set(allSalesRows.map(r => r.item_id)).size;

    // 7. Group Sales Rows by Date for Sales Trend
    const trendMap = new Map<string, number>();
    allSalesRows.forEach((r: any) => {
      const dateStr = new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + r.total_amount);
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
    allSalesRows.forEach((r: any) => {
      if (!staffPerfMap.has(r.staff_id)) {
        staffPerfMap.set(r.staff_id, { quantity: 0, revenue: 0, transactions: new Set() });
      }
      const perf = staffPerfMap.get(r.staff_id)!;
      perf.quantity += r.quantity;
      perf.revenue += r.total_amount;
      perf.transactions.add(r.transaction_id);
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
    const itemsMap = new Map<string, any>();
    (dbItems || []).forEach((dbItem: any) => {
      itemsMap.set(dbItem.id, {
        item_id: dbItem.id,
        item_name: dbItem.name,
        sku: dbItem.sku,
        category: dbItem.category,
        brand: dbItem.brand,
        package_type: dbItem.package_type,
        unit_price: 0,
        total_quantity_sold: 0,
        total_revenue: 0,
        total_transactions: 0,
        staff_breakdown_map: new Map<string, { quantity: number; revenue: number; selling_price: number; transactions: Set<string>; sold_outside_jalingo: boolean }>()
      });
    });

    // Populate actual sales and breakdowns from unified sales rows
    // Group by (staff_id, sold_outside_jalingo) so each location is a separate breakdown row
    allSalesRows.forEach((row: any) => {
      const item = itemsMap.get(row.item_id);
      if (item) {
        item.total_quantity_sold += row.quantity;
        item.total_revenue += row.total_amount;
        item.total_transactions += 1;

        const bkKey = `${row.staff_id}_${row.sold_outside_jalingo ? 'outside' : 'inside'}`;
        if (!item.staff_breakdown_map.has(bkKey)) {
          item.staff_breakdown_map.set(bkKey, {
            staff_id: row.staff_id,
            quantity: 0,
            revenue: 0,
            selling_price: 0,
            transactions: new Set(),
            sold_outside_jalingo: row.sold_outside_jalingo,
          });
        }
        const sb = item.staff_breakdown_map.get(bkKey)!;
        sb.quantity += row.quantity;
        sb.revenue += row.total_amount;
        sb.selling_price = sb.quantity > 0 ? sb.revenue / sb.quantity : 0;
        sb.transactions.add(row.transaction_id);
      }
    });

    // Format items into clean output array
    const items = Array.from(itemsMap.values()).map((item: any) => {
      const staff_breakdown = Array.from(item.staff_breakdown_map.values()).map((sb: any) => {
        const user = usersMap.get(sb.staff_id);
        return {
          staff_id: sb.staff_id,
          staff_name: user?.full_name || `Staff ${sb.staff_id.slice(0, 5)}`,
          staff_role: user?.role || 'staff',
          quantity_sold: sb.quantity,
          total_revenue: sb.revenue,
          selling_price: sb.selling_price,
          transactions_count: sb.transactions.size,
          sold_outside_jalingo: sb.sold_outside_jalingo,
        };
      }).sort((a: any, b: any) => b.total_revenue - a.total_revenue);

      // Set selling price as weighted average
      item.unit_price = item.total_quantity_sold > 0 ? item.total_revenue / item.total_quantity_sold : 0;

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
