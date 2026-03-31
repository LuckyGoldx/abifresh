import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, role')
    .in('role', ['sales', 'sales_staff'])
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(
    (data || []).map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
    }))
  );
}
