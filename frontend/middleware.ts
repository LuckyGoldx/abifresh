import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/auth/login',
  '/api/download/track',
  '/api/download/stats',
];

const JWT_SECRET = process.env.JWT_SECRET || '';

async function verifyJwt(token: string): Promise<{ sub: string; email: string; role: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlToArrayBuffer(parts[2]);
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);

    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(parts[1]));
    if (!payload.sub || !payload.email) return null;

    return { sub: payload.sub, email: payload.email, role: payload.role || '' };
  } catch {
    return null;
  }
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const user = await verifyJwt(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-auth-user-id', user.sub);
  requestHeaders.set('x-auth-user-email', user.email);
  requestHeaders.set('x-auth-user-role', user.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: '/api/:path*',
};
