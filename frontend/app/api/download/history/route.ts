import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get('limit') || '50';
    const limit = Math.min(Math.max(1, parseInt(limitParam) || 50), 500);

    const { data, error } = await supabaseAdmin
      .from('pwa_downloads')
      .select('*')
      .order('downloaded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch download history:', error);
      return NextResponse.json({ data: [], count: 0 });
    }

    return NextResponse.json({ data: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error('Download history error:', error);
    return NextResponse.json({ data: [], count: 0 });
  }
}
