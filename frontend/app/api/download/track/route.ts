import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

// In-memory rate limiter (best-effort in serverless)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 10;
const requestCounts = new Map<string, { count: number; windowStart: number }>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry) return false;
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    requestCounts.delete(ip);
    return false;
  }
  return entry.count >= RATE_MAX_REQUESTS;
}

function recordRequest(ip: string): void {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    requestCounts.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function anonymizeIp(ip: string): string {
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[3] = '0';
    return parts.join('.') + '/24';
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::/48';
  }
  return '0.0.0.0/24';
}

const MAX_PLATFORM_LENGTH = 50;
const MAX_USER_AGENT_LENGTH = 500;
const MAX_BODY_SIZE_BYTES = 2048;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_BODY_SIZE_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await request.json();
    const { platform, userAgent, timestamp } = body;

    if (typeof platform !== 'undefined' && typeof platform !== 'string') {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    if (typeof userAgent !== 'undefined' && typeof userAgent !== 'string') {
      return NextResponse.json({ error: 'Invalid userAgent' }, { status: 400 });
    }

    recordRequest(ip);

    const { data, error } = await supabaseAdmin
      .from('pwa_downloads')
      .insert([
        {
          platform: platform ? platform.substring(0, MAX_PLATFORM_LENGTH) : 'unknown',
          user_agent: userAgent
            ? userAgent.substring(0, MAX_USER_AGENT_LENGTH)
            : (request.headers.get('user-agent') || '').substring(0, MAX_USER_AGENT_LENGTH),
          ip_address: anonymizeIp(ip),
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
