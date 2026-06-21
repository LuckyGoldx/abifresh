import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const COMMISSION_ROLES = ['commission_staff', 'staff_commission'];

async function generateCommissionForPayment(paymentId: string) {
  const { data: payment } = await supabaseAdmin
    .from('staff_payments')
    .select('staff_id, items_paid_for')
    .eq('id', paymentId)
    .single();

  if (!payment || !payment.items_paid_for || !Array.isArray(payment.items_paid_for) || payment.items_paid_for.length === 0) {
    return;
  }

  const { data: staffUser } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', payment.staff_id)
    .single();

  if (!staffUser || !COMMISSION_ROLES.includes(staffUser.role)) {
    return;
  }

  const itemIds = [...new Set(payment.items_paid_for.map((item: any) => item.item_id).filter(Boolean))];
  if (itemIds.length === 0) return;

  const { data: itemsData } = await supabaseAdmin
    .from('items')
    .select('id, commission')
    .in('id', itemIds);

  const liveCommissionMap: Record<string, number> = {};
  (itemsData || []).forEach((item: any) => {
    liveCommissionMap[item.id] = parseFloat(item.commission) || 0;
  });

  for (const paidItem of payment.items_paid_for) {
    const saleIds: string[] = Array.isArray(paidItem.sale_ids) ? paidItem.sale_ids : (paidItem.sale_id ? [paidItem.sale_id] : []);
    if (saleIds.length === 0) continue;

    const paidQuantity = parseFloat(paidItem.quantity) || 0;
    if (paidQuantity <= 0) continue;

    const { data: salesRecords } = await supabaseAdmin
      .from('staff_sales')
      .select('id, quantity, commission_rate')
      .in('id', saleIds)
      .eq('staff_id', payment.staff_id);

    if (!salesRecords || salesRecords.length === 0) continue;

    const saleMap: Record<string, { quantity: number; commissionRate: number }> = {};
    let totalOriginalQty = 0;
    (salesRecords || []).forEach((s: any) => {
      const qty = parseFloat(s.quantity) || 0;
      const rate = parseFloat(s.commission_rate) || liveCommissionMap[paidItem.item_id] || 0;
      saleMap[s.id] = { quantity: qty, commissionRate: rate };
      totalOriginalQty += qty;
    });

    if (totalOriginalQty <= 0) continue;

    let remainingQty = paidQuantity;
    const updates: { id: string; approved_commission: number; commission_rate?: number }[] = [];

    for (const sale of salesRecords) {
      if (remainingQty <= 0) break;
      const { quantity: origQty, commissionRate } = saleMap[sale.id];
      if (commissionRate <= 0) continue;

      const proportion = origQty / totalOriginalQty;
      const allocatedQty = Math.min(remainingQty, Math.round(paidQuantity * proportion * 10) / 10);
      const finalAllocated = Math.min(allocatedQty, origQty);
      const commissionEarned = finalAllocated * commissionRate;

      const updateEntry: any = { id: sale.id, approved_commission: Math.round(commissionEarned * 100) / 100 };
      if ((sale as any).commission_rate == null && liveCommissionMap[paidItem.item_id]) {
        updateEntry.commission_rate = liveCommissionMap[paidItem.item_id];
      }
      updates.push(updateEntry);
      remainingQty -= finalAllocated;
    }

    for (const update of updates) {
      const updateData: any = { approved_commission: update.approved_commission };
      if (update.commission_rate !== undefined) {
        updateData.commission_rate = update.commission_rate;
      }
      await supabaseAdmin
        .from('staff_sales')
        .update(updateData)
        .eq('id', update.id);
    }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
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

  generateCommissionForPayment(paymentId).catch((err) => {
    console.error('Failed to generate commission for payment:', paymentId, err);
  });

  return NextResponse.json({ message: 'Payment approved successfully' });
}
