import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

// GET /api/superadmin/staff — returns ALL users including superadmins.
// Only superadmin role may access this endpoint.
export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'superadmin')) {
    return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .range(offset, offset + limit - 1)
    .order('full_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(users || []);
}
