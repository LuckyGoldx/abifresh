import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('posted_items')
    .select(`
      *,
      items:item_id(id, name, unit_price, commission),
      posted_by:poster_id(id, full_name, email)
    `)
    .eq('staff_id', authResult.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const postedItems = (data || []).map((item: any) => {
    const commission = item.items?.commission || 0;
    return {
      id: item.id,
      item_id: item.item_id,
      item_name: item.items?.name || 'Unknown',
      quantity: item.quantity,
      status: item.status,
      posted_at: item.created_at,
      posted_by: item.posted_by?.full_name || 'Unknown',
      staff_comment: item.staff_comment,
      unit_price: item.unit_price,
      location: item.location || 'Inside Jalingo',
      commission_per_unit: commission,
      total_commission_if_sold: commission * item.quantity,
    };
  });

  return NextResponse.json(postedItems);
}
