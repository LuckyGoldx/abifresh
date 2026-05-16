import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const paymentId = params.id;

  const { error: updateError } = await supabaseAdmin
    .from('staff_payments')
    .update({ status: 'approved', approved_date: new Date().toISOString(), approved_by: authResult.id })
    .eq('id', paymentId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const { data: payment } = await supabaseAdmin
    .from('staff_payments')
    .select('staff_id, staff_name, amount')
    .eq('id', paymentId)
    .single();

  if (payment) {
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: payment.staff_id,
        type: 'payment_approved',
        title: '✅ Payment Approved',
        message: `Your payment of ₦${payment.amount?.toLocaleString() || '0'} has been approved by admin. Check your account.`,
        is_read: false,
      },
    ]);
  }

  return NextResponse.json({ message: 'Payment approved successfully' });
}
