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
    
    let query = supabaseAdmin
      .from('credit_payments')
      .select('amount, status, remittance_status')
      .eq('status', 'approved');

    if (isSalesStaff) {
      query = query.eq('staff_id', authResult.id);
    }

    const { data: payments, error } = await query;
    console.log(`[RemitStats] Staff: ${authResult.id}, Role: ${authResult.role}, Found: ${payments?.length || 0}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const stats = {
      total_approved: 0,
      pending_credits: 0,
      outstanding_credits: 0,
      total_collected: 0
    };

    payments.forEach(p => {
      const amount = Number(p.amount);
      stats.total_collected += amount;
      
      const remStatus = p.remittance_status;
      
      if (remStatus === 'confirmed') {
        stats.total_approved += amount;
      } else if (remStatus === 'submitted') {
        stats.pending_credits += amount;
      } else {
        // null or empty string means not yet remitted (Outstanding/In Hand)
        stats.outstanding_credits += amount;
      }
    });

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
