import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('staff_payments')
    .select('id')
    .eq('status', 'pending')
    // Exclude admin-paid commission records (managed in /admin/commissions)
    .or('payment_type.neq.commission,paid_by.is.null')
    .neq('payment_type', 'credit_remittance');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ count: (data || []).length });
}
