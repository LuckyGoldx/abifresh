import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection for JWT-based APIs
 *
 * Since this API uses Bearer token authentication (not cookie-based sessions),
 * traditional CSRF tokens (csurf) are not needed. Instead, we validate the
 * Origin/Referer headers on state-changing requests to ensure requests
 * come from trusted origins.
 *
 * This is the OWASP-recommended approach for token-based APIs:
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(o => o.trim().toLowerCase());

// Also allow requests without Origin header (e.g., mobile apps, Postman in dev)
const ALLOW_NO_ORIGIN = process.env.NODE_ENV !== 'production';

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Only check state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin?.toLowerCase();
  const referer = req.headers.referer?.toLowerCase();

  // If no origin/referer header (e.g., server-to-server, mobile, curl)
  if (!origin && !referer) {
    if (ALLOW_NO_ORIGIN) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Missing origin header' });
  }

  // Check if origin is in allowed list
  if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
    return next();
  }

  // Fallback: check referer
  if (referer && ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))) {
    return next();
  }

  console.warn(`⚠️ CSRF check failed: origin=${origin}, referer=${referer}`);
  return res.status(403).json({ error: 'Forbidden: Invalid origin' });
};
