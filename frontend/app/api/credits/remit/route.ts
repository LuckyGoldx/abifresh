import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { paymentIds } = await req.json();
    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json({ error: 'No payments selected' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('credit_payments')
      .update({
        remittance_status: 'submitted',
        remitted_at: new Date().toISOString()
      })
      .in('id', paymentIds)
      .eq('staff_id', authResult.id)
      .eq('status', 'approved')
      .is('remittance_status', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    
    return NextResponse.json({ message: 'Remittance submitted successfully', count: paymentIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
