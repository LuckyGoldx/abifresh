import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase-admin';

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
}

export type RouteHandler = (
  req: NextRequest,
  user: AuthUser,
  params?: any
) => Promise<NextResponse>;

/**
 * Verifies the JWT from the Authorization header and looks up the user in the DB.
 * Returns the user, or throws with a NextResponse error.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | NextResponse> {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Ensure decoded has required fields
  if (!decoded || !decoded.sub || !decoded.email) {
    return NextResponse.json({ error: 'Invalid token structure' }, { status: 401 });
  }

  // Look up user in DB (same logic as Express auth middleware)
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    decoded.sub
  );

  let dbUser: any = null;
  let dbError: any = null;

  if (isValidUUID) {
    const result = await supabaseAdmin
      .from('users')
      .select('id, email, is_active, full_name')
      .eq('id', decoded.sub)
      .single();
    dbUser = result.data;
    dbError = result.error;
  } else if (decoded.email) {
    const result = await supabaseAdmin
      .from('users')
      .select('id, email, is_active, full_name')
      .eq('email', decoded.email)
      .single();
    dbUser = result.data;
    dbError = result.error;
  }

  if (dbError || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  if (!dbUser.is_active) {
    return NextResponse.json(
      { error: 'Your account has been deactivated. Please contact the administrator.' },
      { status: 403 }
    );
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: decoded.role,
    full_name: dbUser.full_name ?? undefined,
  };
}

/**
 * Checks if a user has one of the allowed roles (same normalization as Express roleMiddleware).
 */
export function hasRole(userRole: string, ...allowedRoles: string[]): boolean {
  const roleMap: Record<string, string> = {
    sales: 'sales',
    sales_staff: 'sales',
    admin: 'admin',
    superadmin: 'superadmin',
    staff_commission: 'commission_staff',
    commission_staff: 'commission_staff',
    staff_non_commission: 'non_commission_staff',
    non_commission_staff: 'non_commission_staff',
  };

  const normalizedUserRole = roleMap[userRole] || userRole;
  const normalizedAllowed = allowedRoles.map((r) => roleMap[r] || r);

  const isSuperadmin = normalizedUserRole === 'superadmin';
  const adminRequired = normalizedAllowed.includes('admin');

  return (
    normalizedAllowed.includes(normalizedUserRole) || (isSuperadmin && adminRequired)
  );
}

/**
 * Generates a JWT token (same as the Express backend generateToken).
 */
export function generateToken(userId: string, email: string, role: string): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ sub: userId, email, role }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '30d',
  } as any);
}
