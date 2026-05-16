import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { data: sale, error } = await supabaseAdmin
      .from('credit_sales')
      .select(`
        *,
        users(full_name),
        creditors(full_name, phone_number),
        credit_sale_items(*)
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    return NextResponse.json(sale);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
