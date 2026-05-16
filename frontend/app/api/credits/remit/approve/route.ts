import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
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
        remittance_status: 'confirmed',
        remittance_confirmed_at: new Date().toISOString(),
        remittance_confirmed_by: authResult.id
      })
      .in('id', paymentIds)
      .eq('remittance_status', 'submitted');

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    
    return NextResponse.json({ message: 'Remittance confirmed successfully', count: data?.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
