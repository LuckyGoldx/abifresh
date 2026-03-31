import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const [salesResult, postedItemsResult, paymentsResult] = await Promise.all([
    supabaseAdmin
      .from('sales')
      .select('quantity, total_amount')
      .eq('staff_id', authResult.id),
    supabaseAdmin
      .from('posted_items')
      .select('quantity, status')
      .eq('poster_id', authResult.id),
    supabaseAdmin
      .from('staff_payments')
      .select('amount, status')
      .eq('staff_id', authResult.id),
  ]);

  const sales = salesResult.data || [];
  const posted = postedItemsResult.data || [];
  const payments = paymentsResult.data || [];

  return NextResponse.json({
    total_sales: sales.length,
    total_revenue: sales.reduce((s: number, x: any) => s + (x.total_amount || 0), 0),
    total_items_sold: sales.reduce((s: number, x: any) => s + (x.quantity || 0), 0),
    posted_items: posted.length,
    accepted_posted: posted.filter((p: any) => p.status === 'accepted').length,
    pending_posted: posted.filter((p: any) => p.status === 'pending').length,
    total_payments_requested: payments.length,
    total_amount_paid: payments
      .filter((p: any) => p.status === 'approved')
      .reduce((s: number, x: any) => s + (x.amount || 0), 0),
    pending_payments: payments.filter((p: any) => p.status === 'pending').length,
  });
}
