import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const SALES_ROLES = new Set(['sales', 'sales_staff']);

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const isSuperadmin = authResult.role === 'superadmin';
    const HIDDEN_EMAILS = '("staff@abifresh.com","commission@abifresh.com","sales.@abifresh.com")';

    // 1. All non-admin staff
    let usersQuery = supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, phone_number')
      .not('role', 'in', '("admin","superadmin")');
    if (!isSuperadmin) usersQuery = usersQuery.not('email', 'in', HIDDEN_EMAILS);
    const { data: users, error: usersErr } = await usersQuery.order('full_name', { ascending: true });

    if (usersErr) throw usersErr;
    if (!users || users.length === 0) return NextResponse.json([]);

    // 2. Batch fetch all data — all paginated to avoid 1000-row cap
    const PAGE = 1000;

    // staff_sales
    const staffSalesAll: any[] = [];
    {
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from('staff_sales')
          .select('staff_id, quantity, total_amount')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        staffSalesAll.push(...data);
        from += PAGE;
      }
    }

    // sales
    const salesAll: any[] = [];
    {
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from('sales')
          .select('id, staff_id, total_amount')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        salesAll.push(...data);
        from += PAGE;
      }
    }

    // staff_payments (approved/pending)
    const paymentsAll: any[] = [];
    {
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from('staff_payments')
          .select('staff_id, amount, status')
          .in('status', ['approved', 'pending'])
          .neq('payment_type', 'credit_remittance')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        paymentsAll.push(...data);
        from += PAGE;
      }
    }

    // 3. For sales staff qty: fetch sales_items only for relevant sale IDs
    const salesStaffIds = new Set(
      users.filter((u: any) => SALES_ROLES.has(u.role)).map((u: any) => u.id)
    );
    const salesStaffSaleIds = salesAll
      .filter((s: any) => salesStaffIds.has(s.staff_id))
      .map((s: any) => s.id);

    let salesItemsData: any[] = [];
    if (salesStaffSaleIds.length > 0) {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data: si, error: siErr } = await supabaseAdmin
          .from('sales_items')
          .select('sale_id, quantity')
          .range(from, from + PAGE - 1);
        if (siErr) throw siErr;
        if (!si || si.length === 0) break;
        const idSet = new Set(salesStaffSaleIds);
        salesItemsData.push(...si.filter((x: any) => idSet.has(x.sale_id)));
        from += PAGE;
      }
    }

    // 4. Aggregate staff_sales per staff_id
    const staffSalesAgg: Record<string, { qty: number; amount: number }> = {};
    for (const s of staffSalesAll) {
      if (!staffSalesAgg[s.staff_id]) staffSalesAgg[s.staff_id] = { qty: 0, amount: 0 };
      staffSalesAgg[s.staff_id].qty += parseFloat(s.quantity) || 0;
      staffSalesAgg[s.staff_id].amount += parseFloat(s.total_amount) || 0;
    }

    // 5. Aggregate sales (sales staff)
    const saleToStaff: Record<string, string> = {};
    const salesAgg: Record<string, { qty: number; amount: number }> = {};
    for (const s of salesAll) {
      saleToStaff[s.id] = s.staff_id;
      if (!salesAgg[s.staff_id]) salesAgg[s.staff_id] = { qty: 0, amount: 0 };
      salesAgg[s.staff_id].amount += parseFloat(s.total_amount) || 0;
    }
    for (const si of salesItemsData) {
      const staffId = saleToStaff[si.sale_id];
      if (!staffId) continue;
      if (!salesAgg[staffId]) salesAgg[staffId] = { qty: 0, amount: 0 };
      salesAgg[staffId].qty += parseInt(si.quantity) || 0;
    }

    // 6. Aggregate payments per staff_id
    const pmAgg: Record<string, { approved: number; pending: number }> = {};
    for (const p of paymentsAll) {
      if (!pmAgg[p.staff_id]) pmAgg[p.staff_id] = { approved: 0, pending: 0 };
      const amt = parseFloat(p.amount) || 0;
      if (p.status === 'approved') pmAgg[p.staff_id].approved += amt;
      else if (p.status === 'pending') pmAgg[p.staff_id].pending += amt;
    }

    // 7. Build result
    const result = users.map((u: any) => {
      const isSales = SALES_ROLES.has(u.role);
      const salesData = isSales ? salesAgg[u.id] : staffSalesAgg[u.id];
      const totalQty = salesData?.qty || 0;
      const totalAmount = salesData?.amount || 0;
      const pm = pmAgg[u.id] || { approved: 0, pending: 0 };
      const outstanding = Math.max(0, totalAmount - pm.approved - pm.pending);

      return {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        phone_number: u.phone_number,
        total_qty: totalQty,
        total_sales_amount: totalAmount,
        pending_amount: pm.pending,
        approved_amount: pm.approved,
        outstanding_amount: outstanding,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching staff payment summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
