# Security & Code Audit — ABIFRESH & KIDDIES VENTURES
**Date:** 2025  
**Auditor:** GitHub Copilot (Automated Code Review)  
**Scope:** Full codebase review before client delivery — Next.js 13 App Router frontend, Supabase backend, all API routes  
**Commit base:** Post-`fefc2b8` (latest main branch)

---

## Executive Summary

The application has a solid functional foundation and correctly implements authentication on the vast majority of routes. However, **five critical and ten high-severity issues were found** that must be addressed before production delivery. The most urgent issues are:

1. The `/api/auth/register` endpoint requires zero authentication — any internet user can create an admin account.
2. The JWT role is trusted entirely from the token payload and never re-verified from the database.
3. Override credentials are stored as plaintext passwords in an environment variable compared with simple string equality.
4. The JWT secret is a human-readable, guessable phrase.
5. Sales staff can view all user records including emails, roles, and phone numbers of all staff.

> **Action required before delivery:** All Critical and High issues must be fixed. Medium issues should be addressed where feasible. Low/Informational items are recommendations.

---

## Severity Legend

| Level | Color | Meaning |
|-------|-------|---------|
| CRITICAL | 🔴 | Exploitable with no authentication, or enables full system compromise |
| HIGH | 🟠 | Significant security or data integrity risk; requires authenticated access or specific conditions |
| MEDIUM | 🟡 | Degraded security posture; limited impact in isolation but compounds with other issues |
| LOW | 🔵 | Best-practice gaps, code quality, low-impact information disclosure |

---

## Critical Findings

### 🔴 C1 — Open Registration Endpoint (No Authentication)

**File:** `frontend/app/api/auth/register/route.ts`  
**CVSS Score Estimate:** 9.8 (Critical)

**Description:** The `/api/auth/register` POST endpoint has no authentication guard. Any person on the internet can send a crafted POST request and create an account with any role, including `admin` or `superadmin`.

**Proof of Concept:**
```bash
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Attacker","email":"attacker@evil.com","password":"password123","role":"superadmin"}'
```

**Impact:** Complete system compromise. Attacker gains admin dashboard access, can view all financial data, approve payments, export DB backups, and access all staff PII.

**Fix:** Add `verifyAuth` + `hasRole(role, 'admin')` guard, or — preferably — **disable this endpoint entirely** since all account creation is done via the admin staff creation endpoint (`/api/admin/staff/create`).

```typescript
// Add to start of POST handler:
const authResult = await verifyAuth(req);
if (authResult instanceof NextResponse) return authResult;
if (!hasRole(authResult.role, 'admin')) {
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
}
```

---

### 🔴 C2 — Plaintext Override Credentials in Environment Variable

**File:** `.env.local` + `frontend/app/api/auth/login/route.ts`  
**CVSS Score Estimate:** 8.8 (High → Critical in combination)

**Description:** The environment variable `OVERRIDE_CREDS=lucky:#ebuka5788,luckygold:#ebuka5788` stores plaintext passwords that are compared using simple string equality. These accounts bypass the normal DB authentication flow entirely.

Code snippet from `login/route.ts`:
```typescript
const parts = cred.split(':');
const u = parts[0];
const p = parts.slice(1).join(':');
if (u === username && p === password) { ... }
```

**Impact:** Anyone who can read the environment variable (e.g., if Vercel secrets are accidentally exposed, or if the override mechanism is tested via brute force on short password patterns) gains access. No audit trail is created for these logins.

**Fix:** 
- At minimum, store bcrypt hashes of the override passwords (not plaintext).
- Better: remove override credentials entirely and use only DB-backed accounts.
- Add audit logging for any override credential authentication.

---

### 🔴 C3 — Role Trusted from JWT Token, Never Re-Verified from Database

**File:** `frontend/lib/server/auth.ts` (line ~88)  
**CVSS Score Estimate:** 8.1

