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

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if user is still active in the database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_active, full_name')
      .eq('id', decoded.sub)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      full_name: user.full_name ?? undefined,
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
      // Normalize both old and new names to the new standard names
      'staff_commission': 'commission_staff',
      'commission_staff': 'commission_staff',
      'staff_non_commission': 'non_commission_staff',
      'non_commission_staff': 'non_commission_staff',
    };

    const normalizedUserRole = roleMap[req.user.role] || req.user.role;
    const normalizedAllowedRoles = allowedRoles.map(role => roleMap[role] || role);

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
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
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
  return jwt.sign(
    {
      sub: userId,
      email,
      role,
    },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRY || '7d' } as any
  );
};

export const verifyToken = (token: string) => {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    return jwt.verify(token, jwtSecret) as any;
  } catch (error) {
    return null;
  }
};
