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

    // 1. Get the remittance history (staff_payments with type 'credit_remittance')
    let remittancesQuery = supabaseAdmin
      .from('staff_payments')
      .select('*, staff:users!staff_payments_staff_id_fkey(full_name)')
      .eq('payment_type', 'credit_remittance');

    if (isSalesStaff) {
      remittancesQuery = remittancesQuery.eq('staff_id', authResult.id);
    }

    const { data: remittances, error: remittancesError } = await remittancesQuery
      .order('created_at', { ascending: false });

    if (remittancesError) throw remittancesError;

    // 2. Get all unremitted creditor payments collected
    // 'remittance_status' is either NULL or 'rejected'
    let unremittedQuery = supabaseAdmin
      .from('credit_payments')
      .select('*, creditors(full_name), credit_sales(receipt_number), staff:users!credit_payments_staff_id_fkey(full_name)')
      .is('remittance_status', null);

    if (isSalesStaff) {
      unremittedQuery = unremittedQuery.eq('staff_id', authResult.id);
    }

    const { data: unremitted, error: unremittedError } = await unremittedQuery
      .order('created_at', { ascending: true });

    if (unremittedError) throw unremittedError;

    // Calculate Stats
    let approvedAmount = 0;
    let pendingAmount = 0;
    let rejectedAmount = 0;
    let outstandingAmount = 0;

    (remittances || []).forEach(r => {
      const amt = Number(r.approved_amount || r.amount || 0);
      if (r.status === 'approved') approvedAmount += amt;
      if (r.status === 'pending') pendingAmount += (Number(r.amount) || 0);
      if (r.status === 'rejected') rejectedAmount += (Number(r.amount) || 0);
    });

    (unremitted || []).forEach(u => {
      outstandingAmount += Number(u.amount || 0);
    });

    return NextResponse.json({
      remittances: remittances || [],
      unremitted: unremitted || [],
      stats: {
        approvedAmount,
        pendingAmount,
        rejectedAmount,
        outstandingAmount
      }
    });

  } catch (error: any) {
    console.error('Error fetching credit payments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