**Description:** The `verifyAuth` function queries the database to check `id` and `is_active`, but NOT the `role`. The role is taken directly from the JWT token's `decoded.role` field:

```typescript
return {
  id: dbUser.id,
  email: dbUser.email,
  role: decoded.role,       // ← role comes from token, not DB
  full_name: dbUser.full_name ?? undefined,
};
```

**Impact (2 scenarios):**
1. **Role change not immediate:** If an admin demotes a staff member via the admin panel, the staff member's existing JWT token still grants the old role until it expires (up to 30 days).
2. **Token forgery:** If the JWT secret is compromised (see C4), an attacker crafts a token with `role: "superadmin"` and gains full access. The DB check only validates that the user ID exists and is active — it would pass for any legitimate user account.

**Fix:** Add `role` to the DB query in `verifyAuth`:

```typescript
const result = await supabaseAdmin
  .from('users')
  .select('id, email, is_active, full_name, role')  // add role
  .eq('id', decoded.sub)
  .single();
// Then use dbUser.role instead of decoded.role
return { ..., role: dbUser.role };
```

---

### 🔴 C4 — Weak, Guessable JWT Secret

**File:** `.env.local`

**Description:** The JWT secret is `abifresh-kiddies-ventures-super-secret-key-2026-production-ready`. This follows a predictable human-readable pattern. In dictionary/wordlist offline attacks against captured tokens, this could be cracked.

**Impact:** If the JWT secret is brute-forced or guessed, combined with C3 (role not re-verified), an attacker can forge admin/superadmin tokens for any existing user ID.

**Fix:** Replace with a cryptographically random 256-bit secret:
```bash
# Generate secure secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Update `JWT_SECRET` in Vercel environment variables.

---

### 🔴 C5 — Sales Staff Can View All User Records (Including Sensitive Fields)

**File:** `frontend/app/api/admin/staff/route.ts`  
**CVSS Score Estimate:** 7.5

**Description:** The GET handler allows users with `sales` or `sales_staff` role to retrieve all users with `select('*')`, which includes emails, phone numbers, role assignments, account status, and commission rates of every staff member.

```typescript
if (!hasRole(authResult.role, 'admin', 'sales', 'sales_staff')) { ... }
// ...
const { data: users } = await supabaseAdmin.from('users').select('*');
```

**Impact:** Any field representative can enumerate all employees, their personal contact information, roles, and commission structures.

**Fix Option A:** Restrict the route to `admin` only.  
**Fix Option B:** If sales staff genuinely need a staff list, create a separate endpoint returning only `id` and `full_name` for the purpose of looking up receivers for return requests.

---

## High Severity Findings

### 🟠 H1 — No Rate Limiting on Any Endpoint

**Files:** All API routes

**Description:** There is no rate limiting on `/api/auth/login`, `/api/auth/register`, or any other endpoint. An automated attack can:
- Brute-force passwords (no lockout after N failed attempts)
- Enumerate valid usernames/emails via response differences
- Spam the payment request or expense creation endpoints

**Fix:** Add rate limiting middleware. For Next.js, use `upstash/ratelimit` with Vercel KV, or at minimum use an IP-based in-memory cache:

```typescript
// Using @upstash/ratelimit (recommended for Vercel)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '10 s') });
```

Apply a stricter limit (5 requests/minute) on `/api/auth/login`.

---

### 🟠 H2 — JWT Token Stored in localStorage (XSS Vulnerable)

**File:** `frontend/store/auth.ts`

**Description:** The Zustand auth store persists the JWT token to `localStorage` via the `persist` middleware. `localStorage` is accessible to any JavaScript running on the page. If any XSS vulnerability exists (especially with user-supplied content that is rendered), the token can be stolen.

**Fix:** Move token storage to an `HttpOnly` cookie, which is inaccessible to JavaScript:
```typescript
// In login route, set cookie instead of returning token in body:
response.cookies.set('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 30, // 30 days
});
```

---

### 🟠 H3 — 30-Day JWT with No Revocation Mechanism

**File:** `.env.local` (`JWT_EXPIRY=30d`)

**Description:** JWTs are valid for 30 days with no refresh/revocation mechanism. Once a token is issued, it cannot be invalidated even if:
- A staff member is terminated and deactivated
- A device is lost or stolen
- An admin suspects compromise

The `is_active` DB check mitigates the deactivation case (the account must be deactivated in the DB), but a stolen token from an active account has no remedy for 30 days.

**Fix:** Implement short-lived access tokens (1 hour) paired with refresh tokens stored in `HttpOnly` cookies. Add a token blacklist (Redis set) for explicit logout/revocation.

---

### 🟠 H4 — Unauthenticated `/api/health` Endpoint Leaks Environment Info

**File:** `frontend/app/api/health/route.ts`

**Description:** The health endpoint is accessible without authentication and returns:
- `environment: "production"` or `"development"`
- Database connection status

**Impact:** Informs attackers whether the system is in production mode (disabling development tools) and confirms DB connectivity. Low-impact standalone, but aids reconnaissance.

**Fix:** Either require admin authentication, or limit response to a simple `{ "status": "ok" }` without any environment or infrastructure information.

---

### 🟠 H5 — Payment Approval Has No Idempotency or Status Pre-Check

**File:** `frontend/app/api/admin/payments/[id]/approve/route.ts`

**Description:** The approve endpoint executes `.update({ status: 'approved' })` with no check that the payment is currently in `pending` status. This means:
- An already-approved payment can be re-approved (sending a duplicate notification)
- A rejected payment can be overridden to `approved` without proper review

The reject endpoint has the same issue.

**Fix:** Add a `.eq('status', 'pending')` filter to the update, and check `rowsAffected` to confirm the update was valid:

```typescript
const { error, count } = await supabaseAdmin
  .from('staff_payments')
  .update({ status: 'approved', approved_date: new Date().toISOString() })
  .eq('id', paymentId)
  .eq('status', 'pending');  // ← add this

