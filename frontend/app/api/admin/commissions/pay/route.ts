import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { staff_id, amount, notes } = body;

  if (!staff_id || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: 'staff_id and a valid positive amount are required' }, { status: 400 });
  }

  // Verify the staff member exists and is commission staff
  const { data: staffUser, error: staffError } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role')
    .eq('id', staff_id)
    .single();

  if (staffError || !staffUser) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('staff_payments')
    .insert([{
      staff_id,
      amount: parseFloat(amount),
      payment_type: 'commission',
      status: 'paid',
      notes: notes || `Commission payment for ${staffUser.full_name}`,
      approved_by: authResult.id,
      paid_by: authResult.id,
      approved_date: now,
      paid_date: now,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: 'Commission payment created successfully', payment: data }, { status: 201 });
}
