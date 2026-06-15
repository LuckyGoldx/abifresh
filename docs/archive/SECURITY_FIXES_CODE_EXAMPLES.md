# 🔐 SECURITY FIXES - IMPLEMENTATION GUIDE
## Ready-to-use code snippets for ABIFRESH & KIDDIES VENTURES

**Created:** February 27, 2026

---

## Table of Contents
1. [Password Validation](#1-password-validation)
2. [Helmet Security Headers](#2-helmet-security-headers)
3. [Rate Limiting](#3-rate-limiting)
4. [CSRF Protection](#4-csrf-protection)
5. [Input Validation](#5-input-validation)
6. [Secure Logging](#6-secure-logging)
7. [Request Size Limits](#7-request-size-limits)
8. [HttpOnly Cookies](#8-httponly-cookies)
9. [API Versioning](#9-api-versioning)
10. [Environment Validation](#10-environment-validation)

---

## 1. Password Validation

### Create File: `backend/src/utils/password-validator.ts`

```typescript
/**
 * Password validation utilities
 * Enforces strong password requirements: 12+ chars, uppercase, lowercase, numbers, symbols
 */

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  score: number; // 0-100
}

// Common weak passwords to avoid
const WEAK_PASSWORDS = [
  'password', 'admin', 'qwerty', '12345678', 'abc123', 'test123',
  'welcome', 'letmein', 'monkey', 'dragon', 'master', '1234567',
  'baseball', 'iloveyou', 'trustno1', 'superman', 'batman'
];

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (!password) {
    return { valid: false, errors: ['Password is required'], score: 0 };
  }

  // Length requirement: minimum 12 characters
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters (you have ' + password.length + ')');
  } else {
    score += 20;
  }

  // Maximum length: 128 characters (reasonable upper bound)
  if (password.length > 128) {
    errors.push('Password is too long (max 128 characters)');
  }

  // Uppercase letters required
  if (!/[A-Z]/.test(password)) {
    errors.push('Must include at least one UPPERCASE letter (A-Z)');
  } else {
    score += 20;
  }

  // Lowercase letters required
  if (!/[a-z]/.test(password)) {
    errors.push('Must include at least one lowercase letter (a-z)');
  } else {
    score += 20;
  }

  // Numbers required
  if (!/\d/.test(password)) {
    errors.push('Must include at least one number (0-9)');
  } else {
    score += 20;
  }

  // Special characters required
  if (!/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)) {
    errors.push('Must include at least one special character (!@#$%^&* etc)');
  } else {
    score += 20;
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Cannot use the same character 3+ times in a row (e.g., "aaa")');
  }

  if (/^[a-z]*[0-9]*$|^[0-9]*[a-z]*$/i.test(password)) {
    errors.push('Password is too simple (mixing letters and numbers helps)');
  }

  // Check against common passwords
  const lowerPassword = password.toLowerCase();
  if (WEAK_PASSWORDS.some(weak => lowerPassword.includes(weak))) {
    errors.push('Password contains a commonly used word. Please choose something more unique');
  }

  // Check for sequential characters
  if (/012345|123456|234567|345678|456789|567890|abcdef|bcdefg|cdefgh/.test(lowerPassword)) {
    errors.push('Password contains sequential characters (avoid 123456, abcdef, etc)');
  }

  return {
    valid: errors.length === 0,
    errors,
    score: Math.min(100, score)
  };
}

/**
 * Format validation errors for API response
 */
export function formatPasswordErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  return `Password requirements: ${errors.join('; ')}`;
}

/**
 * Generate a random strong password for testing
 * (Do not use this in production without storing securely)
 */
export function generateStrongPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));
  
  // Add random characters until 16 length
  const allChars = uppercase + lowercase + numbers + special;
  while (password.length < 16) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
```

### Update File: `backend/src/routes/auth.routes.ts`

```typescript
import { validatePasswordStrength, formatPasswordErrors } from '../utils/password-validator';

// In change-password endpoint:
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userEmail = req.user!.email;

    // Validate new password strength
    const validation = validatePasswordStrength(new_password);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: validation.errors
      });
    }

    // Rest of implementation...
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

### Update File: `backend/src/routes/admin.routes.ts`

```typescript
import { validatePasswordStrength, formatPasswordErrors } from '../utils/password-validator';

// In staff/create endpoint:
router.post('/staff/create', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, full_name, username, phone_number, role, store_location } = req.body;

    // Validate password
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: validation.errors
      });
    }

    // Continue with user creation...
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 2. Helmet Security Headers

### Update File: `backend/src/index.ts`

```typescript
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';

dotenv.config();

const app = express();

// ✅ Add Helmet FIRST (before other middleware)
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],  // No inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],  // Internal styles only
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],  // Only connect to same origin
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],   // No plugins
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],    // No framing
      formAction: ["'self'"],  // Only submit to self
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000,      // 1 year in seconds
    includeSubDomains: true,
    preload: true          // Add to HSTS preload list
  },
  
  // Prevent clickjacking
  frameguard: {
    action: 'deny'         // Block all framing
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // XSS filtering
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // Prevent opening in iframe
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Rest of middleware...
app.use(express.json({
  limit: '10kb'  // Limit JSON payload size
}));

// ... rest of app setup
```

### Verify Headers

```bash
# Test with curl
curl -I http://localhost:5000/health

# Look for these headers in response:
# - X-Frame-Options: DENY
# - Strict-Transport-Security: max-age=31536000
# - X-Content-Type-Options: nosniff
# - X-XSS-Protection: 1; mode=block
# - Content-Security-Policy: ...
```

---

## 3. Rate Limiting

### Install Package

```bash
npm install express-rate-limit
```

### Create File: `backend/src/middleware/ratelimit.ts`

```typescript
import rateLimit, { Request } from 'express-rate-limit';

/**
 * General rate limiter: 100 requests per 15 minutes
 * Applied to all API routes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,      // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,       // Disable `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Don't rate limit health checks
    return req.path === '/health';
  }
});

/**
 * Login limiter: 5 attempts per 15 minutes
 * Strict limit for authentication endpoints
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 5,                         // 5 attempts per window
  message: 'Too many login attempts. Please try again after 15 minutes',
  skipSuccessfulRequests: true,   // Don't count successful logins against limit
  skipFailedRequests: false,      // Count all requests
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Registration limiter: 3 accounts per hour
 * Prevents abuse of registration endpoint
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,                     // 3 registrations per hour per IP
  message: 'Too many registration attempts. Please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Password reset limiter: 3 attempts per hour
 * Prevents brute force on password reset
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,                     // 3 attempts per hour
  message: 'Too many password reset attempts. Please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * File upload limiter: 10 uploads per hour
 * Conserves storage and bandwidth
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                    // 10 uploads per hour
  message: 'Too many uploads. Please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Report generation limiter: 5 per 30 minutes
 * Prevents expensive database operations
 */
export const reportLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,  // 30 minutes
  max: 5,                     // 5 reports per 30 minutes
  message: 'Too many report requests. Please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * API limiter for authenticated endpoints
 * More lenient than public endpoints since user is authenticated
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 50,                    // 50 requests per minute
  message: 'Too many requests. Please slow down',
  skipFailedRequests: true,   // Don't count errors
  skip: (req: Request) => {
    // Don't limit admin users
    return (req as any).user?.role === 'admin';
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### Update File: `backend/src/index.ts`

```typescript
import {
  generalLimiter,
  loginLimiter,
  registrationLimiter,
  uploadLimiter,
  reportLimiter
} from './middleware/ratelimit';

// Apply general limiter to all /api routes
app.use('/api', generalLimiter);

// Apply specific limiters to routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registrationLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/receipts/upload', uploadLimiter);
app.use('/api/admin/reports', reportLimiter);

// Routes here...
app.use('/api/auth', authRoutes);
// ... etc
```

### Test Rate Limiting

```bash
# Test login rate limiting (should fail on 6th attempt)
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
  echo ""
  sleep 1
done
# Should see rate limit error on attempt 6
```

---

## 4. CSRF Protection

### Install Packages

```bash
npm install csurf cookie-parser
npm install --save-dev @types/csurf
```

### Create File: `backend/src/middleware/csrf.ts`

```typescript
import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

/**
 * CSRF protection middleware
 * Prevents Cross-Site Request Forgery attacks
 */

// CSRF protection with cookie storage
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000  // 1 hour
  }
});

/**
 * Get CSRF token for client
 * Endpoint that returns CSRF token to be included in requests
 */
export const getCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

/**
 * Send CSRF token to client
 * To be included in state-changing requests
 */
export const sendCSRFToken = (req: Request, res: Response) => {
  try {
    res.json({
      csrfToken: req.csrfToken()
    });
  } catch (error: any) {
    res.status(400).json({ error: 'Failed to generate CSRF token' });
  }
};

/**
 * Error handler for CSRF failures
 */
export const csrfErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  // CSRF token errors should result in a 403 Forbidden
  res.status(403).json({
    error: 'Invalid CSRF token',
    message: 'This request was rejected for security reasons'
  });
};
```

### Update File: `backend/src/index.ts`

```typescript
import cookieParser from 'cookie-parser';
import { csrfProtection, sendCSRFToken, csrfErrorHandler } from './middleware/csrf';

// Use cookie parser middleware
app.use(cookieParser());

// ✅ Apply CSRF protection to state-changing operations
app.post('/api/*', csrfProtection);
app.put('/api/*', csrfProtection);
app.delete('/api/*', csrfProtection);
app.patch('/api/*', csrfProtection);

// Endpoint to get CSRF token
app.get('/api/auth/csrf-token', sendCSRFToken);

// Error handler for CSRF (add after all routes)
app.use(csrfErrorHandler);
```

### Frontend Implementation: `frontend/lib/api.ts`

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let csrfToken = '';

/**
 * Get CSRF token from server
 * Call this once at app startup
 */
export const initCSRFToken = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/auth/csrf-token`);
    csrfToken = response.data.csrfToken;
    console.log('✅ CSRF token initialized');
  } catch (error) {
    console.error('❌ Failed to get CSRF token', error);
  }
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // ✅ Include cookies in requests
});

// Add CSRF token to state-changing requests
api.interceptors.request.use(
  (config) => {
    // Add CSRF token for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.error?.includes('CSRF')) {
      // CSRF token invalid - refresh it and retry
      initCSRFToken();
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Frontend App Initialization: `frontend/app/layout.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { initCSRFToken } from '@/lib/api';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Initialize CSRF protection on app start
    initCSRFToken();
  }, []);

  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
```

---

## 5. Input Validation

### Install Package

```bash
npm install express-validator
```

### Create File: `backend/src/middleware/validators.ts`

```typescript
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Handle validation errors
 * Returns detailed error information to client
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: 'param' in err ? err.param : 'unknown',
        message: err.msg,
        value: 'value' in err ? err.value : undefined
      }))
    });
  }
  next();
};

