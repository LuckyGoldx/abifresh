import helmet from 'helmet';

/**
 * Enhanced Helmet security headers configuration.
 *
 * Protects against:
 * - Clickjacking (X-Frame-Options)
 * - MIME-type sniffing (X-Content-Type-Options)
 * - XSS (via CSP + X-XSS-Protection)
 * - Protocol downgrade (HSTS)
 * - Information leakage (Referrer-Policy, hide X-Powered-By)
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.supabase.co'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Prevent clickjacking
  frameguard: { action: 'deny' },

  // Prevent MIME-type sniffing
  noSniff: undefined, // helmet v7 enables by default

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // Remove X-Powered-By header
  hidePoweredBy: true,

  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Allow embedding images from Supabase storage
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
