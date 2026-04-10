import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

/**
 * GET /api/admin/payments/outstanding-summary
 *
 * Computes the total outstanding amount across ALL staff types:
 *   - Non-commission & commission staff  → sales recorded in `staff_sales`
 *   - Sales staff (role: sales / sales_staff) → sales recorded in `sales`
 *
 * Formula per staff member:
 *   outstanding = total_sales − approved_payments − pending_payments
 *
 * Aggregate (summed across all staff):
 *   outstandingTotal = Σ(staff_sales.total_amount) + Σ(sales.total_amount)
 *                      − Σ(approved staff_payments.amount)
 *                      − Σ(pending  staff_payments.amount)
 */
export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    // 1. Sum from staff_sales (non-commission & commission staff)
    const { data: staffSalesData, error: staffSalesError } = await supabaseAdmin
      .from('staff_sales')
      .select('total_amount');

    if (staffSalesError) throw staffSalesError;

    const staffSalesTotal = (staffSalesData || []).reduce(
      (sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0),
      0
    );

    // 2. Sum from sales table (sales staff)
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('total_amount');

    if (salesError) throw salesError;

    const salesStaffTotal = (salesData || []).reduce(
      (sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0),
      0
    );

    const totalSalesAmount = staffSalesTotal + salesStaffTotal;

    // 3. Sum approved and pending payments across all staff
    //    Exclude admin-paid commission records (same filter as other payment routes)
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('staff_payments')
      .select('amount, status')
      .in('status', ['approved', 'pending'])
      .or('payment_type.neq.commission,paid_by.is.null');

    if (paymentsError) throw paymentsError;

    let approvedAmount = 0;
    let pendingAmount = 0;
    (paymentsData || []).forEach((p: any) => {
      const amt = parseFloat(p.amount) || 0;
      if (p.status === 'approved') approvedAmount += amt;
      else if (p.status === 'pending') pendingAmount += amt;
    });

    const outstandingTotal = Math.max(0, totalSalesAmount - approvedAmount - pendingAmount);

    return NextResponse.json({
      staffSalesTotal,
      salesStaffTotal,
      totalSalesAmount,
      approvedAmount,
      pendingAmount,
      outstandingTotal,
    });
  } catch (error: any) {
    console.error('❌ Error calculating outstanding summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