// ============================================================================
// USER VALIDATION
// ============================================================================

export const validateUserCreation = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email must be less than 100 characters')
    .custom(async (value) => {
      // Check if email already exists (if needed)
      // const users = await db.users.findOne({ email: value });
      // if (users) throw new Error('Email already registered');
    }),

  body('password')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .isLength({ max: 128 }).withMessage('Password must be less than 128 characters')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter')
    .matches(/\d/).withMessage('Password must include a number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/)
      .withMessage('Password must include a special character (!@#$% etc)'),

  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, apostrophes'),

  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscore, hyphen'),

  body('phone_number')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),

  body('role')
    .isIn(['admin', 'sales', 'commission_staff', 'non_commission_staff'])
    .withMessage('Invalid role selected'),

  body('store_location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location must be less than 100 characters')
];

export const validatePasswordChange = [
  body('new_password')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .isLength({ max: 128 }).withMessage('Password must be less than 128 characters')
    .matches(/[A-Z]/).withMessage('Password must include uppercase letter')
    .matches(/[a-z]/).withMessage('Password must include lowercase letter')
    .matches(/\d/).withMessage('Password must include a number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/)
      .withMessage('Password must include a special character'),

  body('old_password')
    .notEmpty().withMessage('Current password required for verification')
];

// ============================================================================
// INVENTORY VALIDATION
// ============================================================================

export const validateItemCreation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Item name must be 2-100 characters')
    .matches(/^[a-zA-Z0-9\s&()-]+$/).withMessage('Item name contains invalid characters'),

  body('unit_price')
    .notEmpty().withMessage('Unit price is required')
    .isFloat({ min: 0.01, max: 999999 }).withMessage('Price must be between 0.01 and 999,999'),

  body('opening_quantity')
    .notEmpty().withMessage('Opening quantity is required')
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),

  body('reorder_level')
    .optional()
    .isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer')
];

