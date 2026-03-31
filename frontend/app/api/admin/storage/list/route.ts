import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get('bucket') || 'payments';
  const folder = searchParams.get('folder') || '';

  const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder || undefined, {
    limit: 200,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Generate public URLs for files
  const files = (data || []).map((file) => {
    const path = folder ? `${folder}/${file.name}` : file.name;
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return {
      ...file,
      url: urlData?.publicUrl,
    };
  });

  return NextResponse.json(files);
}
