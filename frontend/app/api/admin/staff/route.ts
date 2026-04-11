import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'admin', 'sales', 'sales_staff')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  const isSuperadmin = authResult.role === 'superadmin';
  const HIDDEN_EMAILS = '("staff@abifresh.com","commission@abifresh.com","sales.@abifresh.com")';

  // Fetch users with pagination
  let usersQuery = supabaseAdmin
    .from('users')
    .select('*');
  if (!isSuperadmin) usersQuery = usersQuery.not('email', 'in', HIDDEN_EMAILS);
  const { data: users, error } = await usersQuery
    .range(offset, offset + limit - 1)
    .order('full_name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Enrich each user with their sales summary
  const enriched = await Promise.all(
    (users || []).map(async (staff: any) => {
      const { data: salesItems } = await supabaseAdmin
        .from('sales_items')
        .select('quantity, unit_price, sale_id!inner(staff_id)')
        .eq('sale_id.staff_id', staff.id);

      const { data: sales } = await supabaseAdmin
        .from('sales')
        .select('total_amount')
        .eq('staff_id', staff.id);

      return {
        ...staff,
        total_sales_items: (salesItems || []).reduce((s: number, x: any) => s + (x.quantity || 0), 0),
        total_sales_amount: (sales || []).reduce((s: number, x: any) => s + (x.total_amount || 0), 0),
      };
    })
  );

  return NextResponse.json(enriched);
}
