import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Avoid PostgREST join (schema cache issues with multiple FKs to users)
  const { data, error } = await supabaseAdmin
    .from('staff_commissions')
    .select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Manually enrich with staff info
  const staffIds = [...new Set((data || []).map((c: any) => c.staff_id).filter(Boolean))];
  let staffMap: Record<string, any> = {};
  if (staffIds.length > 0) {
    const { data: staffData } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .in('id', staffIds);
    (staffData || []).forEach((s: any) => { staffMap[s.id] = s; });
  }

  const enriched = (data || []).map((c: any) => ({
    ...c,
    users: staffMap[c.staff_id] ? { full_name: staffMap[c.staff_id].full_name, email: staffMap[c.staff_id].email } : null,
  }));

  return NextResponse.json(enriched);
}
