import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('sales')
    .select('*, sales_items(*, items(name)), users!staff_id(full_name)')
    .eq('staff_id', authResult.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const receipts = (data || []).map((sale: any) => ({
    id: sale.id,
    receipt_number: sale.receipt_number,
    total_amount: sale.total_amount,
    items: sale.sales_items,
    items_count: sale.sales_items?.length || 0,
    created_at: sale.created_at,
    staff_name: sale.users?.full_name || 'Unknown',
    payment_method: sale.payment_method,
  }));

  return NextResponse.json(receipts);
}
