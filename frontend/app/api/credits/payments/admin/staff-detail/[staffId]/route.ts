import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest, { params }: { params: { staffId: string } }) {
  const { staffId } = params;
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    // 1. Fetch staff info
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, phone_number')
      .eq('id', staffId)
      .single();

    if (staffError) throw staffError;

    // 2. Fetch collected credit payments (approved by this staff)
    const { data: collected, error: collectedError } = await supabaseAdmin
      .from('credit_payments')
      .select('*, creditors(full_name), credit_sales(receipt_number)')
      .eq('staff_id', staffId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (collectedError) throw collectedError;

    // 3. Fetch remittances (staff_payments)
    const { data: remittances, error: remittancesError } = await supabaseAdmin
      .from('staff_payments')
      .select('*')
      .eq('staff_id', staffId)
      .eq('payment_type', 'credit_remittance')
      .order('created_at', { ascending: false });

    if (remittancesError) throw remittancesError;

    // 4. Calculate Stats
    const totalCollected = (collected || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const approvedRemittance = (remittances || [])
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.approved_amount || r.amount || 0), 0);
    const pendingRemittance = (remittances || [])
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    
    const outstandingAmount = (collected || [])
      .filter(c => c.remittance_status === null)
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const unremittedItems = (collected || []).filter(c => c.remittance_status === null);

    return NextResponse.json({
      staff,
      stats: {
        totalCollected,
        approvedRemittance,
        pendingRemittance,
        outstandingAmount
      },
      remittances: remittances || [],
      unremittedItems: unremittedItems || []
    });

  } catch (error: any) {
    console.error('Error fetching staff credit details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
