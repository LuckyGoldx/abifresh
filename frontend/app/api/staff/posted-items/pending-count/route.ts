import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { count, error } = await supabaseAdmin
    .from('posted_items')
    .select('id', { count: 'exact', head: true })
    .eq('staff_id', authResult.id)
    .eq('status', 'pending');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ count: count || 0 });
}
