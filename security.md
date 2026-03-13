# Security Audit Report — AKV (Abifresh & Kiddies Ventures)

**Date:** 2026-07-14  
**Scope:** Full-stack audit — `backend/` (Node.js/TypeScript/Express) and `frontend/` (Next.js)  
**Auditor:** GitHub Copilot (automated static analysis)

---

## Executive Summary

The codebase contains **multiple critical security vulnerabilities** that must be remediated before this application handles live production traffic. The most severe issues are:

1. Production credentials stored in local `.env` files that could be accidentally committed.
2. Seven completely unauthenticated debug/test API endpoints that expose the entire database.
3. A broken authentication endpoint (`GET /api/auth/me`) that performs no token verification, allowing any caller to retrieve any user's profile by guessing a UUID.

The application's security middleware stack (Helmet, rate-limiting, CSRF, express-validator) is well-structured and should be retained; the problems are confined to specific endpoints and configuration oversights.

---

## Severity Legend

| Icon | Level | Meaning |
|------|-------|---------|
| 🔴 | **Critical** | Actively exploitable; immediate data breach risk |
| 🟠 | **High** | Serious risk; exploitable with minor effort |
| 🟡 | **Medium** | Exploitable under specific conditions or causes information disclosure |
| 🟢 | **Low** | Defence-in-depth issue; low direct impact |

---

## 🔴 Critical Findings

---

### CRIT-1 — Live Production Credentials in `.env` Files

**Files:** `backend/.env`, `frontend/.env.local`

**Details:**

`backend/.env` contains the following live production secrets in plaintext:

```
SUPABASE_URL=https://cifzlkspxjghpgxhrwkg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  [full key present]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...                        [full key present]
JWT_SECRET=abifresh-kiddies-ventures-super-secret-key-2026-production-ready
```

`frontend/.env.local` contains:

```
VERCEL_OIDC_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."  [full token present]
```

The `SUPABASE_SERVICE_ROLE_KEY` is the most dangerous credential in the entire application — it bypasses all Supabase Row Level Security (RLS) policies and grants full read/write/delete access to every table as database superuser. Any person or system that obtains this key can exfiltrate, corrupt, or destroy all business data.

**Risk:** If either file is accidentally committed to a public or private repository (or shared), all data is immediately compromised.

**Remediation:**
1. **Rotate all exposed keys immediately** via the Supabase dashboard and Vercel dashboard:
   - Generate a new Supabase service role key.
   - Generate a new Supabase anon key.
   - Rotate the Vercel OIDC token.
   - Change `JWT_SECRET` to a cryptographically random 64-character string (use `openssl rand -hex 32`).
2. Store secrets in your hosting provider's secret manager (Railway environment variables for backend, Vercel environment variables for frontend) — never in files on disk.
3. Add a pre-commit hook (e.g. `git-secrets` or `detect-secrets`) to prevent accidental commits of secrets.
4. Verify `.gitignore` covers `.env`, `.env.local`, and all variants — it currently does, which is good.

---

### CRIT-2 — Unauthenticated Database Inspection Endpoint - ✅ **FIXED**

**File:** `backend/src/routes/test.routes.ts`  
**Route:** `GET /api/test/test/db-inspect`

**Details:**

```typescript
router.get('/test/db-inspect', async (req, res) => {
  // NO authMiddleware — accessible by anyone with network access
  // Returns raw data from: users, sales, staff_expenses,
  //                        inventory_main_store, inventory_active_store, items
});
```

This single endpoint exposes the entire business dataset — every sale, every user, all inventory, all expenses — without requiring any authentication whatsoever.

**Remediation:** **Delete this file and its route registration entirely.** This endpoint has no place in production. It is a development utility that was never intended to ship.

---

### CRIT-3 — Unauthenticated Debug Endpoints in Receipts Routes ✅ **FIXED**

**File:** `backend/src/routes/receipts.routes.ts`  
**Routes:** 
- ✅ `GET /api/receipts/test-users` — **DELETED**
- ✅ `GET /api/receipts/test-db` — **DELETED**
- ✅ `GET /api/receipts/test-items` — **DELETED**
- ✅ `GET /api/receipts/test-inventory-joins` — **DELETED**

**Details:**

All four debug endpoints have been removed from the routes file.

**Resolution:** All four handlers have been deleted. These debug utilities are no longer accessible.

---

### CRIT-4 — Unauthenticated User Enumeration Endpoint ✅ **FIXED**

