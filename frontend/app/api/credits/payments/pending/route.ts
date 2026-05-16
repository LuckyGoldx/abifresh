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
    let query = supabaseAdmin
      .from('credit_payments')
      .select('*, creditors(full_name, unique_code), staff:users!credit_payments_staff_id_fkey(full_name), credit_sales(receipt_number)')
      .order('created_at', { ascending: false });

    // If sales staff, only show their own payments
    if (authResult.role === 'sales' || authResult.role === 'sales_staff') {
      query = query.eq('staff_id', authResult.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Pending payments fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const flattened = (data || []).map((p: any) => ({
      ...p,
      receipt_number: p.credit_sales?.receipt_number || p.reference_number || 'N/A',
      staff_name: p.staff?.full_name || 'Unknown'
    }));

    return NextResponse.json(flattened);
  } catch (error: any) {
    console.error('Pending payments server error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
