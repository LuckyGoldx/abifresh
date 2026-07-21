import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { sale_ids, receipt_id, receipt_number } = await req.json();

    if (!sale_ids || !Array.isArray(sale_ids) || sale_ids.length === 0) {
      return NextResponse.json({ error: 'sale_ids array is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('staff_sales')
      .update({
        receipt_id: receipt_id || null,
        receipt_number: receipt_number || null,
      })
      .in('id', sale_ids)
      .eq('staff_id', authResult.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, updated: sale_ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