**File:** `backend/src/routes/staff.routes.ts`  
**Route:** ~~`GET /api/staff/debug/users`~~ **DELETED**

**Details:**

The unprotected `/debug/users` handler has been deleted. This endpoint previously exposed all users' IDs, emails, full names, and roles without requiring authentication.

**Resolution:** The entire handler has been removed from staff.routes.ts. This endpoint is no longer accessible.

---

### CRIT-5 — Authentication Bypass: `GET /api/auth/me` ✅ **FIXED**

**File:** `backend/src/routes/auth.routes.ts`  
**Route:** `GET /api/auth/me`

**Details:**

The endpoint previously checked only for the presence of an `Authorization` header without validating the JWT token. Any caller could return any user's full profile by supplying a user ID via query parameters.

**Resolution:** The endpoint now:
1. Requires a valid `Bearer <token>` format in the Authorization header
2. Validates the JWT token signature using `jwt.verify()` against `JWT_SECRET`
3. Extracts the user ID from the decoded token (`decoded.sub`)
4. Returns authentication errors for missing, malformed, or invalid tokens
5. Logs failed token validation attempts for security monitoring

The attacker-controlled `user_id` parameter path has been completely removed. User identity is now cryptographically verified.

---

## 🟠 High Severity Findings

---

### HIGH-1 — Hardcoded Fallback JWT Secrets ✅ **FIXED**

**File:** `backend/src/middleware/auth.ts`

**Details:**

Hardcoded fallback secrets have been removed. The application now requires `JWT_SECRET` to be set in environment variables.

**Resolution:** 
1. ✅ Removed both hardcoded fallback strings (`'your-secret-key'` and `'default-secret-key-change-in-production'`)
2. ✅ Added startup validation: application crashes immediately with clear error message if `JWT_SECRET` is missing
3. ✅ Consolidated all JWT operations to use the same `JWT_SECRET` constant:
   - `authMiddleware` uses `JWT_SECRET` for token verification
   - `generateToken()` uses same `JWT_SECRET` for token signing
   - `verifyToken()` uses same `JWT_SECRET` for verification
4. ✅ Prevents token generation/verification mismatch
5. ✅ All JWT operations now use a single, required, environment-variable-backed secret

**Status:** ✅ FIXED

---

### HIGH-2 — Demo User Auth Bypass Path ✅ **FIXED**

**File:** `backend/src/middleware/auth.ts`

**Details:**

The authentication middleware previously contained a fallback for demo users that bypassed database verification. Tokens with non-UUID `sub` fields or missing database entries could be used to create synthetic authenticated sessions without database validation.

**Resolution:**
1. ✅ Removed import of `DEMO_USERS` from `localhost-auth.service`
2. ✅ Deleted the entire demo user fallback block that accepted non-database users
3. ✅ All authentication now requires:
   - Valid JWT token signed with `JWT_SECRET`
   - User exists in Supabase database
   - User account is active (`is_active = true`)
4. ✅ Failed database lookups now immediately return 401 with security logging

**For development/testing:** Create actual test users in the Supabase database with UUID IDs and valid emails. Do not rely on synthetic demo users.

**Status:** ✅ FIXED

---

## 🟡 Medium Severity Findings

---

### MED-1 — JWT Token Passed as URL Query Parameter (SSE Endpoint)

**File:** `backend/src/routes/admin.routes.ts`  
**Route:** `GET /api/admin/logs/stream?type=...&token=<JWT>`

**Details:**

The SSE endpoint correctly verifies the JWT token inline using `jwt.verify()`. However, the token is passed as a URL query parameter (`?token=...`) because browsers cannot set custom headers on `EventSource` connections. This means:

- The JWT appears in server access logs.
- The JWT appears in browser history.
- The JWT leaks to any HTTP proxy or CDN in the request URL.
- The JWT will be visible to analytics tools that log URLs.

**Remediation options:**
1. Pass an opaque short-lived one-time token (exchange the real JWT for a 30-second use token via a separate `/api/admin/logs/stream-token` endpoint).
2. Use a cookie instead of a header (set `httpOnly`, `secure`, `sameSite: strict`).

---

### MED-2 — Health Endpoint Information Disclosure ✅ **FIXED**

**File:** `backend/src/index.ts`  
**Route:** `GET /health`

**Details:**

The health endpoint previously exposed the Supabase project reference ID (`cifzlkspxjghpgxhrwkg`) to any unauthenticated caller.

