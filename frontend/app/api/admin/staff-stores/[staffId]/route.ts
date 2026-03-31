import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { staffId } = params;

  const [storeResult, salesResult, userResult] = await Promise.all([
    supabaseAdmin
      .from('staff_store')
      .select(`*, items:item_id(id, name, sku, category, unit_price, price_jalingo)`)
      .eq('staff_id', staffId),
    supabaseAdmin
      .from('staff_sales')
      .select('*, items:item_id(name)')
      .eq('staff_id', staffId)
      .order('sale_date', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .eq('id', staffId)
      .single(),
  ]);

  return NextResponse.json({
    staff: userResult.data,
    store: storeResult.data || [],
    recent_sales: salesResult.data || [],
  });
}
