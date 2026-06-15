# Frontend Security & Performance Audit Report

**Project:** ABIFRESH & KIDDIES VENTURES — Frontend (Next.js Serverless)  
**Audit Date:** 2026-06-01  
**Scope:** `frontend/` directory — serverless PWA deployed on Vercel  
**Stack:** Next.js 13.5, Supabase, Zustand, TailwindCSS, PWA  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Security Findings](#security-findings)
   - [CRITICAL: Unauthenticated API Routes](#critical-unauthenticated-api-routes)
   - [CRITICAL: Service Role Key Exposure Surface](#critical-service-role-key-exposure-surface)
   - [HIGH: Plaintext Override Credentials (Backdoor)](#high-plaintext-override-credentials-backdoor)
   - [HIGH: JWT in localStorage (XSS Theft)](#high-jwt-in-localstorage-xss-theft)
   - [HIGH: No CSRF Protection](#high-no-csrf-protection)
   - [MEDIUM: dangerouslySetInnerHTML / innerHTML Usage](#medium-dangerouslysetinnerhtml--innerhtml-usage)
   - [MEDIUM: In-Memory Rate Limiting Ineffective in Serverless](#medium-in-memory-rate-limiting-ineffective-in-serverless)
   - [MEDIUM: Service Worker Caches API Responses](#medium-service-worker-caches-api-responses)
   - [MEDIUM: Minimal Password Policy](#medium-minimal-password-policy)
   - [LOW: Missing Content Security Policy (CSP) Header](#low-missing-content-security-policy-csp-header)
   - [LOW: Error Messages Leak Internal Details](#low-error-messages-leak-internal-details)
   - [LOW: Debug Files Committed to Git](#low-debug-files-committed-to-git)
   - [LOW: VERCEL_OIDC_TOKEN in .env.local](#low-vercel_oidc_token-in-envlocal)
3. [Performance Findings](#performance-findings)
   - [HIGH: Excessive .next Build Size (~893MB)](#high-excessive-next-build-size-893mb)
   - [HIGH: N+1 Database Query Patterns](#high-n1-database-query-patterns)
   - [HIGH: Duplicate Toast Libraries (react-toastify + sonner)](#high-duplicate-toast-libraries-react-toastify--sonner)
   - [MEDIUM: Large Client Bundle Dependencies](#medium-large-client-bundle-dependencies)
   - [MEDIUM: Missing Database Pagination on Critical Routes](#medium-missing-database-pagination-on-critical-routes)
   - [MEDIUM: Server-Side Cache Without Invalidation Strategy](#medium-server-side-cache-without-invalidation-strategy)
   - [MEDIUM: Experimental optimizeCss Enabled](#medium-experimental-optimizecss-enabled)
   - [LOW: Unused Dependencies](#low-unused-dependencies)
   - [LOW: No Bundle Analysis Tooling](#low-no-bundle-analysis-tooling)
4. [Recommendations](#recommendations)
5. [Scoring Summary](#scoring-summary)

---

## Executive Summary

The frontend is a Next.js 13.5 PWA deployed on Vercel in serverless mode, using Supabase as its backend with a custom JWT-based auth system. The codebase follows generally good patterns: most API routes use `verifyAuth` for authentication, DB queries use parameterized Supabase queries (preventing SQL injection), and the `.env.local` file with secrets is properly gitignored.

**However, several critical and high-severity issues were identified:**

1. **3 API routes have NO authentication** — exposing download tracking data (including IP addresses) and download stats publicly.
2. **Plaintext override credentials** (`OVERRIDE_CREDS`) serve as a permanent backdoor authentication mechanism.
3. **Auth tokens stored in localStorage** are vulnerable to XSS theft — no HttpOnly cookies.
4. **N+1 query patterns** in sale creation and credit flows will impact performance as data grows.
5. **~893MB `.next` build output** and **duplicate toast libraries** indicate bundle bloat.

---

## Security Findings

---

### CRITICAL: Unauthenticated API Routes

**Severity:** Critical  
**Files:**
- `app/api/download/history/route.ts`
- `app/api/download/stats/route.ts`
- `app/api/download/track/route.ts`

**Issue:** These three API routes have **no authentication check** (`verifyAuth` is not called). They use `supabaseAdmin` (service role key) directly to query the `pwa_downloads` table.

```typescript
// app/api/download/history/route.ts (lines 1-25)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  // ⚠️ NO verifyAuth() call
  const { data, error } = await supabaseAdmin
    .from('pwa_downloads')
    .select('*')           // ← Exposes ALL columns including ip_address, user_agent
    ...
}
```

**Impact:**
- `/api/download/history` — anyone can access full download history including **IP addresses**, user agents, and timestamps with full Supabase service role access.
- `/api/download/stats` — anyone can query aggregate download statistics.
- `/api/download/track` — anyone can insert fake download records.

**Fix:** Add `verifyAuth` and `hasRole` checks (at minimum admin-level access) to these routes.

---

### CRITICAL: Service Role Key Exposure Surface

**Severity:** Critical  
**Files:**
- `lib/server/supabase-admin.ts`
- All 60+ API route files importing `supabaseAdmin`

**Issue:** The entire API layer uses `supabaseAdmin` (service role key) for database operations. This key **bypasses all Row-Level Security (RLS)** policies in Supabase. Authorization is enforced purely at the application layer via `verifyAuth` + `hasRole`.

**Impact:** If ANY API route is misconfigured (as seen above with the download routes), attackers have unfettered access to the entire Supabase database — read, write, and delete all tables.

**Mitigation:** All routes DO call `verifyAuth` except the three download routes. The architecture requires maintaining 100% audit coverage on every route. A single missing check on a future route could be catastrophic.

**Fix:** 
1. Add `verifyAuth` to the three unprotected routes immediately.
2. Consider implementing a middleware-based auth check that covers all API routes automatically.
3. Audit all current API routes to confirm auth coverage.

---

### HIGH: Plaintext Override Credentials (Backdoor)

**Severity:** High  
**Files:**
- `.env.local` (line 27-28)
- `app/api/auth/login/route.ts` (lines 58-70)

**Issue:** The `/api/auth/login` route falls back to checking `OVERRIDE_CREDS` environment variable when Supabase Auth fails:

```typescript
OVERRIDE_CREDS=lucky:#ebuka5788,luckygold:#ebuka5788
```

```typescript
function checkOverrideCredentials(username: string, password: string): boolean {
  const raw = process.env.OVERRIDE_CREDS || '';
  // ... parses and matches username:password pairs
}
```

**Impact:** These credentials serve as a permanent **backdoor** into the system. Even if a user's Supabase Auth account is deleted or disabled, these credentials still work. The `#ebuka5788` password appears to be a weak password.

**Fix:**
1. Register these users in Supabase Auth properly and remove the override system.
2. The TODO comment says to do this — prioritize completing it.
3. If a fallback is absolutely necessary, use hashed credentials, not plaintext.

---

### HIGH: JWT in localStorage (XSS Theft)

**Severity:** High  
**Files:**
- `store/auth.ts` (lines 53-54)
- `lib/api.ts` (lines 25-33)

**Issue:** The JWT authentication token is stored in `localStorage` via Zustand's `persist` middleware:

```typescript
persist(
  ...,
  {
    name: 'auth-storage',
    storage: createJSONStorage(() => localStorage),
  }
)
```

And retrieved from `localStorage` in the Axios interceptor:

```typescript
const token = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
const parsed = JSON.parse(token);
const authToken = parsed.state?.token ?? parsed.token;
config.headers.Authorization = `Bearer ${authToken}`;
```

**Impact:** localStorage is accessible via JavaScript. Any XSS vulnerability (from the `innerHTML` usage or third-party scripts) can steal the JWT and gain permanent access to the account.

**Fix:**
- Use HttpOnly, Secure, SameSite=Strict cookies for JWT storage.
- If localStorage must be used, implement short-lived access tokens with refresh tokens.
- Add a Content Security Policy to mitigate XSS.

---

### HIGH: No CSRF Protection

**Severity:** High  
**Files:** All `/api/*/route.ts` files

**Issue:** None of the API routes implement CSRF protection. All POST/PUT/DELETE endpoints rely solely on the `Authorization: Bearer <token>` header for authentication.

**Impact:** Since the JWT is stored in localStorage (not a cookie), it is NOT automatically sent with requests — mitigating CSRF somewhat. However, if an attacker can make requests from a page that has access to the localStorage token (via XSS or a compromised extension), CSRF-like attacks are possible.

**Fix:** Add CSRF tokens or implement double-submit cookie pattern. At minimum, ensure strict `SameSite` cookie usage if migrating to cookie-based auth.

---

### MEDIUM: dangerouslySetInnerHTML / innerHTML Usage

**Severity:** Medium  
**Files:**
- `app/layout.tsx` (line 31) — `dangerouslySetInnerHTML` for PWA script
- `lib/receipt-utils.ts` (lines 273, 345, 405) — `innerHTML` for receipt HTML
- `app/sales/dashboard/page.tsx` (line 481) — `innerHTML` for receipt printing
- `app/staff/commissions/page.tsx` (line 161) — `innerHTML` for PDF generation

**Issue:** The codebase uses `innerHTML` and `dangerouslySetInnerHTML` in several places:

```typescript
// layout.tsx — inline PWA script
<script dangerouslySetInnerHTML={{ __html: `...` }} />

// receipt-utils.ts — HTML generation
tempContainer.innerHTML = generateReceiptHTML(receipt);
```

**Impact:** While the current usage generates HTML from controlled data, this pattern bypasses React's XSS protections. If any data flowing into these functions becomes user-controllable, it creates an XSS vector.

**Fix:**
- For `layout.tsx`: Consider moving the PWA script to a separate JS file loaded via `<script src="...">`.
- For receipt/PDF generation: Use DOM APIs (`createElement`, `appendChild`) instead of `innerHTML`, or use a safe template library.

---

### MEDIUM: In-Memory Rate Limiting Ineffective in Serverless

**Severity:** Medium  
**Files:**
- `app/api/auth/login/route.ts` (lines 11-48)

**Issue:** The login rate limiter uses an in-process `Map<string, RateEntry>`:

```typescript
const failedAttempts = new Map<string, RateEntry>();
```

**Impact:** In serverless deployments on Vercel, each request may hit a different instance (or a cold start). The rate limiter state is NOT shared across instances. An attacker can brute-force credentials by sending requests that land on different instances.

**Fix:** Use a shared state solution like Upstash Redis (as the code's own comment suggests), or Supabase's rate limiting features. The existing code is a best-effort guard that only helps against rapid successive requests to the same instance.

---

### MEDIUM: Service Worker Caches API Responses

**Severity:** Medium  
**Files:**
- `public/sw.ts` (lines 41-68)

**Issue:** The service worker caches ALL GET requests:

```typescript
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, responseClone); // ← Caches API responses!
      });
      return response;
    })
  );
});
```

**Impact:** API GET responses (potentially containing business data) are cached in the user's browser cache. Since the cache has no time-based invalidation, stale data may be served. If a user logs out and another user uses the same device, cached API responses from the previous session could be exposed.

**Fix:**
- Exclude `/api/` paths from service worker caching.
- Implement cache-first strategies with versioning for static assets only.
- Add cache expiration headers.

---

### MEDIUM: Minimal Password Policy

**Severity:** Medium  
**Files:**
- `app/api/auth/change-password/route.ts` (line 18)

**Issue:** The only password validation is a minimum length of 6 characters:

```typescript
if (new_password.length < 6) {
  return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
}
```

**Impact:** 6-character minimum is below industry standards (NIST recommends 8+, OWASP recommends 10+). This makes brute-force and dictionary attacks more feasible.

**Fix:**
- Increase minimum to 12 characters.
- Add complexity requirements (uppercase, lowercase, number, special character).
- Implement rate limiting on password change endpoint.

---

### LOW: Missing Content Security Policy (CSP) Header

**Severity:** Low  
**Files:**
- `next.config.js` (lines 26-39)

**Issue:** The security headers config includes several important headers but is **missing Content-Security-Policy**:

```javascript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // ⚠️ CSP is MISSING
    ],
  }];
}
```

**Impact:** CSP is a critical defense-in-depth against XSS attacks. Without it, any successful XSS can fully compromise the user's session.

**Fix:** Add a strict CSP. For a PWA that loads scripts from its own origin and Supabase:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' https://fonts.gstatic.com;
```

---

### LOW: Error Messages Leak Internal Details

**Severity:** Low  
**Files:** Multiple API route handlers

**Issue:** Error handlers return `error.message` directly to the client:

```typescript
catch (error: any) {
  return NextResponse.json({ error: error.message }, { status: 400 });
}
```

**Impact:** Internal error messages (database constraint errors, column names, etc.) are exposed to the client, aiding attackers in reconnaissance.

**Fix:** Log the full error server-side and return a generic error message to the client.

---

### LOW: Debug Files Committed to Git

**Severity:** Low  
**Files:**
- `scratch/debug_db.ts`

**Issue:** A debug script imports `supabaseAdmin` (service role key client) and queries production data:

```typescript
import { supabaseAdmin } from '../lib/server/supabase-admin';
async function checkData() {
  const { data: creditors } = await supabaseAdmin.from('creditors').select('*');
  const { data: sales } = await supabaseAdmin.from('credit_sales').select('*');
  // ...
}
```

**Impact:** While this file only runs when executed directly, it demonstrates access patterns that could aid attackers. More importantly, it shows that service-role-level queries are easily accessible in the codebase.

**Fix:** Remove debug files from version control. Add `scratch/` to `.gitignore`.

---

### LOW: VERCEL_OIDC_TOKEN in .env.local

**Severity:** Low (confined to local)  
**File:** `.env.local` (line 2)

**Issue:** The `VERCEL_OIDC_TOKEN` is a JWT that authenticates the local development environment with Vercel. While `.env.local` is gitignored, this token could leak through other means (screen sharing, backups, etc.).

**Impact:** This token has Vercel deployment scopes and could be used to modify the Vercel project configuration.

**Fix:** Consider using Vercel CLI's built-in authentication (`vercel login`) instead of storing OIDC tokens in env files.

---

## Performance Findings

---

### HIGH: Excessive .next Build Size (~893MB) - done

**Severity:** High  

**Issue:** The `.next` build output directory is approximately **893MB**, indicating significant bundle bloat.

**Impact:** 
- Slow cold starts on Vercel serverless functions.
- Higher memory usage on deployment.
- Slower CI/CD pipeline.
- Higher likelihood of hitting Vercel's function size limits.

**Fix:**
1. Run `next build --analyze` with `@next/bundle-analyzer` to identify large modules.
2. Implement code splitting for large libraries (`html2canvas`, `jspdf`, `recharts`, `xlsx`).
3. Use dynamic imports for heavy components (receipt generation, chart views, Excel exports).
4. Tree-shake `lucide-react` imports (import individual icons, not the barrel).

---

### HIGH: N+1 Database Query Patterns - FIXED

**Severity:** High  
**Files:**
- `app/api/sales/create-sale/route.ts` (lines 46-72)
- `app/api/credit/give/route.ts` (lines 28-89)
- `app/api/admin/staff/route.ts` (lines 31-48)

**Issue:** Multiple routes perform individual database queries inside loops instead of using batch operations:

```typescript
// sales/create-sale/route.ts — N+1 pattern
for (const item of items) {
  // Individual query for EACH item
  const { data: currentItem } = await supabaseAdmin
    .from('items')
    .select('active_store_quantity')
    .eq('id', item.item_id)
    .single();
  
  const newQty = Math.max(0, (currentItem?.active_store_quantity || 0) - item.quantity);
  await supabaseAdmin
    .from('items')
    .update({ active_store_quantity: newQty })
    .eq('id', item.item_id);
}
```

**Impact:** If a sale has 20 items, this makes 40+ database round trips instead of 2. As the business grows and item counts increase, this will cause noticeable latency and higher Supabase compute costs.

**Fix:**
- For quantity updates: Use a single batch with `supabase.rpc()` to create a database function that handles atomic updates.
- For staff enrichment: Use a single query with aggregate functions (e.g., `SUM`) in a `GROUP BY` query instead of per-staff queries.

---

### HIGH: Duplicate Toast Libraries (react-toastify + sonner)

**Severity:** High  

**Issue:** `package.json` includes **both** `react-toastify` and `sonner`:

```json
"dependencies": {
  "react-toastify": "^9.1.3",
  "sonner": "^2.0.7",
}
```

**Impact:** Both libraries are bundled, adding unnecessary weight (~15-25KB gzipped each). Only one appears to be actively used (`react-toastify` CSS is imported in `layout.tsx`).

**Fix:** Remove `sonner` from dependencies if `react-toastify` is the active toast library (or vice versa).

---

### MEDIUM: Large Client Bundle Dependencies - FIXED

**Severity:** Medium  

**Issue:** Several heavy client-side libraries are bundled:

| Library | Approx Size (gzipped) | Usage |
|---------|----------------------|-------|
| `html2canvas` | ~35KB | Receipt printing |
| `jspdf` | ~25KB | PDF generation |
| `recharts` | ~80KB+ | Charts/dashboards |
| `xlsx` | ~100KB+ | Excel export |
| `lucide-react` | ~50KB (if not tree-shaken) | Icons |
| `date-fns` | ~15KB (tree-shaken) | Date formatting |

**Impact:** Large initial bundle leads to slower page loads, especially on mobile devices (the app is a PWA targeting mobile users).

**Fix:**
- Use `next/dynamic` with `ssr: false` for receipt-utils, chart components, and export functionality.
- Import only specific icons from `lucide-react` (e.g., `import { Menu, X } from 'lucide-react'` instead of barrel import).
- Consider lighter alternatives: `html-to-image` instead of `html2canvas`, `recharts` is fine but should be lazy-loaded.

---

### MEDIUM: Missing Database Pagination on Critical Routes - FIXED

**Severity:** Medium  
**Files:**
- `app/api/notifications/route.ts` — fetches all records, slices in memory (limit 150)
- `lib/server/returned-items.service.ts` — `getAllReturns()` has no pagination
- `app/api/sales/posted-items/route.ts` (check needed)
- Multiple other GET endpoints

**Issue:** Several GET endpoints lack proper database-level pagination (`LIMIT`/`OFFSET` or `range()` in Supabase). The notification route fetches multiple tables and then manually limits in JavaScript.

**Impact:** As the database grows, these queries will become progressively slower and more expensive. Large result sets also consume more memory in serverless function instances.

**Fix:** Use Supabase's `.range()` method consistently on all list endpoints. Implement cursor-based pagination for frequently-accessed routes.

---

### MEDIUM: Server-Side Cache Without Invalidation Strategy

**Severity:** Medium  
**Files:**
- `lib/server/cache.ts`
- `app/api/admin/logs/route.ts` (lines 19-25, 59)

**Issue:** The in-memory server cache uses TTL-based expiration with no automatic invalidation on data changes:

```typescript
const cacheKey = `logs:${logType}:${logDate}:${lines}`;
const cachedResult = serverCache.get(cacheKey);
if (cachedResult) {
  return NextResponse.json({ ...cachedResult, fromCache: true });
}
```

**Impact:** Data staleness — users may see outdated information for up to 5 minutes. In serverless deployments, this cache is also per-instance, so its effectiveness is limited.

**Fix:** 
- For serverless, consider using a distributed cache (Upstash Redis) if caching is critical.
- Implement manual cache invalidation when relevant data is mutated.
- Reduce TTLs or rely on database-level caching (pgBouncer, Supabase connection pool).

---

### MEDIUM: Experimental optimizeCss Enabled

**Severity:** Medium  
**File:** `next.config.js` (line 23)

**Issue:** `experimental: { optimizeCss: true }` is enabled with the `critters` dependency.

**Impact:** While this can reduce CSS bundle size, it has been known to cause hydration and FOUC (Flash of Unstyled Content) issues in Next.js 13. It also adds build complexity.

**Fix:** Test thoroughly in production. If hydration issues occur, disable this and use manual CSS optimization (purging unused styles via Tailwind — which already does this).

---

### LOW: Unused Dependencies

**Severity:** Low  
**File:** `package.json`

**Issue:** Several dependencies appear unused or redundant:
- `next-pwa` (line 27) — Comment states: "next-pwa is no longer used"
- `critters` (line 48) — Only used if `experimental.optimizeCss` is active
- `@types/jsonwebtoken` (line 16) — Should be a devDependency, not a dependency
- Two toast libraries (`react-toastify` + `sonner`)

**Impact:** Unnecessary bundle size and dependency maintenance burden.

**Fix:**
- Remove `next-pwa`, `sonner`, and `critters` if not needed.
- Move `@types/jsonwebtoken` to `devDependencies`.

---

### LOW: No Bundle Analysis Tooling

**Severity:** Low  

**Issue:** There is no bundle analyzer configured in `package.json` or `next.config.js`.

**Impact:** Without bundle analysis, it's impossible to track bundle size regressions or identify large modules that should be code-split.

**Fix:** Add `@next/bundle-analyzer` and create an `analyze` script:
```bash
npm install --save-dev @next/bundle-analyzer
```
Then add to `next.config.js` and `package.json` scripts.

---

## Recommendations

### Immediate (Fix Within 1 Week)

1. **Add authentication to the 3 unprotected download routes** — `/api/download/history`, `/api/download/stats`, `/api/download/track`
2. **Remove override credentials** — Register `lucky` and `luckygold` in Supabase Auth, then delete `OVERRIDE_CREDS`
3. **Remove duplicate toast library** — Decide between `react-toastify` and `sonner`, remove the other

### Short Term (Fix Within 1 Month)

4. **Add Content Security Policy header** to next.config.js
5. **Increase password minimum length** to 12 characters
6. **Replace localStorage JWT with HttpOnly cookies** or implement short-lived access + refresh tokens
7. **Replace `innerHTML` patterns** with safe DOM APIs in receipt-utils
8. **Add database pagination** to all list endpoints (notifications, returned items, etc.)
9. **Refactor N+1 queries** in sale creation and credit flows
10. **Exclude `/api/` routes from service worker caching**

### Long Term (Within 3 Months)

11. **Implement bundle analysis and optimize** — Use `@next/bundle-analyzer`, dynamic imports for heavy libraries
12. **Implement shared rate limiting** — Use Upstash Redis for rate limiting (as the code comment suggests)
13. **Consistent error handling** — Don't leak internal error messages to clients
14. **Consider database-level RLS** — Even with application-level auth, RLS provides defense-in-depth
15. **Remove `scratch/` from version control** — Add to `.gitignore`
16. **Add automated API security tests** — Verify every route has auth and role checks

---

## Scoring Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 2 | 3 | 5 | 4 |
| Performance | 0 | 3 | 4 | 2 |
| **Total** | **2** | **6** | **9** | **6** |

**Risk Rating: HIGH** — Immediate action required on critical and high-severity findings.

---

*Report generated by automated code audit. All findings should be verified manually before taking action.*
