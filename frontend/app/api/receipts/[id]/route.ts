import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('receipts')
    .select(`
      id, receipt_number, total_amount, payment_method, sold_outside_jalingo,
      created_at, staff_id,
      receipt_items(id, item_id, quantity, unit_price, total_price, item_id(name, price_jalingo, price_outside))
    `)
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

  // Staff can only read their own receipts; admins can read all
  if (!hasRole(authResult.role, 'admin') && data.staff_id !== authResult.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Delete receipt items first
  await supabaseAdmin.from('receipt_items').delete().eq('receipt_id', params.id);
  const { error } = await supabaseAdmin.from('receipts').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Receipt deleted' });
}
