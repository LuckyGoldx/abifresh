import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, userAgent, timestamp } = body;

    const { data, error } = await supabaseAdmin
      .from('pwa_downloads')
      .insert([
        {
          platform: platform || 'unknown',
          user_agent: userAgent || request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          downloaded_at: timestamp || new Date().toISOString(),
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to track download:', error);
      return NextResponse.json({ error: 'Failed to track download' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Download track error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