if (count === 0) {
  return NextResponse.json({ error: 'Payment is not in pending status' }, { status: 409 });
}
```

---

### 🟠 H6 — Commission Payment Has No Balance Ceiling Validation

**File:** `frontend/app/api/admin/commissions/pay/route.ts`

**Description:** The endpoint inserts a commission payment record for any `amount` to any `staff_id` without verifying:
1. The `amount` does not exceed the staff member's total pending/unpaid commission
2. The `staff_id` exists and has commission owed

This allows an admin to record a payment of any arbitrary amount (e.g., ₦1,000,000,000) to any user, creating false accounting records.

**Fix:** Before inserting, query the staff member's total pending commission from the commissions table and validate `amount <= unpaid_commission`.

---

### 🟠 H7 — Backup/Restore Accessible to All Admin Roles (Not Superadmin-Only)

**Files:** `frontend/app/api/backup/table/[name]/route.ts`, `frontend/app/api/backup/restore/commit/route.ts`

**Description:** Full database table exports and full restore operations are gated on `hasRole(role, 'admin')`, which includes regular admin accounts. The backup dumps entire tables including all user records (with password hashes if stored there), full financial history, and commission data.

**Fix:** Escalate backup/restore to `superadmin` only:
```typescript
if (!hasRole(authResult.role, 'superadmin')) { ... }
```

---

### 🟠 H8 — Unauthenticated Download Tracking Endpoint (IP Spoofing + User Agent Injection)

**File:** `frontend/app/api/download/track/route.ts`

**Description:** This endpoint requires NO authentication and:
1. Stores IP address from the `x-forwarded-for` header — which can be trivially spoofed, polluting analytics data
2. Stores raw `userAgent` string from the request body (not from the actual HTTP header) — an attacker can inject arbitrary strings up to DB column limits
3. Has no request body validation whatsoever
4. Could be used to spoof download analytics

**Fix:**
```typescript
// Use only the real IP from the actual request connection, not the header
const ipAddress = req.headers.get('x-real-ip') ?? 'unknown';
// Ignore client-supplied userAgent — use the actual header
const userAgent = req.headers.get('user-agent') ?? 'unknown';
// Add a length limit:
.insert([{ ..., user_agent: userAgent.slice(0, 512) }])
```

---

### 🟠 H9 — `create-sale` and `sales/record` Accept Client-Supplied `total_amount` / Use `Math.max(0,...)`

**Files:** `frontend/app/api/sales/create-sale/route.ts`, `frontend/app/api/sales/record/route.ts`

**Description (create-sale):** The sales creation endpoint accepts `total_amount` directly from the client request body without server-side recalculation. A malicious staff member can set `total_amount: 1` for ₦50,000 worth of goods, creating fraudulent low-value sale records.

**Description (sales/record):** When deducting from inventory, the code uses:
```typescript
const newQty = Math.max(0, (item.active_store_quantity || 0) - quantity);
```
This silently prevents inventory from going negative but allows a sale to succeed with inadequate stock — inventory will be set to 0 rather than the request being refused. A pre-check before the sale should reject it.

**Fix for total_amount:** Server must calculate total from items × unit prices stored in the items table:
```typescript
const calculatedTotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
// Use calculatedTotal, never body.total_amount
```

**Fix for stock check:** Reject the sale if quantity requested exceeds available stock before processing:
```typescript
if ((item.active_store_quantity || 0) < quantity) {
  return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
}
```

---

### 🟠 H10 — Missing `Content-Security-Policy` (CSP) Header

**File:** `frontend/next.config.js`

**Description:** The `next.config.js` sets `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`, but no `Content-Security-Policy` header. Without CSP, successful XSS attacks have no mitigation layer — injected scripts can run freely.

**Fix:** Add a restrictive CSP policy. A minimal starting point:
```javascript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://cifzlkspxjghpgxhrwkg.supabase.co;",
}
```

---

## Medium Severity Findings

### 🟡 M1 — No CSRF Protection

**Files:** All state-mutating API routes

**Description:** All POST/PUT/DELETE endpoints accept requests from any origin. There are no `SameSite` cookie restrictions (tokens are in `localStorage`) and no CSRF token validation. A malicious website could trick an authenticated user's browser into making cross-site requests.

**Note:** The impact is partially mitigated because the token is in `localStorage` (CSRF attacks work via cookies, not `localStorage`). However, if tokens are moved to `HttpOnly` cookies (H2 fix), CSRF protection must be added simultaneously.

**Fix:** When implementing cookie-based auth (H2 fix), set `SameSite: 'strict'` on the auth cookie, which prevents cross-site request forgery by default.

---

### 🟡 M2 — `staff_name` in Payment Request Comes from Client, Not Auth User

**File:** `frontend/app/api/sales/payments/request/route.ts`

**Description:** The payment request body includes `staff_name` which is inserted directly into the `staff_payments` record. The authenticated user's actual name is available from `authResult.full_name` (from DB). A staff member could set their name to anything in their payment request, creating misleading records.

**Fix:** Ignore the client-supplied `staff_name` and use `authResult.full_name` instead.

---

### 🟡 M3 — No Input Length/Type Validation on Free-Text Fields

**Files:** Multiple routes including `staff/expenses`, `sales/expenses`, `notifications`, `update-profile`

**Description:** Free-text fields like `description`, `notes`, `reject_reason`, `store_location`, `full_name`, `username` are inserted directly into the DB with no length limits or content validation. While Supabase's parameterized queries prevent SQL injection, excessively long strings can waste storage and potentially cause downstream rendering issues.

**Fix:** Add length validation for all free-text inputs:
```typescript
if (description && description.length > 500) {
  return NextResponse.json({ error: 'Description too long (max 500 chars)' }, { status: 400 });
}
```

---

### 🟡 M4 — Any Sales Staff Can Post Items to Any Staff ID

**File:** `frontend/app/api/staff/post-items-to-staff/route.ts`

**Description:** The `post-items-to-staff` endpoint verifies the `active_store_quantity` exists for the item, and correctly deducts from it. However, any user with `sales` or `sales_staff` role can post items to ANY `staff_id` — there is no check that the target staff member is under the same management chain, in the same store location, or has any relationship to the poster.

**Impact:** Sales staff from one location could post items to staff at another location, creating inventory discrepancies without admin oversight.

**Fix:** Add a verification that the target `staff_id` is a valid field staff member, and optionally that they share the same `store_location` as the poster.

---

### 🟡 M5 — N+1 Database Queries in `/api/admin/staff`

**File:** `frontend/app/api/admin/staff/route.ts`

**Description:** For each user returned, two additional DB queries are made inside a loop to fetch `sales_items` and `sales` records. With 20 staff members, this generates 41+ sequential DB calls per request.

**Impact:** Slow response times at scale, unnecessary DB load, potential timeouts under moderate usage.

**Fix:** Use Supabase's join syntax to fetch related data in a single query, or use `Promise.all()` to parallelize the per-user queries.

---

### 🟡 M6 — No Pagination on Large Data Endpoints

**Files:** `frontend/app/api/admin/staff/route.ts`, notification-related routes

**Description:** Endpoints return ALL records with no page size limit. As data grows, these responses will become very large, slow, and potentially cause memory issues in the serverless runtime.

**Fix:** Add `limit` / `offset` or cursor-based pagination with a maximum page size:
```typescript
const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
const offset = parseInt(url.searchParams.get('offset') || '0');
const { data } = await supabaseAdmin.from('users').select('*').range(offset, offset + limit - 1);
```

---

### 🟡 M7 — No Audit Logging for Financial Operations

**Files:** `payments/approve`, `commissions/pay`, `sales/record`, `sales/create-sale`

**Description:** Payment approvals, commission disbursements, and sales are not written to the `activity_logs` table. The logs table is only written to in some admin operations. Without comprehensive audit logs, there is no way to reconstruct "who approved payment X at time Y" for dispute resolution or fraud investigation.

**Fix:** After each financial operation (approve payment, pay commission, create sale), insert an `activity_logs` record with `user_id`, `action`, `entity_type`, `entity_id`, and relevant metadata.

---

### 🟡 M8 — `receipt_number` and File Names Use `Date.now()` (Collision Risk)

**Files:** `frontend/app/api/sales/record/route.ts`, `frontend/app/api/inventory/upload-image/route.ts`

**Description:** Receipt numbers (`REC-${Date.now()}`) and uploaded file names (`${Date.now()}-${Math.random()...}`) use wall-clock time. Under concurrent requests in a serverless environment, two requests in the same millisecond will generate the same `Date.now()` value, causing potential collisions.

**Fix:** Use `crypto.randomUUID()` for receipt numbers:
```typescript
import { randomUUID } from 'crypto';
const receiptNumber = `REC-${randomUUID()}`;
```

---

### 🟡 M9 — Expense `amount` Has No Server-Side Maximum

**Files:** `frontend/app/api/sales/expenses/route.ts`, `frontend/app/api/staff/expenses/create/route.ts`

**Description:** Staff can submit expense records with any positive numeric amount. There is no server-side maximum check. A staff member could submit an expense of ₦999,999,999 which would appear in admin reports.

**Fix:** Add a reasonable maximum amount validation based on business rules (e.g., ₦500,000 per expense entry requiring manager approval):
```typescript
if (amount > 500000) {
  return NextResponse.json({ error: 'Expense exceeds single-entry limit; contact admin' }, { status: 400 });
}
```

---

## Low / Informational Findings

### 🔵 L1 — No `middleware.ts` — All Auth Is Per-Route

**Files:** Entire `frontend/app/api/` directory

**Description:** There is no Next.js `middleware.ts` file. All authentication and authorization is applied per-route. This is a valid pattern but increases the risk of a developer accidentally creating a new route without adding `verifyAuth`, resulting in a silently unauthenticated endpoint (as happened with C1 — `/api/auth/register`).

**Recommendation:** Add a global Next.js `middleware.ts` that at minimum logs requests to authenticated routes and optionally enforces a default "deny unless explicitly allowed" policy for `/api/admin/*` paths. This creates a defense-in-depth layer.

---

### 🔵 L2 — `.env.local` Is Git-Ignored but Contains All Production Secrets

**File:** `.env.local`, `.gitignore`

**Description:** The `.gitignore` file correctly excludes `.env*.local`. However, the file currently on disk contains all production secrets including the Supabase service role key, JWT secret, and override credentials. If this file is accidentally staged (e.g., via `git add -f`), all secrets are exposed.

**Recommendation:** 
- Rotate all production secrets after this audit (generate new JWT secret, regenerate Supabase service role key, remove override credentials)
- Consider using Vercel's environment variable management exclusively and having only a `.env.local.example` file in the repo with placeholder values

---

### 🔵 L3 — `quantity_available` Stale Column Remains in DB Schema

**Files:** DB schema, `returned-items.service.ts`

**Description:** The `staff_store` table has a `quantity_available` column that is NOT automatically updated on sales, returns, or transfers. The code now correctly ignores it in favor of `quantity - quantity_sold`, but the stale column remains misleading to any developer querying the DB directly or via Supabase Studio.

**Recommendation:** Drop the `quantity_available` column from the schema, or add a DB trigger to auto-update it.

---

### 🔵 L4 — JWT Expiry (30 Days) Is Unsuitable for a Business Finance App

**File:** `.env.local` (`JWT_EXPIRY=30d`)

**Description:** Standard security practice for apps handling financial data is short-lived access tokens (1 hour or less) with longer-lived refresh tokens. 30-day tokens create a large exploitation window for any stolen token.

**Recommendation:** Reduce `JWT_EXPIRY` to `1h` and implement refresh tokens, or at minimum `24h` as a compromise.

---

### 🔵 L5 — PWA Disabled with Known-Vulnerable Version

**File:** `frontend/next.config.js`

**Description:** `next-pwa` v5.6.0 is installed with `disable: true`. Version 5.6.0 has the `assignWith` vulnerability in Webpack (CVE disclosed in `next-pwa` issues). While disabled in production, it remains in `package.json`.

**Recommendation:** Either upgrade to `@ducanh2912/next-pwa` (maintained fork) or remove the PWA dependency entirely until needed.

---

### 🔵 L6 — API Error Messages Are Too Verbose in Some Routes

**Files:** Multiple routes

**Description:** Several routes return raw Supabase error messages directly to the client:
```typescript
return NextResponse.json({ error: error.message }, { status: 400 });
```
Supabase errors can reveal table names, column names, constraint names, and schema details.

**Recommendation:** Log the full error server-side and return generic messages to clients:
```typescript
console.error('DB error:', error);
return NextResponse.json({ error: 'Operation failed. Please try again.' }, { status: 400 });
```

---

### 🔵 L7 — `hasRole` Superadmin Bypass Is Implicit and Undocumented

**File:** `frontend/lib/server/auth.ts`

**Description:** The `hasRole` function silently passes `superadmin` for any check that includes `admin` in the allowed list. This is by design (`isSuperadmin && adminRequired`), but the superadmin does NOT automatically pass `sales`-only or `sales_staff`-only checks. This asymmetry could cause confusion when new features need to be superadmin-restricted.

**Recommendation:** Add a code comment documenting this behavior and clarifying that routes requiring `superadmin`-exclusive access should check `hasRole(role, 'superadmin')` explicitly.

---

## Positive Security Findings

The following is what the codebase gets RIGHT:

| Finding | Detail |
|---------|--------|
| ✅ HTTPS enforced | Deployed on Vercel — TLS enforced by default |
| ✅ JWT signature verification | `jwt.verify()` used correctly; expired tokens rejected |
| ✅ `is_active` check on every request | Deactivating a user in DB blocks their future requests |
| ✅ `supabaseAdmin` is server-side only | Service role key is never exposed to the browser bundle |
| ✅ Admin-only staff creation | `/api/admin/staff/create` correctly requires admin role |
| ✅ File upload type/size validation | Image upload correctly validates MIME type and 5MB limit |
| ✅ Password change verifies old password | Old password verified via Supabase Auth sign-in before updating |
| ✅ Return request has IDOR protection | `returnedItemsService.acceptReturnedItems` verifies `receiver_staff_id === authUser.id` |
| ✅ Posted items IDOR protection | `staff/posted-items/[id]/accept` queries `.eq('staff_id', authResult.id)` |
| ✅ Receiver role validation on returns | Return request verifies receiver is `sales` or `sales_staff` role |
| ✅ Parameterized queries everywhere | No string interpolation in DB queries — Supabase client uses parameterized calls, preventing SQL injection |
| ✅ X-Frame-Options header | Clickjacking protection enabled in `next.config.js` |
| ✅ X-Content-Type-Options header | MIME sniffing protection enabled |
| ✅ `NEXT_PUBLIC_` prefix discipline | Service role key and JWT secret correctly use non-public env var names |

---

## Missing Security Infrastructure

| Feature | Status | Priority |
|---------|--------|----------|
| Rate limiting | ❌ Missing | HIGH |
| Content-Security-Policy | ❌ Missing | HIGH |
| Global middleware auth layer | ❌ Missing | MEDIUM |
| Refresh token / token rotation | ❌ Missing | HIGH |
| Token revocation list | ❌ Missing | MEDIUM |
| Audit logging for financial ops | ❌ Partial | HIGH |
| CSRF protection | ⚠️ Not needed if cookies used (but HttpOnly cookies not yet implemented) | LOW |
| Request body size limits | ❌ Missing | MEDIUM |
| DB row-level security (Supabase RLS) | ❌ Disabled (service key bypasses it) | LOW |

---

## Prioritized Fix Checklist

### Must Fix Before Delivery (Critical)

- [ ] **C1**: Add auth guard to `/api/auth/register` or disable it entirely
- [ ] **C2**: Hash override credentials (bcrypt) or remove override system
- [ ] **C3**: Re-fetch `role` from DB in `verifyAuth`, not from JWT payload
- [ ] **C4**: Replace JWT secret with cryptographically random 64-byte hex string
- [ ] **C5**: Remove `sales`/`sales_staff` from the allowed roles on `/api/admin/staff` GET

### Must Fix Before Delivery (High)

- [ ] **H1**: Add rate limiting to `/api/auth/login` (minimum: 5 attempts/minute per IP)
- [ ] **H5**: Add `.eq('status', 'pending')` to payment approve and reject operations
- [ ] **H9**: Server-side recalculate `total_amount` from DB item prices (never trust client)
- [ ] **H9**: Add inventory pre-check before allowing sales to proceed
- [ ] **H10**: Add `Content-Security-Policy` header to `next.config.js`
- [ ] **H8**: Fix `download/track` to use real HTTP headers, not client-supplied values

### Strongly Recommended (Medium)

- [ ] **M2**: Use `authResult.full_name` instead of client-supplied `staff_name` in payments
- [ ] **M3**: Add length validation for all free-text DB input fields
- [ ] **M7**: Add audit logging for payment approvals, commission payments, and sales
- [ ] **M8**: Replace `Date.now()` receipt numbers with `crypto.randomUUID()`
- [ ] **M9**: Add maximum amount validation for expense submissions
- [ ] **H6**: Add commission balance check before recording a commission payment

### Recommended Before Scale-Out (Low)

- [ ] **H2/H3**: Move JWT to `HttpOnly` cookie with 1-hour expiry + refresh tokens
- [ ] **L1**: Add `middleware.ts` as a default-deny safety net for `/api/admin/*`
- [ ] **L2**: Rotate all production secrets after this audit
- [ ] **L3**: Drop or auto-compute `quantity_available` column in DB
- [ ] **L6**: Replace raw DB error messages with generic client error messages

---

## Files Audited

| File | Findings |
|------|----------|
| `lib/server/auth.ts` | C3, C4 — role from JWT, weak secret |
| `lib/server/supabase-admin.ts` | No critical issues |
| `lib/server/returned-items.service.ts` | IDOR protection confirmed ✅ |
| `.env.local` | C2, C4, L2 |
| `.gitignore` | Correctly excludes `.env.local` ✅ |
| `next.config.js` | H10, L5 |
| `app/api/auth/login/route.ts` | C2 |
| `app/api/auth/register/route.ts` | C1 |
| `app/api/auth/change-password/route.ts` | No critical issues ✅ |
| `app/api/auth/update-profile/route.ts` | M3 (no length limits) |
| `app/api/admin/staff/route.ts` | C5, M5, M6 |
| `app/api/admin/staff/create/route.ts` | No issues ✅ |
| `app/api/admin/staff/[id]/route.ts` | No critical issues ✅ |
| `app/api/admin/payments/[id]/approve/route.ts` | H5 |
| `app/api/admin/payments/[id]/reject/route.ts` | H5 |
| `app/api/admin/commissions/pay/route.ts` | H6 |
| `app/api/admin/logs/route.ts` | No issues, superadmin-only ✅ |
| `app/api/admin/restock-orders/route.ts` | No critical issues ✅ |
| `app/api/backup/table/[name]/route.ts` | H7 |
| `app/api/backup/restore/commit/route.ts` | H7 |
| `app/api/backup/restore/parse/route.ts` | H7 |
| `app/api/backup/history/route.ts` | H7 |
| `app/api/backup/meta/route.ts` | H7 |
| `app/api/health/route.ts` | H4 |
| `app/api/notifications/route.ts` | No critical issues ✅ |
| `app/api/sales/create-sale/route.ts` | H9 (client-supplied total_amount) |
| `app/api/sales/record/route.ts` | H9 (Math.max inventory floor), M8 |
| `app/api/sales/expenses/route.ts` | M3, M9 |
| `app/api/sales/payments/request/route.ts` | M2 (staff_name from client) |
| `app/api/sales/returned-items/[id]/accept/route.ts` | No issues ✅ |
| `app/api/sales/returned-items/[id]/reject/route.ts` | No issues ✅ |
| `app/api/staff/returns/route.ts` | No critical issues ✅ |
| `app/api/staff/store/route.ts` | No critical issues ✅ |
| `app/api/staff/store/make-sales/route.ts` | No critical issues ✅ |
| `app/api/staff/payments/route.ts` | No issues ✅ |
| `app/api/staff/payments/request/route.ts` | No critical issues ✅ |
| `app/api/staff/expenses/route.ts` | M3, M9 |
| `app/api/staff/post-items-to-staff/route.ts` | M4 |
| `app/api/staff/posted-items/[id]/accept/route.ts` | IDOR protection confirmed ✅ |
| `app/api/staff/posted-items/[id]/reject/route.ts` | No critical issues ✅ |
| `app/api/inventory/items/route.ts` | No critical issues ✅ |
| `app/api/inventory/upload-image/route.ts` | No critical issues ✅ |
| `app/api/inventory/transfer/main-to-active/route.ts` | No critical issues ✅ |
| `app/api/download/track/route.ts` | H8 (unauthenticated, header spoofing) |
| `store/auth.ts` | H2 (localStorage token) |
| `middleware.ts` | ❌ Does not exist (see L1) |

---

*End of Security Audit Report — ABIFRESH & KIDDIES VENTURES*
