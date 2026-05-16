import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { reason } = body;

    const { data: payment } = await supabaseAdmin.from('credit_payments').select('*').eq('id', params.id).single();
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    await supabaseAdmin.from('credit_payments')
      .update({ status: 'rejected', rejection_reason: reason || null })
      .eq('id', params.id);

    supabaseAdmin.from('credit_activities').insert({
      creditor_id: payment.creditor_id,
      credit_sale_id: payment.credit_sale_id,
      credit_payment_id: params.id,
      staff_id: authResult.id,
      action: 'PAYMENT_REJECTED',
      details: { amount: payment.amount, reason },
    }).then(() => {}, () => {});

    return NextResponse.json({ message: 'Payment rejected' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
