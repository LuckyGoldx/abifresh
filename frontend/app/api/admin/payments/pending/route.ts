import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

async function enrichPayments(payments: any[]) {
  if (!payments.length) return [];
  const staffIds = [...new Set(payments.map((p) => p.staff_id))];
  const approverIds = [...new Set(payments.map((p) => p.approved_by).filter(Boolean))];
  const allUserIds = [...new Set([...staffIds, ...approverIds])];

  const { data: staffMembers } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, role')
    .in('id', allUserIds);

  const staffMap: Record<string, any> = {};
  (staffMembers || []).forEach((s: any) => (staffMap[s.id] = s));

  return payments.map((p: any) => {
    const staff = staffMap[p.staff_id];
    const approver = p.approved_by ? staffMap[p.approved_by] : null;
    return {
      id: p.id,
      staff_id: p.staff_id,
      staff_name: staff?.full_name || 'Unknown',
      staff_email: staff?.email,
      staff_role: staff?.role,
      staff_phone: p.staff_phone,
      amount: p.amount,
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      reference_number: p.reference_number,
      status: p.status,
      notes: p.notes,
      items_paid_for: p.items_paid_for,
      receipt_url: p.receipt_url,
      requested_date: p.requested_date,
      approved_date: p.approved_date,
      created_at: p.created_at,
      rejection_reason: p.rejection_reason,
      approved_by_name: approver?.full_name || null,
    };
  });
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('staff_payments')
    .select('*')
    .eq('status', 'pending')
    // Exclude admin-paid commission records (managed in /admin/commissions)
    .or('payment_type.neq.commission,paid_by.is.null')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(await enrichPayments(data || []));
}
