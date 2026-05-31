import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { data: autoRemitted, error } = await supabaseAdmin
      .from('credit_payments')
      .select('*, creditors(full_name, unique_code), credit_sales(receipt_number)')
      .eq('remittance_status', 'confirmed')
      .eq('remittance_confirmed_by', authResult.id)
      .order('remittance_confirmed_at', { ascending: false });

    if (error) throw error;

    let totalAutoRemitted = 0;
    (autoRemitted || []).forEach(p => {
      totalAutoRemitted += Number(p.amount || 0);
    });

    return NextResponse.json({
      payments: autoRemitted || [],
      stats: {
        total: totalAutoRemitted,
        count: (autoRemitted || []).length,
      }
    });
  } catch (error: any) {
    console.error('Error fetching auto-remitted payments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
