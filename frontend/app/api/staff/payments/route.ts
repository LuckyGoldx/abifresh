import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('staff_payments')
    .select('*')
    .eq('staff_id', authResult.id)
    .neq('payment_type', 'credit_remittance')
    .or('payment_type.neq.commission,paid_by.is.null')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const payments = (data || []).map((p: any) => ({
    id: p.id,
    staff_id: p.staff_id,
    staff_name: p.staff_name || 'N/A',
    staff_phone: p.staff_phone || 'N/A',
    amount: p.amount,
    payment_method: p.payment_method || 'unknown',
    payment_type: p.payment_type,
    status: p.status,
    reference_number: p.reference_number || 'N/A',
    receipt_url: p.receipt_url || null,
    notes: p.notes,
    items_paid_for: p.items_paid_for || [],
    requested_date: p.requested_date,
    approved_date: p.approved_date,
    created_at: p.created_at,
  }));

  return NextResponse.json(payments);
}
