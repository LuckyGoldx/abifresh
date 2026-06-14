import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';

    // Today's start/end
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // --- Today's Credit Sales (excludes cancelled) ---
    let todaySalesQuery = supabaseAdmin
      .from('credit_sales')
      .select('id, total_amount, total_quantity')
      .neq('status', 'cancelled')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    if (isSalesStaff) {
      todaySalesQuery = todaySalesQuery.eq('staff_id', authResult.id);
    }

    const { data: todaySales } = await todaySalesQuery;
    const todaySaleIds = (todaySales || []).map(s => s.id);

    // Today's unique items and quantity sold
    let todayItemCount = 0;
    let todayQuantitySold = 0;
    if (todaySaleIds.length > 0) {
      const { data: todayItems } = await supabaseAdmin
        .from('credit_sale_items')
        .select('item_id, quantity')
        .in('credit_sale_id', todaySaleIds);

      const uniqueItems = new Set((todayItems || []).map(i => i.item_id));
      todayItemCount = uniqueItems.size;
      todayQuantitySold = (todayItems || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    }

    const todayCreditsAmount = (todaySales || []).reduce((sum, s) => sum + Number(s.total_amount), 0);

    // --- Today's Credit Collections (approved payments) ---
    let todayPaymentsQuery = supabaseAdmin
      .from('credit_payments')
      .select('amount')
      .eq('status', 'approved')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    if (isSalesStaff) {
      todayPaymentsQuery = todayPaymentsQuery.eq('staff_id', authResult.id);
    }

    const { data: todayPayments } = await todayPaymentsQuery;
    const todayCreditsCollected = (todayPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);

    // --- All-time stats (same as before) ---
    let salesQuery = supabaseAdmin
      .from('credit_sales')
      .select('total_amount, total_quantity')
      .neq('status', 'cancelled');

    let paymentsQuery = supabaseAdmin
      .from('credit_payments')
      .select('amount')
      .eq('status', 'approved');

    if (isSalesStaff) {
      salesQuery = salesQuery.eq('staff_id', authResult.id);
      paymentsQuery = paymentsQuery.eq('staff_id', authResult.id);
    }

    let creditorsQuery = supabaseAdmin.from('creditors').select('id').eq('is_active', true);

    if (isSalesStaff) {
      creditorsQuery = creditorsQuery.eq('added_by', authResult.id);
    }

    const [salesRes, paymentsRes, creditorsRes] = await Promise.all([
      salesQuery,
      paymentsQuery,
      creditorsQuery
    ]);

    const totalCreditsAmount = salesRes.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const totalCreditsQuantity = salesRes.data?.reduce((sum, s) => sum + Number(s.total_quantity), 0) || 0;
    const totalAmountPaid = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    return NextResponse.json({
      // All-time
      total_credits_amount: totalCreditsAmount,
      total_credits_quantity: totalCreditsQuantity,
      total_creditors: creditorsRes.data?.length || 0,
      total_amount_paid: totalAmountPaid,
      // Today
      today_credits_amount: todayCreditsAmount,
      today_credits_collected: todayCreditsCollected,
      today_credit_items: todayItemCount,
      today_quantity_sold: todayQuantitySold,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
