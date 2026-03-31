import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get('staffId');

  let query = supabaseAdmin.from('sales').select('*');
  if (staffId) query = query.eq('staff_id', staffId);

  const { data: sales, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Get sales_items with item details for category/quantity data
  const { data: salesItemsData } = await supabaseAdmin
    .from('sales_items')
    .select('quantity, unit_price, item_id(category)');

  const summary = {
    total_sales: sales?.length || 0,
    total_amount: sales?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0,
    total_items: (salesItemsData || []).reduce((sum: number, si: any) => sum + (si.quantity || 0), 0),
    by_category: {} as Record<string, { count: number; amount: number }>,
    by_payment_method: {} as Record<string, { count: number; amount: number }>,
  };

  // Category breakdown from sales_items
  (salesItemsData || []).forEach((si: any) => {
    const category = si.item_id?.category || 'unknown';
    if (!summary.by_category[category]) summary.by_category[category] = { count: 0, amount: 0 };
    summary.by_category[category].count += si.quantity || 0;
    summary.by_category[category].amount += (si.unit_price || 0) * (si.quantity || 0);
  });

  // Payment method breakdown from sales
  sales?.forEach((sale: any) => {
    const method = sale.payment_method || 'unknown';
    if (!summary.by_payment_method[method]) summary.by_payment_method[method] = { count: 0, amount: 0 };
    summary.by_payment_method[method].count++;
    summary.by_payment_method[method].amount += sale.total_amount || 0;
  });

  return NextResponse.json(summary);
}