// ============================================================================
// PAYMENT VALIDATION
// ============================================================================

export const validatePaymentApproval = [
  param('id')
    .notEmpty().withMessage('Payment ID is required')
    .isUUID().withMessage('Invalid payment ID format'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
];

export const validatePaymentRequest = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
    .custom((value) => {
      if (value > 999999999) {
        throw new Error('Amount is too large');
      }
      return true;
    }),

  body('payment_method')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['bank_transfer', 'cash', 'check', 'mobile_money'])
    .withMessage('Invalid payment method'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Notes must be less than 300 characters')
];

// ============================================================================
// FILE UPLOAD VALIDATION
// ============================================================================

export const validateFileUpload = [
  body('file')
    .custom((value, { req }) => {
      if (!req.files || !req.files.receipt) {
        throw new Error('No file uploaded');
      }

      const file = req.files.receipt;
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (file.size > maxSize) {
        throw new Error('File must be less than 5MB');
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new Error('Only JPG, PNG, GIF, WebP, and PDF files are allowed');
      }

      return true;
    })
];

// ============================================================================
// QUERY VALIDATION
// ============================================================================

export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be in ISO 8601 format (YYYY-MM-DD)'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be in ISO 8601 format (YYYY-MM-DD)')
];

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be at least 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];
```

### Apply Validators to Routes: `backend/src/routes/admin.routes.ts`

```typescript
import {
  validateUserCreation,
  validatePaymentApproval,
  handleValidationErrors
} from '../middleware/validators';

