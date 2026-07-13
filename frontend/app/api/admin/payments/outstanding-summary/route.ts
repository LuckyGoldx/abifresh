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
    const PAGE = 1000;

    // 1. Sum from staff_sales (non-commission & commission staff) — paginated
    let staffSalesTotal = 0;
    {
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from('staff_sales')
          .select('total_amount')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        staffSalesTotal += data.reduce((sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0), 0);
        from += PAGE;
      }
    }

    // 2. Sum from sales table (sales staff) — paginated
    let salesStaffTotal = 0;
    {
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from('sales')
          .select('total_amount')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        salesStaffTotal += data.reduce((sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0), 0);
        from += PAGE;
      }
    }

    const totalSalesAmount = staffSalesTotal + salesStaffTotal;

    // 3. Sum approved and pending payments across all staff — paginated
    let approvedAmount = 0;
    let pendingAmount = 0;
    {
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from('staff_payments')
          .select('amount, status')
          .in('status', ['approved', 'pending'])
          .neq('payment_type', 'credit_remittance')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const p of data) {
          const amt = parseFloat(p.amount) || 0;
          if (p.status === 'approved') approvedAmount += amt;
          else if (p.status === 'pending') pendingAmount += amt;
        }
        from += PAGE;
      }
    }

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
