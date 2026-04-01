import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('backup_history')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ history: data ?? [] });
  } catch {
    return NextResponse.json({ history: [] });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const { tablesCount, totalRows, format, fileName, durationMs, tableNames, status, errorMessage } = body;

  const { data, error } = await supabaseAdmin
    .from('backup_history')
    .insert({
      triggered_by: authResult.id,
      triggered_by_name: authResult.email || 'Admin',
      tables_count: tablesCount ?? 0,
      total_rows: totalRows ?? 0,
      format: format ?? 'excel-all',
      file_name: fileName ?? 'unknown',
      duration_ms: durationMs ?? 0,
      table_names: tableNames ?? [],
      status: status ?? 'success',
      error_message: errorMessage ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: (data as any).id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('backup_history')
    .delete()
    .gte('created_at', '1970-01-01T00:00:00.000Z');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
