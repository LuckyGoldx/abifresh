import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    // 1. Get all credit remittances
    const { data: remittances, error } = await supabaseAdmin
      .from('staff_payments')
      .select('*')
      .eq('payment_type', 'credit_remittance')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate Stats
    let approvedAmount = 0;
    let pendingAmount = 0;
    let rejectedAmount = 0;

    (remittances || []).forEach(r => {
      const amt = Number(r.approved_amount || r.amount || 0);
      if (r.status === 'approved') approvedAmount += amt;
      if (r.status === 'pending') pendingAmount += (Number(r.amount) || 0);
      if (r.status === 'rejected') rejectedAmount += (Number(r.amount) || 0);
    });

    // 2. Calculate TOTAL outstanding across sales staff (where remittance_status is NULL)
    const { data: salesStaff } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('role', ['sales', 'sales_staff']);

    const salesStaffIds = (salesStaff || []).map(u => u.id);

    const { data: unremitted, error: unremittedError } = await supabaseAdmin
      .from('credit_payments')
      .select('amount, staff_id')
      .is('remittance_status', null);

    if (unremittedError) throw unremittedError;

    let outstandingAmount = 0;
    (unremitted || []).forEach(u => {
      if (salesStaffIds.includes(u.staff_id)) {
        outstandingAmount += Number(u.amount || 0);
      }
    });

    return NextResponse.json({
      payments: remittances || [],
      stats: {
        approvedAmount,
        pendingAmount,
        rejectedAmount,
        outstandingAmount
      }
    });

  } catch (error: any) {
    console.error('Error fetching admin credit payments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