**Resolution:**
1. ✅ Removed `url: process.env.SUPABASE_URL?.replace(...)` from response
2. ✅ Endpoint now returns only: `status`, `timestamp`, `service`, `database.supabase`, and `environment`
3. ✅ No sensitive hosting information leaked

**Status:** ✅ FIXED

---

### MED-3 — CORS Configured with localhost in Production

**File:** `backend/.env`

**Details:**

```
FRONTEND_URL=http://localhost:3000
```

The backend's `CORS_ORIGIN` is derived from this value. In production on Railway, the CORS origin is set to `localhost`, which means:
- The production frontend URL is not in the allowed origins.
- If browsers happen to accept this (some do under certain conditions), cross-origin requests from any origin may behave unexpectedly.
- The CORS configuration is non-functional for production traffic.

**Remediation:** Set `FRONTEND_URL=https://your-vercel-domain.vercel.app` (or your custom domain) in the Railway environment variables for the deployed backend.

---

### MED-4 — Unauthenticated Storage Bucket Directory Listing ✅ **FIXED**

**File:** `backend/src/routes/inventory.routes.ts`  
**Route:** `GET /api/inventory/debug/list-images` → **now protected**

**Details:**

The debug endpoint previously listed all filenames in the `product-images` Supabase storage bucket without authentication.

**Resolution:**
1. ✅ Added `authMiddleware` and `roleMiddleware('admin')` to `/debug/list-images`
2. ✅ Endpoint now requires admin-level authentication
3. ✅ Directory enumeration attack surface eliminated

**Status:** ✅ FIXED

---

### MED-5 — Production Hostname Committed to Source Control ✅ **FIXED**

**File:** `frontend/next.config.js`

**Details:**

The production Railway hostname was previously hardcoded in the images domains configuration.

**Resolution:**
1. ✅ Changed hardcoded `'abifresh-production.up.railway.app'` to use environment variable
2. ✅ Now reads from `process.env.NEXT_PUBLIC_API_DOMAIN` with fallback
3. ✅ Allows deployment-specific configuration without code changes
4. ✅ Prevents information disclosure of production infrastructure

**Configuration:** Set `NEXT_PUBLIC_API_DOMAIN=your-backend-domain.com` in Vercel environment variables

**Status:** ✅ FIXED

---

### MED-6 — PostgREST Filter Injection via String Interpolation ✅ **FIXED**

**File:** `backend/src/services/staff-store.service.ts`

**Details:**

The service previously interpolated user-supplied values directly into PostgREST `.or()` filter strings without validation.

**Resolution:**
1. ✅ Added `validateIdentifier()` function that enforces UUID or alphanumeric format
2. ✅ Rejects identifiers containing filter syntax characters
3. ✅ All `salesPersonId` and `staffId` parameters now validated before use
4. ✅ Prevents injection of PostgREST operators into filters

**Validation Pattern:** `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[a-zA-Z0-9_-]{1,50}$`

**Status:** ✅ FIXED

---

### MED-7 — Inconsistent Superadmin Role Enforcement ✅ **FIXED**

**File:** `backend/src/routes/admin.routes.ts`  
**Route:** `GET /api/admin/logs`

**Details:**

The logs endpoint previously used a confusing double-check pattern: `roleMiddleware('admin')` in the middleware chain, but then manually checked for `'superadmin'` in the handler body.

**Resolution:**
1. ✅ Changed middleware from `roleMiddleware('admin')` to `roleMiddleware('superadmin')`
2. ✅ Removed the manual `if (req.user?.role !== 'superadmin')` check from handler
3. ✅ Role enforcement is now clear and explicit at the middleware level
4. ✅ Prevents maintainer confusion and potential accidental permission escalation

**Status:** ✅ FIXED

---

## 🟢 Low Severity Findings

---

### LOW-1 — Extensive Logging of Sensitive Data to stdout

**Files:** `backend/src/services/admin.service.ts`, `backend/src/routes/*.ts` (50+ instances)

**Details:**

Numerous `console.log` calls output sensitive business data to  stdout in production:

```typescript
console.log(`   [${idx}] ID: ${u.id} | Email: ${u.email} | Role: "${u.role}"`);
console.log('Payments data:', JSON.stringify(payments, null, 2));
```

On Railway, stdout is captured in the application logs, which may be accessible to anyone with Railway project access. This constitutes unintentional sensitive data logging.

