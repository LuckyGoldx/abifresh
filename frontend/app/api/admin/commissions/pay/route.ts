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

  const paymentAmount = parseFloat(amount);

  // Compute outstanding commission for this staff member
  const { data: generatedData } = await supabaseAdmin
    .from('staff_sales')
    .select('approved_commission')
    .eq('staff_id', staff_id)
    .gt('approved_commission', 0);

  const totalCommissionGenerated = (generatedData || []).reduce(
    (sum: number, s: any) => sum + (parseFloat(s.approved_commission) || 0),
    0
  );

  const { data: paidData } = await supabaseAdmin
    .from('staff_payments')
    .select('amount')
    .eq('staff_id', staff_id)
    .eq('payment_type', 'commission')
    .in('status', ['paid', 'approved'])
    .not('paid_by', 'is', null);

  const totalCommissionPaid = (paidData || []).reduce(
    (sum: number, p: any) => sum + (parseFloat(p.amount) || 0),
    0
  );

  const outstanding = Math.max(0, totalCommissionGenerated - totalCommissionPaid);

  if (paymentAmount > outstanding + 0.01) {
    return NextResponse.json(
      {
        error: `Payment amount (₦${paymentAmount.toLocaleString()}) exceeds outstanding commission (₦${outstanding.toLocaleString()}). Total generated: ₦${totalCommissionGenerated.toLocaleString()}, already paid: ₦${totalCommissionPaid.toLocaleString()}.`,
      },
      { status: 400 }
    );
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
