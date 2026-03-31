import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('posted_items')
    .select('quantity, status')
    .eq('poster_id', authResult.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const items = data || [];
  return NextResponse.json({
    total_posted_items: items.length,
    total_posted_quantity: items.reduce((sum: number, p: any) => sum + p.quantity, 0),
    accepted_items: items.filter((p: any) => p.status === 'accepted').length,
    accepted_quantity: items
      .filter((p: any) => p.status === 'accepted')
      .reduce((sum: number, p: any) => sum + p.quantity, 0),
    pending_items: items.filter((p: any) => p.status === 'pending').length,
    rejected_items: items.filter((p: any) => p.status === 'rejected').length,
  });
}
