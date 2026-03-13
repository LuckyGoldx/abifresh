import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import logger, { logSecurity } from '../config/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    full_name?: string;
  };
  files?: any; // Allow any file structure from express-fileupload
}

// Validate JWT_SECRET exists at application startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required but not set. Application cannot start without it.');
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if decoded.sub is a valid UUID format
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded.sub);
    
    let dbUser: any = null;
    let dbError: any = null;

    if (isValidUUID) {
      // Normal path: look up by UUID
      const result = await supabaseAdmin
        .from('users')
        .select('id, is_active, full_name')
        .eq('id', decoded.sub)
        .single();
      dbUser = result.data;
      dbError = result.error;
    } else if (decoded.email) {
      // Demo user with non-UUID sub (e.g. "admin-001") - look up by email to get real UUID
      const result = await supabaseAdmin
        .from('users')
        .select('id, is_active, full_name')
        .eq('email', decoded.email)
        .single();
      dbUser = result.data;
      dbError = result.error;
    }

    if (dbError || !dbUser) {
      logSecurity('User not found in database', { sub: decoded.sub, email: decoded.email, ip: req.ip });
      return res.status(401).json({ error: 'User not found' });
    }

    if (!dbUser.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
    }

    req.user = {
      id: dbUser.id,
      email: decoded.email,
      role: decoded.role,
      full_name: dbUser.full_name ?? undefined,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.debug('Role check', {
      userRole: req.user.role,
      allowedRoles: allowedRoles,
      userEmail: req.user.email
    });

    // Map roles to normalize them (support both naming conventions)
    const roleMap: { [key: string]: string } = {
      'sales': 'sales',
      'sales_staff': 'sales',
      'admin': 'admin',
      'superadmin': 'superadmin',
      // Normalize both old and new names to the new standard names
      'staff_commission': 'commission_staff',
      'commission_staff': 'commission_staff',
      'staff_non_commission': 'non_commission_staff',
      'non_commission_staff': 'non_commission_staff',
    };

    const normalizedUserRole = roleMap[req.user.role] || req.user.role;
    const normalizedAllowedRoles = allowedRoles.map(role => roleMap[role] || role);

    // Superadmin has access to everything admin can access
    const isSuperadmin = normalizedUserRole === 'superadmin';
    const adminRequired = normalizedAllowedRoles.includes('admin');

    if (!normalizedAllowedRoles.includes(normalizedUserRole) && !(isSuperadmin && adminRequired)) {
      logSecurity('access_denied', {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    logger.debug('Access granted', { userId: req.user.id, role: req.user.role, path: req.path });
    next();
  };
};

export const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign(
    {
      sub: userId,
      email,
      role,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' } as any
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
};
