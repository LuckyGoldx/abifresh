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

    let salesQuery = supabaseAdmin
      .from('credit_sales')
      .select('total_amount, total_quantity')
      .neq('status', 'cancelled');

    let paymentsQuery = supabaseAdmin
      .from('credit_payments')
      .select('amount')
      .eq('status', 'approved');

    if (isSalesStaff) {
      salesQuery = salesQuery.eq('staff_id', authResult.id);
      paymentsQuery = paymentsQuery.eq('staff_id', authResult.id);
    }

    let creditorsQuery = supabaseAdmin.from('creditors').select('id').eq('is_active', true);

    if (isSalesStaff) {
      // Filter creditors strictly added by them
      creditorsQuery = creditorsQuery.eq('added_by', authResult.id);
    }

    const [salesRes, paymentsRes, creditorsRes] = await Promise.all([
      salesQuery,
      paymentsQuery,
      creditorsQuery
    ]);

    const totalCreditsAmount = salesRes.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const totalCreditsQuantity = salesRes.data?.reduce((sum, s) => sum + Number(s.total_quantity), 0) || 0;
    const totalAmountPaid = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    return NextResponse.json({
      total_credits_amount: totalCreditsAmount,
      total_credits_quantity: totalCreditsQuantity,
      total_creditors: creditorsRes.data?.length || 0,
      total_amount_paid: totalAmountPaid,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
