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
  const { staffId, itemId, commissionPercentage } = body;

  if (!staffId || !itemId || commissionPercentage === undefined) {
    return NextResponse.json({ error: 'staffId, itemId, and commissionPercentage are required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('staff_commissions').upsert(
    [{
      staff_id: staffId,
      item_id: itemId,
      commission_percentage: commissionPercentage,
      is_active: true,
      effective_date: new Date().toISOString().split('T')[0],
      created_by: authResult.id,
    }],
    { onConflict: 'staff_id,item_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Commission set successfully' });
}