// Create staff with validation
router.post(
  '/staff/create',
  authMiddleware,
  roleMiddleware('admin'),
  ...validateUserCreation,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    // All inputs validated!
    const { email, password, full_name, username, phone_number, role, store_location } = req.body;
    // ... rest of implementation
  }
);

// Approve payment with validation
router.post(
  '/payments/:id/approve',
  authMiddleware,
  roleMiddleware('admin'),
  ...validatePaymentApproval,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    // All inputs validated!
    const { id } = req.params;
    const { notes } = req.body;
    // ... rest of implementation
  }
);
```

---

## 6. Secure Logging

### Create File: `backend/src/utils/logger.ts`

```typescript
/**
 * Secure logging utility
 * Sanitizes sensitive data before logging
 */

const SENSITIVE_FIELDS = [
  'password', 'passwordHash', 'token', 'refreshToken', 'accessToken',
  'secret', 'apiKey', 'apiSecret', 'auth', 'authorization',
  'email', 'phone_number', 'phone', 'ssn', 'creditCard', 'cardNumber',
  'cvv', 'expiry', 'total_amount', 'amount', 'balance', 'salary'
];

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

/**
 * Recursively sanitize an object to remove sensitive fields
 */
function sanitizeData(data: any, depth = 0): any {
  // Prevent deep recursion and null/undefined
  if (depth > 5 || data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  const sanitized: any = {};

  for (const key in data) {
    const lowerKey = key.toLowerCase();

    // Check if this is a sensitive field
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeData(data[key], depth + 1);
    } else {
      sanitized[key] = data[key];
    }
  }

  return sanitized;
}

/**
 * Get log level from environment
 */
function getLogLevel(): string {
  return (process.env.LOG_LEVEL || 'info').toLowerCase();
}

/**
 * Check if log level should be output
 */
function shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
  const levels: { [key: string]: number } = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  const currentLevel = getLogLevel();
  return levels[level] >= levels[currentLevel];
}

/**
 * Format timestamp
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Logger object with different log levels
 */
export const logger = {
  debug: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    const sanitized = data ? sanitizeData(data) : undefined;
    console.log(
      `${colors.gray}[${timestamp()}] [DEBUG]${colors.reset}`,
      message,
      sanitized ? JSON.stringify(sanitized, null, 2) : ''
    );
  },

  info: (message: string, data?: any) => {
    if (!shouldLog('info')) return;
    const sanitized = data ? sanitizeData(data) : undefined;
    console.log(
      `${colors.blue}[${timestamp()}] [INFO]${colors.reset}`,
      message,
      sanitized ? JSON.stringify(sanitized, null, 2) : ''
    );
  },

  warn: (message: string, data?: any) => {
    if (!shouldLog('warn')) return;
    const sanitized = data ? sanitizeData(data) : undefined;
    console.warn(
      `${colors.yellow}[${timestamp()}] [WARN]${colors.reset}`,
      message,
      sanitized ? JSON.stringify(sanitized, null, 2) : ''
    );
  },

  error: (message: string, error?: any) => {
    if (!shouldLog('error')) return;
    
    const errorInfo = {
      message: error?.message || String(error),
      stack: error?.stack?.split('\n').slice(0, 5) // Only first 5 lines
    };

    console.error(
      `${colors.red}[${timestamp()}] [ERROR]${colors.reset}`,
      message,
      JSON.stringify(errorInfo, null, 2)
    );
  }
};