**Remediation:**
1. Replace all `console.log/warn/error` calls with a structured logger (e.g. `pino` or `winston`) that supports log levels.
2. Set `LOG_LEVEL=warn` in production to suppress verbose debug output.
3. Never log PII (emails, names, IDs) at `info` or `debug` level in production.

---

### LOW-2 — Unauthenticated Image Proxy Endpoint ✅ **FIXED**

**File:** `backend/src/routes/inventory.routes.ts`  
**Route:** ~~`GET /api/inventory/images/:filename`~~ **DELETED**

**Details:**

The image proxy endpoint previously allowed unauthenticated access and proxied files from Supabase storage bucket.

**Resolution:**
1. ✅ Deleted the entire `/images/:filename` proxy endpoint
2. ✅ Product images are now served directly via Supabase CDN public URLs
3. ✅ Updated all frontend `getImageUrl()` functions in:
   - `frontend/app/admin/items/page.tsx`
   - `frontend/app/admin/post-items/page.tsx`
   - `frontend/app/sales/post-items/page.tsx`
   - `frontend/app/sales/make-sale/page.tsx`
   - `frontend/app/staff/make-sale/page.tsx`
   - `frontend/app/admin/inventory/comprehensive.tsx`
4. ✅ Frontend now displays images directly from Supabase CDN (no longer tries to proxy through deleted endpoint)
5. ✅ Eliminates unnecessary reverse proxy and removes enumeration vector; reduces backend load; improves performance (CDN direct)

**Migration:** 
- Clients now use Supabase CDN URLs directly for image display
- Upload endpoint `/api/inventory/upload-image` still works and returns Supabase public URLs
- Image URLs are stored in database as full Supabase CDN URLs

**Status:** ✅ **FIXED & VERIFIED** (frontend updated to use CDN directly)

---

## 🎯 Remediation Progress Summary

**Total Vulnerabilities:** 16  
**Fixed:** 11 (69%)  
**Remaining:** 5 (31%)

### By Severity

| Level | Total | Fixed | % Complete |
|-------|-------|-------|-----------|
| 🔴 **CRITICAL** | 5 | 4 | 80% |
| 🟠 **HIGH** | 2 | 2 | **100%** ✅ |
| 🟡 **MEDIUM** | 7 | 5 | 71% |
| 🟢 **LOW** | 2 | 1 | 50% |

### ✅ Vulnerabilities Fixed (11)

- **CRIT-2**: Unauthenticated DB inspection endpoint — test routes disabled
- **CRIT-3**: Receipts debug endpoints — all 4 deleted  
- **CRIT-4**: User enumeration endpoint — deleted
- **CRIT-5**: Auth bypass on `/api/auth/me` — proper JWT validation
- **HIGH-1**: Hardcoded JWT fallback secrets — removed, now required at startup
- **HIGH-2**: Demo user auth bypass — deleted, all auth requires database validation
- **MED-2**: Health endpoint info disclosure — Supabase URL removed
- **MED-4**: Unauth image listing — now protected with admin-only access
- **MED-5**: Production hostname in code — moved to `NEXT_PUBLIC_API_DOMAIN` env var
- **MED-6**: PostgREST filter injection — validation function added for all identifiers
- **MED-7**: Inconsistent role enforcement — now explicit at middleware level
- **LOW-2**: Unauthenticated image proxy — endpoint deleted, using CDN directly

### ❌ Vulnerabilities Remaining (5)

| ID | Severity | Issue | Type | Effort |
|----|-----------| ------|------|--------|
| CRIT-1 | 🔴 Critical | Exposed credentials in `.env` | Infrastructure | Manual |
| MED-1 | 🟡 Medium | JWT token in URL (SSE) | Architecture | Medium |
| MED-3 | 🟡 Medium | CORS localhost config | Deployment | Low |
| LOW-1 | 🟢 Low | Sensitive data logging (50+ console.log) | Code Cleanup | High Effort |

---

