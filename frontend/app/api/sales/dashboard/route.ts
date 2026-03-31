import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: sales, error } = await supabaseAdmin
    .from('sales')
    .select('*')
    .eq('staff_id', authResult.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const totalItems = (sales || []).reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
  const totalRevenue = (sales || []).reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);

  return NextResponse.json({
    sales: sales || [],
    total_items: totalItems,
    total_revenue: totalRevenue,
    transaction_count: (sales || []).length,
  });
}
