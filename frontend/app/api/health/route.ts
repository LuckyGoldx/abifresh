import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('users').select('count').limit(1);
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'ABIFRESH & KIDDIES VENTURES API (Vercel)',
      database: { supabase: error ? 'DISCONNECTED' : 'CONNECTED' },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch {
    return NextResponse.json(
      { status: 'ERROR', timestamp: new Date().toISOString(), service: 'ABIFRESH API' },
      { status: 500 }
    );
  }
}
