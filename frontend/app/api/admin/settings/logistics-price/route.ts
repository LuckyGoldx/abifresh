import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('setting_value')
    .eq('setting_key', 'logistics_price')
    .single();

  if (error) {
    // Return default if setting not found
    return NextResponse.json({ price: 500 });
  }

  return NextResponse.json({ price: parseFloat(data?.setting_value) || 500 });
}
