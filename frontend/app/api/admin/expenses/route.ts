import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Fetch expenses (no PostgREST join — avoids schema cache issues)
  const { data: allExpenses, error } = await supabaseAdmin
    .from('staff_expenses')
    .select('*')
    .order('expense_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Manually enrich with staff info
  const staffIds = [...new Set((allExpenses || []).map((e: any) => e.staff_id).filter(Boolean))];
  let staffMap: Record<string, any> = {};
  if (staffIds.length > 0) {
    const { data: staffData } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, phone_number')
      .in('id', staffIds);
    (staffData || []).forEach((s: any) => { staffMap[s.id] = s; });
  }

  const combined = (allExpenses || []).map((e: any) => {
    const staff = staffMap[e.staff_id];
    const parts = e.description ? e.description.split('\n\n[Admin Note]: ') : [];
    return {
      id: e.id,
      staff_id: e.staff_id,
      staff_name: staff?.full_name || 'Unknown',
      staff_email: staff?.email || '',
      staff_role: staff?.role || 'staff',
      staff_phone: staff?.phone_number || '',
      expense_type: e.expense_category || 'Other',
      amount: parseFloat(e.expense_amount) || 0,
      description: parts[0] || '',
      admin_notes: parts[1] || '',
      expense_date: e.expense_date,
      status: e.status || 'approved',
      created_at: e.created_at,
      updated_at: e.updated_at,
    };
  });

  return NextResponse.json(combined);
}
