import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('sales')
    .select('*, item:item_id(id, name, unit_price)')
    .eq('staff_id', authResult.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const sales = (data || []).map((sale: any) => ({
    id: sale.id,
    item_id: sale.item_id,
    item_name: sale.item?.name || 'Unknown',
    quantity: sale.quantity,
    unit_price: sale.item?.unit_price || 0,
    total_amount: sale.total_amount,
    sale_date: sale.created_at,
  }));

  return NextResponse.json(sales);
}
