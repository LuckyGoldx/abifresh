import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const [paymentsResult, staffResult] = await Promise.all([
      supabaseAdmin
        .from('staff_payments')
        .select('*')
        .eq('staff_id', authResult.id)
        .eq('payment_type', 'sale')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('users')
        .select('id, full_name, email, phone_number, username')
        .eq('id', authResult.id)
        .single(),
    ]);

    if (paymentsResult.error) throw paymentsResult.error;

    const staffMember = staffResult.data;
    const payments = (paymentsResult.data || []).map((payment: any) => ({
      id: payment.id,
      staff_id: payment.staff_id,
      staff_name: payment.staff_name || staffMember?.full_name || 'Unknown',
      staff_phone: payment.staff_phone || staffMember?.phone_number || null,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_type: payment.payment_type,
      status: payment.status,
      reference_number: payment.reference_number,
      notes: payment.notes,
      receipt_url: payment.receipt_url,
      items_paid_for: payment.items_paid_for,
      requested_date: payment.requested_date,
      approved_date: payment.approved_date,
      created_at: payment.created_at,
      rejection_reason: payment.rejection_reason,
    }));

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
