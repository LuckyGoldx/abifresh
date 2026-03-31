import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const { data, error } = await supabaseAdmin
    .from('receipts')
    .select(`
      id, receipt_number, total_amount, payment_method, sold_outside_jalingo,
      created_at,
      receipt_items(id, item_id, quantity, unit_price, total_price, item_id(name, price_jalingo, price_outside))
    `)
    .eq('staff_id', authResult.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}
