import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  files?: any; // Allow any file structure from express-fileupload
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
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

    console.log('🔐 Role Check:', {
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

    console.log('🔐 Normalized:', {
      normalizedUserRole,
      normalizedAllowedRoles,
      isAllowed: normalizedAllowedRoles.includes(normalizedUserRole)
    });

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      console.log('❌ Access denied for role:', req.user.role);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    console.log('✅ Access granted');
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
