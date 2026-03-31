import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

async function enrichPayments(payments: any[]) {
  if (!payments.length) return [];
  const staffIds = [...new Set(payments.map((p) => p.staff_id))];
  const { data: staffMembers } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, role')
    .in('id', staffIds);

  const staffMap: Record<string, any> = {};
  (staffMembers || []).forEach((s: any) => (staffMap[s.id] = s));

  return payments.map((p: any) => {
    const staff = staffMap[p.staff_id];
    return {
      ...p,
      staff_name: staff?.full_name || p.staff_name || 'Unknown',
      staff_email: staff?.email,
      staff_role: staff?.role,
    };
  });
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get('staffId');
  const status = searchParams.get('status');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let query = supabaseAdmin
    .from('staff_payments')
    .select('*')
    // Exclude admin-paid commission records (managed in /admin/commissions)
    .or('payment_type.neq.commission,paid_by.is.null')
    .order('created_at', { ascending: false });

  if (staffId) query = query.eq('staff_id', staffId);
  if (status) query = query.eq('status', status);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(await enrichPayments(data || []));
}
