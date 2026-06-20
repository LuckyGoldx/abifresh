import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const COMMISSION_ROLES = ['commission_staff', 'staff_commission'];

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // 1. Get all commission staff users
  const isSuperadmin = authResult.role === 'superadmin';
  const HIDDEN_EMAILS = '("staff@abifresh.com","commission@abifresh.com","sales.@abifresh.com")';

  let commissionQuery = supabaseAdmin
    .from('users')
    .select('id, full_name, email, username')
    .in('role', COMMISSION_ROLES)
    .eq('is_active', true);
  if (!isSuperadmin) commissionQuery = commissionQuery.not('email', 'in', HIDDEN_EMAILS);
  const { data: commissionStaff, error: staffError } = await commissionQuery;

  if (staffError) return NextResponse.json({ error: staffError.message }, { status: 400 });

  const staffList = commissionStaff || [];
  const staffIds = staffList.map((s: any) => s.id);

  // 2. Get all commission-generating sales grouped by staff_id
  let salesTotals: Record<string, { generated: number; count: number; units: number; amount: number }> = {};
  if (staffIds.length > 0) {
    const { data: salesData } = await supabaseAdmin
      .from('staff_sales')
      .select('staff_id, approved_commission, quantity, total_amount')
      .in('staff_id', staffIds);

    (salesData || []).forEach((s: any) => {
      const id = s.staff_id;
      if (!salesTotals[id]) salesTotals[id] = { generated: 0, count: 0, units: 0, amount: 0 };
      salesTotals[id].generated += parseFloat(s.approved_commission) || 0;
      salesTotals[id].count += 1;
      salesTotals[id].units += s.quantity || 0;
      salesTotals[id].amount += parseFloat(s.total_amount) || 0;
    });
  }

  // 3. Get all commission payments grouped by staff_id
  let paidTotals: Record<string, number> = {};
  if (staffIds.length > 0) {
    const { data: paymentsData } = await supabaseAdmin
      .from('staff_payments')
      .select('staff_id, amount')
      .in('staff_id', staffIds)
      .eq('payment_type', 'commission')
      .in('status', ['paid', 'approved'])
      .not('paid_by', 'is', null);

    (paymentsData || []).forEach((p: any) => {
      const id = p.staff_id;
      paidTotals[id] = (paidTotals[id] || 0) + (parseFloat(p.amount) || 0);
    });
  }

  // 4. Build per-staff commission breakdown
  const staffCommissions = staffList.map((staff: any) => {
    const generated = salesTotals[staff.id]?.generated || 0;
    const paid = paidTotals[staff.id] || 0;
    return {
      staff_id: staff.id,
      staff_name: staff.full_name,
      staff_email: staff.email,
      staff_username: staff.username,
      total_commission_generated: generated,
      total_commission_paid: paid,
      commission_pending: Math.max(0, generated - paid),
      total_sales: salesTotals[staff.id]?.amount || 0,
      items_sold: salesTotals[staff.id]?.units || 0,
    };
  });

  // 5. Totals
  const total_commission_generated = staffCommissions.reduce((s: number, c: any) => s + c.total_commission_generated, 0);
  const total_commission_paid = staffCommissions.reduce((s: number, c: any) => s + c.total_commission_paid, 0);
  const total_commission_pending = staffCommissions.reduce((s: number, c: any) => s + c.commission_pending, 0);

  return NextResponse.json({
    total_commission_generated,
    total_commission_paid,
    total_commission_pending,
    commission_staff_count: staffList.length,
    staff_commissions: staffCommissions,
  });
}
