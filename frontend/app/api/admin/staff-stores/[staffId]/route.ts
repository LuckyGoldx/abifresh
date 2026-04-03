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
      .select(`*, items:item_id(id, name, sku, category, unit_price, commission, price_jalingo, price_outside)`)
      .eq('staff_id', staffId),
    supabaseAdmin
      .from('staff_sales')
      .select('total_amount, commission')
      .eq('staff_id', staffId),
    supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .eq('id', staffId)
      .single(),
  ]);

  const userData = userResult.data;
  const storeItems = storeResult.data || [];
  const salesRecords = salesResult.data || [];

  // Compute totals from actual sales records (source of truth for amounts)
  const total_amount_sold = salesRecords.reduce((sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0), 0);
  const total_commission_earned = salesRecords.reduce((sum: number, s: any) => sum + (parseFloat(s.commission) || 0), 0);
  const receipts_count = salesRecords.length;

  // Compute quantity totals from staff_store entries
  const total_items = storeItems.length;
  const total_quantity = storeItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const total_sold = storeItems.reduce((sum: number, item: any) => sum + (item.quantity_sold || 0), 0);

  // Attach user data and computed quantity_available to each store item
  const itemsWithUsers = storeItems.map((item: any) => ({
    ...item,
    quantity_available: Math.max(0, (item.quantity || 0) - (item.quantity_sold || 0)),
    users: userData,
  }));

  return NextResponse.json({
    items: itemsWithUsers,
    total_items,
    total_quantity,
    total_sold,
    total_amount_sold,
    total_commission_earned,
    receipts_count,
  });
}
