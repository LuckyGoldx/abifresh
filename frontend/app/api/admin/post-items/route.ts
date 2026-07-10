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
    const PAGE = 1000;
    const allData: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('posted_items')
        .select(`
          *,
          item:item_id(name, sku),
          staff:staff_id(full_name, username),
          poster:poster_id(full_name, username)
        `)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      if (!data || data.length === 0) break;
      allData.push(...data);
      from += PAGE;
    }

    return NextResponse.json(allData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
