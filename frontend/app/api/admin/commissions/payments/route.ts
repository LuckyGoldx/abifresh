import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const COMMISSION_ROLES = ['commission_staff', 'staff_commission'];

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // 1. Get all commission staff IDs so we only show their payments
  const { data: commissionStaff } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, username')
    .in('role', COMMISSION_ROLES);

  const staffMap: Record<string, any> = {};
  const commissionStaffIds: string[] = [];
  (commissionStaff || []).forEach((s: any) => {
    staffMap[s.id] = s;
    commissionStaffIds.push(s.id);
  });

  if (commissionStaffIds.length === 0) {
    return NextResponse.json([]);
  }

  // 2. Fetch only commission payments made by admin (paid_by is set) for commission staff
  let query = supabaseAdmin
    .from('staff_payments')
    .select('id, staff_id, amount, status, notes, requested_date, approved_date, paid_date, created_at')
    .eq('payment_type', 'commission')
    .in('staff_id', commissionStaffIds)
    .not('paid_by', 'is', null)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const enriched = (data || []).map((p: any) => ({
    id: p.id,
    staff_id: p.staff_id,
    staff_name: staffMap[p.staff_id]?.full_name || 'Unknown',
    staff_email: staffMap[p.staff_id]?.email || '',
    amount: parseFloat(p.amount) || 0,
    status: p.status,
    notes: p.notes,
    created_at: p.created_at,
    approved_date: p.approved_date,
    paid_date: p.paid_date,
    requested_date: p.requested_date,
  }));

  return NextResponse.json(enriched);
}
