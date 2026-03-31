import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAuth } from '@/lib/server/supabase-admin';
import { generateToken } from '@/lib/server/auth';

/**
 * Checks override credentials stored in environment variables.
 * These are used for accounts that exist in public.users but not in Supabase Auth
 * (e.g. superadmin accounts created before Supabase Auth was set up, or accounts
 * where Supabase Auth has internal errors).
 *
 * Format in .env: OVERRIDE_CREDS=username1:password1,username2:password2
 */
function checkOverrideCredentials(username: string, password: string): boolean {
  const raw = process.env.OVERRIDE_CREDS || '';
  if (!raw) return false;
  const entries = raw.split(',');
  for (const entry of entries) {
    const colonIdx = entry.indexOf(':');
    if (colonIdx === -1) continue;
    const u = entry.slice(0, colonIdx).trim().toLowerCase();
    const p = entry.slice(colonIdx + 1).trim();
    if (u === username.toLowerCase() && p === password) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Look up user by username (case-insensitive)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if deactivated
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact the administrator.' },
        { status: 403 }
      );
    }

    // Try Supabase Auth first
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email: user.email,
      password,
    });

    let authenticated = !authError && !!authData?.user;

    // If Supabase Auth fails, check override credentials from env
    // (handles superadmin accounts not registered in Supabase Auth)
    if (!authenticated) {
      authenticated = checkOverrideCredentials(username, password);
    }

    if (!authenticated) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user.id, user.email, user.role);

    return NextResponse.json({
      user,
      token,
      message: 'Login successful',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 400 });
  }
}
