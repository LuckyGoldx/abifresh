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
    // 1. Fetch all staff members
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .in('role', ['sales', 'sales_staff']);

    if (staffError) throw staffError;

    // 2. Fetch all collected credit payments (approved by staff)
    const { data: collected, error: collectedError } = await supabaseAdmin
      .from('credit_payments')
      .select('staff_id, amount, remittance_status')
      .eq('status', 'approved');

    if (collectedError) throw collectedError;

    // 3. Fetch all remittances (staff_payments)
    const { data: remittances, error: remittancesError } = await supabaseAdmin
      .from('staff_payments')
      .select('staff_id, amount, status')
      .eq('payment_type', 'credit_remittance');

    if (remittancesError) throw remittancesError;

    // 4. Calculate summary for each staff member
    const summary = (staff || []).map(s => {
      const staffCollected = (collected || []).filter(c => c.staff_id === s.id);
      const staffRemittances = (remittances || []).filter(r => r.staff_id === s.id);

      const totalCollected = staffCollected.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const pendingRemittance = staffRemittances
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const approvedRemittance = staffRemittances
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);
      
      // Outstanding is what they have collected but NOT yet remitted (either pending or not yet submitted)
      const outstanding = staffCollected
        .filter(c => c.remittance_status === null)
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);

      return {
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        role: s.role,
        total_collected: totalCollected,
        pending_remittance: pendingRemittance,
        approved_remittance: approvedRemittance,
        outstanding_amount: outstanding
      };
    });

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Error in staff summary API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