| ID | Severity | Category | File / Route | Status |
|----|----------|----------|--------------|--------|
| CRIT-1 | 🔴 Critical | Exposed Keys | `backend/.env`, `frontend/.env.local` | ❌ Unresolved |
| CRIT-2 | 🔴 Critical | Unauth Route | `GET /api/test/test/db-inspect` | ✅ **FIXED** |
| CRIT-3 | 🔴 Critical | Unauth Route | `GET /api/receipts/test-{users,db,items,inventory-joins}` | ✅ **FIXED** |
| CRIT-4 | 🔴 Critical | Unauth Route | `GET /api/staff/debug/users` | ✅ **FIXED** |
| CRIT-5 | 🔴 Critical | Missing Auth | `GET /api/auth/me` | ✅ **FIXED** |
| HIGH-1 | 🟠 High | Weak Crypto | `backend/src/middleware/auth.ts` JWT fallback | ✅ **FIXED** |
| HIGH-2 | 🟠 High | Auth Bypass | `backend/src/middleware/auth.ts` demo user | ✅ **FIXED** |
| MED-1 | 🟡 Medium | Info Leak | `GET /api/admin/logs/stream` token in URL | ❌ Unresolved |
| MED-2 | 🟡 Medium | Info Leak | `GET /health` Supabase URL exposure | ✅ **FIXED** |
| MED-3 | 🟡 Medium | Misconfiguration | `FRONTEND_URL=localhost` in production | ❌ Unresolved |
| MED-4 | 🟡 Medium | Unauth Route | `GET /api/inventory/debug/list-images` | ✅ **FIXED** |
| MED-5 | 🟡 Medium | Info Leak | `frontend/next.config.js` production hostname | ✅ **FIXED** |
| MED-6 | 🟡 Medium | Injection | `staff-store.service.ts` `.or()` interpolation | ✅ **FIXED** |
| MED-7 | 🟡 Medium | Auth Logic | `GET /api/admin/logs` inconsistent role check | ✅ **FIXED** |
| LOW-1 | 🟢 Low | Logging | Sensitive PII in stdout logs | ❌ Unresolved |
| LOW-2 | 🟢 Low | Unauth Route | `GET /api/inventory/images/:filename` | ✅ **FIXED** |

---

## Prioritised Remediation Roadmap

### Immediately (Today)
1. **Rotate all credentials** (CRIT-1): Supabase service role key, anon key, JWT secret, Vercel OIDC token. These may already be compromised if the files were ever shared, pushed to a repo, or viewed by a third party. *(Only infrastructure-level action remaining; no code changes required)*
2. ~~**Delete all debug/test route files and handlers** (CRIT-2, CRIT-3, CRIT-4)~~ **✅ CRIT-2, CRIT-3 & CRIT-4 FIXED**: All debug endpoints removed (test routes disabled, receipts debug endpoints deleted, staff user enumeration deleted).
3. ~~**Fix `GET /api/auth/me`** (CRIT-5)~~ **✅ CRIT-5 FIXED**: Proper JWT validation implemented; user ID extracted from token payload only.

### This Week
4. ~~**Fix JWT secret handling** (HIGH-1)~~ **✅ FIXED**: Hardcoded fallbacks removed; `JWT_SECRET` now required at startup.
5. ~~**Remove demo user bypass** (HIGH-2)~~ **✅ FIXED**: Deleted DEMO_USERS fallback; all auth now requires database user.
6. **Fix CORS** (MED-3): Set `FRONTEND_URL` to the actual production frontend URL in Railway environment variables.

### This Month
7. ~~MED-2~~ **✅ FIXED**: Health endpoint info leak removed
8. ~~MED-4~~ **✅ FIXED**: Debug image listing endpoint protected
9. ~~MED-5~~ **✅ FIXED**: Production hostname moved to environment variable
10. ~~MED-6~~ **✅ FIXED**: PostgREST filter injection validation added
11. ~~LOW-2~~ **✅ FIXED**: Image proxy endpoint deleted
12. ~~MED-7~~ **✅ FIXED**: Superadmin role enforcement made explicit
13. Address MED-1, MED-3, and LOW-1 as capacity allows.

---

## What Is Working Well

The following security controls are correctly implemented and should be retained:

- **Helmet (`securityHeaders`)** — sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP, and other protective headers.
- **express-rate-limit** — login and general API rate limiters are defined and applied.
- **Origin-based CSRF protection** — correctly validates `Origin`/`Referer` headers for state-changing requests.
- **express-validator input validation** — validation schemas are defined and applied on routes that use them.
- **Role-based access control** — the `roleMiddleware` pattern is sound and consistently applied across all admin, reports, commission, and backup routes.
- **Next.js security headers** — `next.config.js` applies `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` at the framework level.
- **`.gitignore`** — `.env` files are correctly listed (though this does not protect files already on disk).
