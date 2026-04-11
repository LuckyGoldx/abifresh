import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const isSuperadmin = authResult.role === 'superadmin';
  const HIDDEN_EMAILS = '("staff@abifresh.com","commission@abifresh.com","sales.@abifresh.com")';

  let staffQuery = supabaseAdmin
    .from('users')
    .select('id, full_name, email, role')
    .in('role', ['commission_staff', 'non_commission_staff']);
  if (!isSuperadmin) staffQuery = staffQuery.not('email', 'in', HIDDEN_EMAILS);
  const { data, error } = await staffQuery.order('full_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const staffList = (data || []).map((staff: any) => ({
    id: staff.id,
    name: staff.full_name,
    email: staff.email,
    role: staff.role,
    role_display:
      staff.role === 'commission_staff' ? 'Commission Staff' : 'Non-Commission Staff',
  }));

  return NextResponse.json(staffList);
}
