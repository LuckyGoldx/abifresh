import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';

    let query = supabaseAdmin
      .from('credit_payments')
      .select('*, creditors(full_name, unique_code, phone_number), staff:users!credit_payments_staff_id_fkey(full_name)')
      .eq('status', 'approved')
      .is('remittance_status', null)
      .order('created_at', { ascending: false });

    if (isSalesStaff) {
      query = query.eq('staff_id', authResult.id);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const payments = data || [];

    const grouped: Record<string, { creditor: any; payments: any[]; total: number; count: number }> = {};
    for (const p of payments) {
      const cid = p.creditor_id;
      if (!grouped[cid]) {
        grouped[cid] = {
          creditor: p.creditors || { full_name: 'Unknown', unique_code: '' },
          payments: [],
          total: 0,
          count: 0,
        };
      }
      grouped[cid].payments.push(p);
      grouped[cid].total += Number(p.amount);
      grouped[cid].count += 1;
    }

    const creditorsList = Object.values(grouped).sort((a, b) => b.total - a.total);

    return NextResponse.json({ payments, creditors: creditorsList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
