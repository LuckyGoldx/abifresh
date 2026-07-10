import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin', 'sales', 'staff', 'sales_staff')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const url = new URL(req.url);
  const perPage = parseInt(url.searchParams.get('perPage') || '0');
  const search = url.searchParams.get('search')?.trim();
  const staffId = url.searchParams.get('staffId')?.trim();
  const dateFrom = url.searchParams.get('dateFrom')?.trim();
  const dateTo = url.searchParams.get('dateTo')?.trim();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

  // Build query
  let query = supabaseAdmin
    .from('receipts')
    .select(`
      id, receipt_number, total_amount, payment_method, sold_outside_jalingo,
      created_at, staff_id,
      receipt_items(id, item_id, quantity, unit_price, total_price, item_id(name, price_jalingo, price_outside))
    `);

  // Apply filters server-side (for search button / filter changes)
  if (search) {
    query = query.ilike('receipt_number', `%${search}%`);
  }
  if (staffId) {
    query = query.eq('staff_id', staffId);
  }
  if (dateFrom) {
    query = query.gte('created_at', new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    query = query.lte('created_at', endDate.toISOString());
  }

  // When no perPage and no search ? return ALL receipts — paginated to avoid 1000-row cap
  if ((!perPage || perPage <= 0) && !search && !staffId && !dateFrom && !dateTo) {
    const PAGE = 1000;
    const allReceipts: any[] = [];
    {
      let from = 0;
      while (true) {
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        if (!data || data.length === 0) break;
        allReceipts.push(...data);
        from += PAGE;
      }
    }
    return NextResponse.json(allReceipts);
  }

  // Paginated: always used when search/filter is active, or when perPage is set
  const itemsPerPage = Math.min(5000, Math.max(1, perPage > 0 ? perPage : 100));
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage - 1;

  const [receiptsResult, countResult] = await Promise.all([
    query.order('created_at', { ascending: false }).range(start, end),
    supabaseAdmin.from('receipts').select('id', { count: 'exact', head: true }),
  ]);

  if (receiptsResult.error) return NextResponse.json({ error: receiptsResult.error.message }, { status: 400 });

  return NextResponse.json({
    data: receiptsResult.data || [],
    pagination: {
      page,
      perPage: itemsPerPage,
      total: countResult.count ?? 0,
      totalPages: Math.ceil((countResult.count ?? 0) / itemsPerPage),
    },
  });
}