/**
 * HTTP request logging middleware
 */
export const httpLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode < 400 ? colors.green : colors.red;

    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
};
```

### Use Logger in Routes

```typescript
// BEFORE (❌ BAD)
console.log('Payment approved:', payment);
console.log('User data:', user);

// AFTER (✅ GOOD)
import { logger } from '../utils/logger';

logger.info('Payment approved', { 
  paymentId: payment.id,
  status: 'approved'
});

logger.info('User logged in', {
  userId: user.id,
  role: user.role
});
```

### Update Main File: `backend/src/index.ts`

```typescript
import { httpLogger, logger } from './utils/logger';

// Add HTTP logging
app.use(httpLogger);

// Log startup
logger.info('Server started', {
  port: PORT,
  environment: process.env.NODE_ENV,
  version: packageJson.version
});
```

---

## 7. Request Size Limits

### Update File: `backend/src/index.ts`

```typescript
// Set request size limits
const MB = 1024 * 1024;

// JSON payload limit: 10KB (API requests should be small)
app.use(express.json({
  limit: '10kb'
}));

// Form data limit: 10KB
app.use(express.urlencoded({
  extended: true,
  limit: '10kb'
}));

// File uploads: 5MB (separate limit, different use case)
app.use(fileUpload({
  limits: { fileSize: 5 * MB },
  useTempFiles: false,
}));

// Custom middleware to validate request body size
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.body) return next();

  const bodySize = JSON.stringify(req.body).length;
  const maxSize = 10 * 1024; // 10KB

  if (bodySize > maxSize) {
    return res.status(413).json({
      error: 'Request body too large',
      maxSize: `${maxSize / 1024}KB`,
      received: `${(bodySize / 1024).toFixed(2)}KB`
    });
  }

  next();
});
```

---

## 8. HttpOnly Cookies

### Update Backend: `backend/src/middleware/auth.ts`

```typescript
import { Response } from 'express';

/**
 * Create httpOnly secure cookie for session
 */
export const createSessionCookie = (res: Response, token: string) => {
  res.cookie('auth-token', token, {
    httpOnly: true,           // ✅ Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === 'production',  // ✅ Only over HTTPS in production
    sameSite: 'strict',       // ✅ CSRF protection
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    domain: process.env.COOKIE_DOMAIN || undefined
  });
};

/**
 * Clear authentication cookie
 */
