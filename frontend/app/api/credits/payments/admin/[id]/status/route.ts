import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const paymentId = params.id;

  try {
    const { status, approved_amount, reason } = await req.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // 1. Get the remittance to find the linked credit_payments
    const { data: remittance, error: fetchError } = await supabaseAdmin
      .from('staff_payments')
      .select('staff_id, items_paid_for, amount')
      .eq('id', paymentId)
      .single();

    if (fetchError || !remittance) {
      return NextResponse.json({ error: 'Remittance not found' }, { status: 404 });
    }

    const items = remittance.items_paid_for || [];
    const creditPaymentIds = items.map((i: any) => i.credit_payment_id).filter(Boolean);

    // 2. Update the remittance
    const updateData: any = {
      status,
      approved_date: new Date().toISOString()
    };

    if (status === 'approved') {
      updateData.approved_amount = approved_amount || remittance.amount;
    } else if (status === 'rejected') {
      updateData.rejection_reason = reason || 'No reason provided';
      updateData.notes = `REJECTED - ${reason || 'No reason provided'}`;
    }

    const { error: updateError } = await supabaseAdmin
      .from('staff_payments')
      .update(updateData)
      .eq('id', paymentId);

    if (updateError) throw updateError;

    // 3. Update the underlying credit_payments
    if (creditPaymentIds.length > 0) {
      if (status === 'approved') {
        await supabaseAdmin.from('credit_payments')
          .update({
            remittance_status: 'confirmed',
            remittance_confirmed_at: new Date().toISOString(),
            remittance_confirmed_by: authResult.id
          })
          .in('id', creditPaymentIds);
      } else if (status === 'rejected') {
        await supabaseAdmin.from('credit_payments')
          .update({
            remittance_status: null
          })
          .in('id', creditPaymentIds);
      }
    }

    // 4. Notify the staff member
    await supabaseAdmin.from('notifications').insert({
      user_id: remittance.staff_id,
      type: 'credit_payment',
      title: `Credit Remittance ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: status === 'approved' 
        ? `Your credit remittance of ₦${Number(remittance.amount).toLocaleString()} has been approved.`
        : `Your credit remittance of ₦${Number(remittance.amount).toLocaleString()} was rejected. Reason: ${reason || 'No reason provided'}`,
      is_read: false,
      action_url: `/sales/credit-payments`
    });

    return NextResponse.json({ message: `Credit remittance ${status} successfully` });
  } catch (error: any) {
    console.error('Error updating remittance status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
