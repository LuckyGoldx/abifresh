import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAuth } from '@/lib/server/supabase-admin';
import { generateToken } from '@/lib/server/auth';

// ---------------------------------------------------------------------------
// Failed-attempt rate limiter (in-process, per IP)
// Counts only WRONG credential attempts — not total requests.
// In a multi-instance serverless deployment (Vercel) this is best-effort;
// for stricter enforcement at scale use Upstash Redis + @upstash/ratelimit.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX_FAILURES = 10;

interface RateEntry { count: number; windowStart: number }
const failedAttempts = new Map<string, RateEntry>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= RATE_MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function clearFailures(ip: string): void {
  failedAttempts.delete(ip);
}

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
    const ip = getClientIp(req);

    // Reject IPs that have exceeded the failed-attempt threshold
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again in a minute.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      );
    }

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
      recordFailure(ip);
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
      recordFailure(ip);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Successful login — clear any accumulated failure count for this IP
    clearFailures(ip);

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
