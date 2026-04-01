import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const isCommissionStaff = ['commission_staff', 'staff_commission'].includes(authResult.role);

  const [salesResult, postedResult, paymentsResult, commissionPaidResult, expensesResult, notificationsResult] = await Promise.all([
    supabaseAdmin
      .from('staff_sales')
      .select('quantity, total_amount, commission')
      .eq('staff_id', authResult.id),
    supabaseAdmin
      .from('posted_items')
      .select('id, status')
      .eq('staff_id', authResult.id),
    supabaseAdmin
      .from('staff_payments')
      .select('amount, status, payment_type, paid_by')
      .eq('staff_id', authResult.id)
      // Exclude admin-paid commissions (those belong to commission management, not payments)
      .or('payment_type.neq.commission,paid_by.is.null'),
    // Separate query: only admin-paid commissions (paid_by IS NOT NULL) for the Paid Commission card
    supabaseAdmin
      .from('staff_payments')
      .select('amount')
      .eq('staff_id', authResult.id)
      .eq('payment_type', 'commission')
      .eq('status', 'paid')
      .not('paid_by', 'is', null),
    supabaseAdmin
      .from('staff_expenses')
      .select('expense_amount')
      .eq('staff_id', authResult.id),
    supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authResult.id)
      .eq('is_read', false),
  ]);

  const sales = salesResult.data || [];
  const posted = postedResult.data || [];
  const payments = paymentsResult.data || [];
  const commissionPaidData = commissionPaidResult.data || [];
  const expenses = expensesResult.data || [];

  const total_items_sold = sales.reduce((s: number, r: any) => s + (r.quantity || 0), 0);
  const total_amount_sold = sales.reduce((s: number, r: any) => s + (parseFloat(r.total_amount) || 0), 0);
  const total_commission = isCommissionStaff
    ? sales.reduce((s: number, r: any) => s + (parseFloat(r.commission) || 0), 0)
    : 0;

  const total_posted_items = posted.length;
  const pending_posted_items = posted.filter((p: any) => p.status === 'pending').length;

  const pending_payments = payments.filter((p: any) => p.status === 'pending');
  const approved_payments = payments.filter((p: any) => p.status === 'approved' || p.status === 'paid');

  const pending_payment_count = pending_payments.length;
  const pending_payment_amount = pending_payments.reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
  const approved_amount = approved_payments.reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
  const paid_commission = commissionPaidData
    .reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);

  const total_expenses = expenses.reduce((s: number, e: any) => s + (parseFloat(e.expense_amount) || 0), 0);
  const unread_notifications = notificationsResult.count || 0;

  return NextResponse.json({
    total_items_sold,
    total_amount_sold,
    total_posted_items,
    pending_payment_count,
    pending_posted_items,
    pending_payment_amount,
    approved_amount,
    total_expenses,
    unread_notifications,
    total_commission,
    paid_commission,
    is_commission_staff: isCommissionStaff,
  });
}