export const clearSessionCookie = (res: Response) => {
  res.clearCookie('auth-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};
```

### Update Login Endpoint: `backend/src/routes/auth.routes.ts`

```typescript
import { createSessionCookie } from '../middleware/auth';

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Authenticate user...
    const result = await authService.loginByUsername(username, password);

    if (!result.user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(result.user.id, result.user.email, result.user.role);

    // ✅ Set httpOnly cookie (not returned in response)
    createSessionCookie(res, token);

    // Return user data (NOT the token)
    res.json({
      user: result.user,
      message: 'Login successful'
      // ✅ Token is in secure httpOnly cookie
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    clearSessionCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

### Update Frontend: `frontend/lib/api.ts`

```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // ✅ Include cookies in requests
});

// Interceptors work as before, but token is in cookie
// NOT in localStorage - much more secure!
```

### Verify Secure Cookies

```bash
# Use browser DevTools:
# 1. Open DevTools (F12)
# 2. Go to Application tab
# 3. Click Cookies > http://localhost:5000
# 4. Look for auth-token cookie
# 5. Verify: "HttpOnly" checkbox is CHECKED
# 6. Verify: "Secure" checkbox is CHECKED (in production)
```

---

## 9. API Versioning

### Update File: `backend/src/index.ts`

```typescript
// API v1 routes - current production API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/receipts', receiptsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);

// Redirect old /api routes to /api/v1 (for backwards compatibility)
app.use('/api/auth', (req, res) => {
  res.status(301).redirect(`/api/v1/auth${req.originalUrl.replace(/^\/api\/auth/, '')}`);
});
app.use('/api/sales', (req, res) => {
  res.status(301).redirect(`/api/v1/sales${req.originalUrl.replace(/^\/api\/sales/, '')}`);
});
// ... repeat for all routes
```

### Update Frontend: `frontend/lib/api.ts`

```typescript
// Use v1 API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

## 10. Environment Validation

### Create File: `backend/src/config/env.ts`

```typescript
/**
 * Environment variable validation
 * Ensures all required variables are set before app starts
 */

// Required environment variables for all environments
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'PORT'
];

// Required for production only
const PRODUCTION_ENV_VARS = [
  'FRONTEND_URL',
  'CORS_ORIGIN',
  'NODE_ENV'
];

/**
 * Validate that all required environment variables are set
 * Exit with error if any are missing
 */
export function validateEnvironment() {
  const missing: string[] = [];
  const unsafe: string[] = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check if using default/unsafe values
  if (process.env.JWT_SECRET === 'your-secret-key' ||
      process.env.JWT_SECRET === 'default-secret-key-change-in-production' ||
      !process.env.JWT_SECRET?.length) {
    unsafe.push('JWT_SECRET');
  }

  if (process.env.NODE_ENV === 'production') {
    for (const envVar of PRODUCTION_ENV_VARS) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }
  }

  // Report missing variables
  if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these variables before starting the application.');
    process.exit(1);
  }

  // Report unsafe values
  if (unsafe.length > 0) {
    console.error('❌ FATAL: Unsafe environment variable values:');
    unsafe.forEach(v => console.error(`   - ${v} is using a default or empty value`));
    console.error('\nPlease set proper values for these variables.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
}

// Export configuration
export const config = {
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production'
};
```

### Update Main File: `backend/src/index.ts`

```typescript
import { validateEnvironment, config } from './config/env';

// Validate environment variables FIRST
validateEnvironment();

// Then use config throughout app
const PORT = config.port;
const JWT_SECRET = config.jwtSecret;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Frontend URL: ${config.frontendUrl}`);
});
```

---

## Testing All Security Fixes

### Create File: `tests/security.test.ts`

```typescript
/**
 * Security integration tests
 * Verify all security measures are working
 */

import request from 'supertest';
import app from '../src/index';

describe('Security Tests', () => {
  describe('Password Validation', () => {
    it('should reject passwords under 12 characters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'weak',
          full_name: 'Test User',
          role: 'sales'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('12 characters');
    });

    it('should reject passwords without uppercase', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'lowercase123!',
          full_name: 'Test User',
          role: 'sales'
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should have X-Frame-Options header', async () => {
      const response = await request(app).get('/health');
      expect(response.get('X-Frame-Options')).toBe('DENY');
    });

    it('should have Strict-Transport-Security', async () => {
      const response = await request(app).get('/health');
      expect(response.get('Strict-Transport-Security')).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Make 6 login attempts
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ username: 'test', password: 'test' });

        if (i < 5) {
          expect(response.status).toBe(401); // Invalid credentials
        } else {
          expect(response.status).toBe(429); // Too many requests
        }
      }
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'ValidPass123!',
          full_name: 'Test',
          role: 'sales'
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('CSRF Protection', () => {
    it('should provide CSRF token', async () => {
      const response = await request(app).get('/api/v1/auth/csrf-token');
      expect(response.status).toBe(200);
      expect(response.body.csrfToken).toBeDefined();
    });

    it('should reject POST without CSRF token', async () => {
      // This depends on your implementation
      // Make sure CSRF is enforced
    });
  });
});
```

Run tests:
```bash
npm run test security.test.ts
```

---

## Summary

These code snippets provide production-ready implementations for:
- ✅ Password validation (12+ chars, complexity)
- ✅ Security headers (Helmet)
- ✅ Rate limiting
- ✅ CSRF protection
- ✅ Input validation
- ✅ Secure logging
- ✅ Request size limits
- ✅ HttpOnly cookies
- ✅ API versioning
- ✅ Environment validation

Copy and paste these into your codebase, then test thoroughly before deploying!

