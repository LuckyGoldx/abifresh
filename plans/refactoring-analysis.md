# AKV System — Comprehensive Refactoring Analysis

> **Generated:** 2026-06-15  
> **Project:** ABIFRESH & KIDDIES VENTURES (Inventory & Sales Management PWA)  
> **Stack:** Next.js 13.5 App Router (TypeScript) + Express.js 4.18 (TypeScript) + Supabase (PostgreSQL)

---

## Table of Contents

1. [Critical: Project Hygiene](#1-critical-project-hygiene)
2. [Critical: Duplicate Code](#2-critical-duplicate-code)
3. [Critical: Architecture Issues](#3-critical-architecture-issues)
4. [High: Token & Auth Patterns](#4-high-token--auth-patterns)
5. [High: Type Safety Gaps](#5-high-type-safety-gaps)
6. [High: Missing Abstractions](#6-high-missing-abstractions)
7. [Medium: Component Issues](#7-medium-component-issues)
8. [Medium: API Design Issues](#8-medium-api-design-issues)
9. [Medium: Testing Gap](#9-medium-testing-gap)
10. [Low: Consistency Issues](#10-low-consistency-issues)
11. [Summary & Priority Matrix](#11-summary--priority-matrix)

---

## 1. Critical: Project Hygiene

### 1.1 Root-Level File Sprawl

| Category | Count | Location | Issue |
|----------|-------|----------|-------|
| Markdown files | ~283 | Project root | AI-generated fix summaries, duplicates, no organization |
| SQL files | ~55 | Project root | No migration numbering, duplicates (COMPLETE vs MASTER), 863KB+ dumps |
| Favicon SVGs | 30 | Project root | Design explorations (`favicon-1-circle.svg` through `favicon-30-reports.svg`) |
| Ad-hoc scripts | ~15 | Project root | Debug/test TypeScript/JS files (`check_payments.ts`, etc.) |
| Utility scripts | ~12 | Project root | `.ps1`, `.bat`, `.sh` files for various tooling |
| Python scripts | ~8 | Project root | Pitch generation tools with their own `.venv/` |

**Refactoring needed:**
- Move all `.md` files into `docs/archive/` or delete redundant AI-generated summaries
- Consolidate all `.sql` files into `migrations/` with numbered, timestamped filenames (e.g., `001_initial_schema.sql`)
- Move favicon explorations to `assets/favicon-explorations/`
- Move ad-hoc scripts to `scripts/dev/`
- Move utility scripts to `scripts/tools/`

### 1.2 Dead / Empty Directories

| Directory | Status |
|-----------|--------|
| `backend/src/controllers/` | **EMPTY** — MVC structure broken; routes call services directly |
| `backend/src/utils/` | **EMPTY** — dead directory |
| `frontend/src/data/` | **EMPTY** — unused |
| `frontend/app/debug/` | **EMPTY** — 9 empty API route subdirectories |
| `login-designs/` | **EMPTY** — typo duplicate of `login_designs/` |
| `plans/` | **EMPTY** — (this file fixes that) |

**Refactoring needed:** Delete empty directories. Either populate `backend/src/controllers/` with proper controller layer or remove the MVC directory structure entirely.

### 1.3 Exposed Secrets

`frontend/.env.production` contains the Supabase URL and anon key in plaintext. While the anon key is designed for public use, the file is committed to version control and should only contain non-sensitive values. The `.husky/pre-commit` secret scanner exists but did not catch this.

**Refactoring needed:** Verify `.gitignore` covers `.env.production` and `.env.local`. Ensure the `.env.production` file contains only safe public values.

### 1.4 Python Environment in Node.js Project

A `.venv/` virtual environment (PyMuPDF, NumPy) exists at root, used by pitch generation Python scripts. This is entirely separate tooling that should live outside the project or in a clearly marked `tools/` directory.

**Refactoring needed:** Move `.venv/` and related `.py` scripts to a `tools/` directory or separate repository.

### 1.5 Node Modules Proliferation

Separate `node_modules/` directories exist at root, `frontend/`, `backend/`, and `.kilo/` — each with their own `package-lock.json`. No monorepo tooling (npm workspaces, turborepo, nx) is configured.

**Refactoring needed:** Set up npm workspaces or turborepo to share dependencies and unify tooling. The root `package.json` is nearly empty.

---

## 2. Critical: Duplicate Code

### 2.1 Identical Expense Pages (85%+ Duplication)

Three expense pages share the same structure, logic, and UI:

| File | Lines | Difference from `sales/expenses` |
|------|-------|----------------------------------|
| `frontend/app/sales/expenses/page.tsx` | 600 | Baseline |
| `frontend/app/staff/expenses/page.tsx` | 600 | **IDENTICAL** (only API endpoint differs: `/api/staff/expenses` vs `/api/sales/expenses`) |
| `frontend/app/admin/my-expenses/page.tsx` | 480 | Same structure, adds rename category feature, uses `alert()` instead of `addToast()`, has debug `console.log` in render loop |

All three share:
- The same `FALLBACK_CATEGORIES` (but with different values!)
- The same `fetchCategories()` logic
- The same `showCustomInput` / `customInputValue` pattern
- The same loading spinner (see §2.2)
- The same expense history table
- The same add-expense form
- The same amount input sanitization regex

**Refactoring needed:** Extract into:
```
components/expenses/
  ExpenseForm.tsx         — shared form with amount/category/description/date
  ExpenseHistoryTable.tsx — shared table component
  ExpensePreviewModal.tsx — confirmation modal
  ExpenseDetailModal.tsx  — detail viewer modal
  useExpenseCategories.ts — shared category fetching hook
  useAddExpense.ts        — shared mutation hook
```
Each page then becomes a thin 50-80 line wrapper consuming these shared components.

### 2.2 Duplicated Loading Spinner

**Every page** contains this exact loading spinner block (19 lines):

```tsx
if (isLoading) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse">
          <img src="/favicon.svg" alt="" className="w-20 h-20" />
        </div>
        <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
          <div className="w-5 h-5 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold">Abifreshing...</span>
        </div>
      </div>
    </div>
  );
}
```

This appears in at minimum: `admin/staff/page.tsx` (line 272), `sales/expenses/page.tsx` (line 113), `staff/expenses/page.tsx` (line 113), `admin/my-expenses/page.tsx` (line 113), and likely every other data-fetching page.

**Refactoring needed:** The project has a `LoadingLogo` component at `frontend/components/LoadingLogo.tsx`. Replace all inline spinners with `<LoadingLogo />` (or create `<AbifreshLoader />` if LoadingLogo serves a different purpose).

### 2.3 Duplicated Date Formatting

Despite `frontend/lib/format-date.ts` (line 1) exporting `formatDate`, `formatTime`, `formatDateShort`, `formatDateTime`, pages still inline date formatting:

- `admin/staff/page.tsx` line 24-45: Custom `formatRegistrationDate()` helper (31 lines)
- `sales/expenses/page.tsx` lines 362-374: Inline `toLocaleDateString` + `toLocaleTimeString`
- `admin/my-expenses/page.tsx` line 419: Inline `toLocaleDateString`
- `useDashboardStats.ts` lines 40-60: Inline `Intl.DateTimeFormat` with hardcoded `Africa/Lagos` timezone

**Refactoring needed:** Replace all inline formatting with the shared `format-date.ts` utilities. Add a `formatRelativeDate()` function for "Today at…" / "Yesterday at…" patterns.

### 2.4 Duplicated Expense Category Logic

The custom-category "Add Custom" pattern is duplicated verbatim in `sales/expenses` and `staff/expenses` (each ~65 lines). The `admin/my-expenses` page adds a rename-category variant (~50 more lines).

**Refactoring needed:** Extract into:
- `useExpenseCategoryManager()` hook — handles fetch, add, rename, fallback
- `ExpenseCategorySelect` component — handles the select + custom input UI

---

## 3. Critical: Architecture Issues

### 3.1 Dual API Architecture (Express + Next.js Serverless)

The project has TWO complete API implementations:

| | Express Backend (`backend/src/`) | Next.js API Routes (`frontend/app/api/`) |
|---|---|---|
| Route files | 11 (auth, sales, admin, inventory, staff, receipts, etc.) | ~148 endpoints across 15 route groups |
| Database access | Via `supabaseAdmin` (direct DB queries) | Via (presumably) same Supabase client |
| Middleware | auth, csrf, rateLimit, validation | Handled per-route or via Next.js middleware |
| Deployment target | Koyeb (Docker) | Vercel (serverless) |

`frontend/.env.production` sets `NEXT_PUBLIC_API_URL=` (empty), meaning the frontend uses **relative URLs** — all API calls go to Next.js serverless routes, NOT the Express backend. The Express backend is deployed separately but appears **unused in production**.

**Refactoring needed:** 
- **Option A (recommended):** Consolidate to Next.js API routes only. Remove `backend/` entirely. This eliminates 33 TS files, reduces deployment complexity, and aligns with the configured architecture.
- **Option B:** If Express is needed for WebSocket log streaming or advanced middleware, clearly separate responsibilities and document which endpoints belong where. Remove all duplicated endpoints from one side.

### 3.2 Backend MVC Structure is Broken

- `backend/src/controllers/` — **EMPTY** 
- `backend/src/routes/sales.routes.ts` — **916 lines** of route handlers mixing HTTP concerns + raw SQL + business logic + validation
- `backend/src/services/` — Some services exist (`sales.service.ts` — 302 lines) but routes bypass them frequently by calling `supabaseAdmin` directly (e.g., lines 152-201 in `sales.routes.ts`)

**Refactoring needed:** Either:
1. Populate `controllers/` to separate HTTP from business logic, or
2. Remove the MVC convention and use a flat routes+services pattern consistently

### 3.3 Monolithic Route Files

`backend/src/routes/sales.routes.ts` is **916 lines** and handles:
- Items (available/unavailable)
- Sales recording (3 variations: `/create`, `/create-sale`, `/record`)
- Posting items to staff
- Dashboard
- Receipts
- Staff list
- Payments (request + history)
- Sales history (with 100+ lines of payment reconciliation logic)
- Expenses (create + list)
- Returned items (accept + reject)

**Refactoring needed:** Split into domain route files:
- `sales-items.routes.ts`
- `sales-transactions.routes.ts`
- `sales-post-items.routes.ts`
- `sales-payments.routes.ts`
- `sales-expenses.routes.ts`
- `sales-returns.routes.ts`

### 3.4 Raw SQL In Route Files

`backend/src/routes/sales.routes.ts` contains raw Supabase queries mixed with business logic. The `/create-sale` handler (lines 143-242) directly manipulates `sales`, `sales_items`, `items`, and `daily_sales_summary` tables inline — a 100-line transaction with no service abstraction.

**Refactoring needed:** Move all database access to service layer. Use transactions via `supabase.rpc()` for multi-table operations.

---

## 4. High: Token & Auth Patterns

### 4.1 Manual Token Passing

Hooks require `token` as a parameter and pass it manually:

```typescript
// useDashboardStats.ts line 27
const headers = { Authorization: `Bearer ${token}` };
const [receiptsRes, staffRes, paymentsRes] = await Promise.all([
  api.get('/api/receipts/all', { headers }),
  // ...
]);
```

But `frontend/lib/api.ts` ALREADY has an axios interceptor (line 18-42) that reads the token from localStorage and attaches it automatically. This means every hook is redundantly passing headers that the interceptor would add anyway.

**Refactoring needed:** Remove manual token passing from all hooks. The interceptor handles it. If a hook needs to call `fetchStats` without a loaded token, use the interceptor's existing logic.

### 4.2 Inconsistent Token Parsing

The axios interceptor (`api.ts` line 31) handles two token formats (`parsed.state?.token` and `parsed.token`), but the Zustand store (`auth.ts`) uses `auth-storage` as the key. Other code reads from `localStorage.getItem('auth-storage')` directly.

**Refactoring needed:** Standardize on the Zustand `useAuthStore` for token access. Create a `getToken()` utility used by both the interceptor and hooks.

---

## 5. High: Type Safety Gaps

### 5.1 Broad `any` Usage

Despite having a 597-line `frontend/types/index.ts`, the codebase makes heavy use of `any`:

- `useDashboardStats.ts` line 47: `(receipt: any)` — Receipt type exists but isn't used
- `useDashboardStats.ts` lines 63, 71, 81: `(acc: any, receipt: any)` 
- `usePayments.ts` line 43: `(err: any)` — no error type
- `admin/staff/page.tsx` line 148: `error: any`
- `sales/expenses/page.tsx` line 91: `error: any`
- `backend/src/routes/sales.routes.ts` lines 714, 772: `(item: any)`, `(sale: any)`

### 5.2 Inconsistent Expense Field Names

The `Expense` type (types/index.ts lines 264-274) defines:
```typescript
interface Expense {
  category?: string;
  expense_type?: string;
  // ...
}
```

But the API sends `expense_type` while the frontend uses `category` — requiring a manual mapping in every page:
```typescript
// sales/expenses/page.tsx line 80
expense_type: category, // DB column mapping
```

**Refactoring needed:** Standardize the API response to always return `category` (not `expense_type`). Update the backend services to map `expense_type` → `category` at the response level so the frontend never sees the DB column name.

### 5.3 Role Type Scattered

The `UserRole` type in `types/index.ts` (line 15-23) defines 8 role values. But `store/auth.ts` (line 10) redefines the same union inline. The `menuConfig` (Sidebar) likely hardcodes role strings as well.

**Refactoring needed:** Use `import type { UserRole } from '@/types'` everywhere. Export `ROLES` as a const object. Never inline role strings.

---

## 6. High: Missing Abstractions

### 6.1 No Shared Modal Component

The codebase has at least 6 different inline modal implementations across pages. Each modal duplicates:
- The overlay (`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`)
- The container (`bg-white dark:bg-gray-900 border rounded-2xl max-w-md w-full shadow-2xl`)
- The close logic (`setShowXModal(false)`)

**Refactoring needed:** Create a `<Modal>` component (or `<Dialog>`) in `frontend/components/` that accepts `children`, `isOpen`, `onClose`, and optional `title` props. Replace all inline modals.

### 6.2 No Shared Status Badge Component

Status badges (pending/approved/rejected/disapproved) are styled inline everywhere with slightly different color variants:

- `sales/expenses/page.tsx` lines 387-393: `bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400`
- `staff/expenses/page.tsx` lines 387-393: Same pattern
- `admin/staff/page.tsx` line 653: `text-green-600` (no badge, just colored text)
- Receipt status badges: Different colors entirely

**Refactoring needed:** Create `<StatusBadge>` component with a `variant` prop. Standardize colors.

### 6.3 No Shared Empty State Component

Empty states are copy-pasted with slight variations:
```tsx
// sales/expenses/page.tsx lines 423-428
{expenses.length === 0 && (
  <div className="text-center py-12 text-gray-500">
    <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
    <p className="font-medium text-gray-750 dark:text-gray-300">No expenses recorded yet</p>
    <p className="text-sm mt-1 text-gray-400">Submit new ones to see them here</p>
  </div>
)}
```

**Refactoring needed:** Create `<EmptyState>` component accepting `icon`, `title`, and `description` props.

### 6.4 No Shared Error State / Error Boundary Usage

The `ErrorBoundary` class component exists (`components/ErrorBoundary.tsx` — 84 lines) but is a **class component** in a functional component codebase. It has a functional wrapper (`ErrorBoundaryWrapper`), but there's no evidence it's used in any route page.

**Refactoring needed:** Convert to a functional error boundary using `react-error-boundary` or keep the class but ensure it wraps every route in `layout.tsx`.

---

## 7. Medium: Component Issues

### 7.1 Oversized Page Components

| File | Lines | Concern |
|------|-------|---------|
| `frontend/app/admin/staff/page.tsx` | **772** | Massive monolithic page: form, table, inline modals, filtering, sorting, CRUD — should be split into `<StaffForm>`, `<StaffTable>`, `<StaffFilters>`, `<DeleteConfirmModal>` |
| `frontend/app/sales/expenses/page.tsx` | **600** | Form + history table + preview modal + detail modal all in one file |
| `frontend/app/staff/expenses/page.tsx` | **600** | Identical structure to sales/expenses |
| `frontend/app/admin/my-expenses/page.tsx` | **480** | Same pattern again |
| `backend/src/routes/sales.routes.ts` | **916** | See §3.3 |

### 7.2 Debug Logging in Production Code

`admin/my-expenses/page.tsx` lines 409-416: `console.log` in the **render path** (inside `.map()`):
```typescript
{expenses.map((expense) => {
  console.log('📊 Displaying expense:', { ... });
  return ( /* ... */ );
})}
```

Additional debug logs exist in:
- `admin/my-expenses/page.tsx` lines 75-82: Form submission debug
- `backend/src/routes/sales.routes.ts` lines 70-75, 415, 541-549, 589, 602, 764-770: Numerous console.logs

**Refactoring needed:** Remove all debug `console.log` statements from production code. Replace with a proper logger that can be toggled off in production.

### 7.3 Inconsistent Error Handling

Three different error reporting patterns across pages:
1. `addToast(error?.response?.data?.error, 'error')` — sales/expenses, staff/expenses
2. `alert(error?.response?.data?.error)` — admin/my-expenses
3. `console.error(...)` only, no user feedback — admin/staff fetchStaff

**Refactoring needed:** Standardize on `addToast()` via the ToastContext for all user-facing errors. Never use `alert()`. Use a custom `useAsync` or `useMutation` hook that auto-handles loading/error/success states.

### 7.4 Amount Input Sanitization Duplicated

The same currency input sanitization regex is copy-pasted in three files:
```typescript
const value = e.target.value.replace(/[^0-9.]/g, '');
const parts = value.split('.');
if (parts.length <= 2) {
  setAmount(parts.length === 2 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0]);
}
```
(Appears in `sales/expenses` line 202, `staff/expenses` line 202, `admin/my-expenses` line 194)

**Refactoring needed:** Extract to `lib/format-currency.ts` as `sanitizeAmountInput(value: string): string`.

---

## 8. Medium: API Design Issues

### 8.1 Inconsistent API Endpoint Patterns

| Pattern | Example | Issue |
|---------|---------|-------|
| Role-scoped endpoints | `/api/admin/staff`, `/api/sales/staff`, `/api/staff/store` | Three endpoints for the same resource |
| Plural vs action-named | `/api/receipts/all` vs `/api/receipts` | `/all` suffix is non-RESTful |
| Nested resources | `/api/admin/payments/staff/${staffId}` | Deep nesting |
| Inconsistent naming | `/api/admin/my-expenses` (my-) vs `/api/sales/expenses` | No consistent pattern |

**Refactoring needed:** Adopt a consistent REST pattern:
```
/api/expenses          GET    — list (role-filtered server-side)
/api/expenses          POST   — create
/api/expenses/[id]     PUT    — update
/api/staff             GET    — list (role-filtered server-side)
/api/staff/[id]        PUT    — update
/api/payments          GET    — list (role-filtered)
/api/payments/[id]     PUT    — approve/reject
```

### 8.2 No Request Caching / Deduplication

`useDashboardStats.ts` makes 3 parallel API calls (`receipts/all`, `staff`, `payments/pending`) — but if multiple components mount simultaneously, these calls are NOT deduplicated. React Query / SWR would handle this.

**Refactoring needed:** Consider adopting React Query (`@tanstack/react-query`) or SWR for server state. This would provide: deduplication, caching, background refetch, optimistic updates, and automatic loading/error states — eliminating 50%+ of the useState boilerplate.

### 8.3 No API Response Envelope

API responses vary:
- Sometimes `res.data` (axios unwrapped)
- Sometimes `res.data || []` (fallback)
- Sometimes direct JSON `res.json(data)`

**Refactoring needed:** Standardize on `{ data: T, error?: string }` envelope for all API responses.

---

## 9. Medium: Testing Gap

### 9.1 Near-Zero Test Coverage

| Layer | Tests | Status |
|-------|-------|--------|
| Frontend components | 1 test (`__tests__/sales/`) | Effectively zero |
| Frontend hooks | 0 | No tests |
| Frontend API routes | 0 | No tests |
| Backend routes | 0 | No tests |
| Backend services | 0 | No tests |
| Integration/E2E | 0 | No tests |

Vitest is configured (`frontend/vitest.config.ts`) but unused. The backend has no test runner configured.

**Refactoring needed:** 
- Add unit tests for hooks (they're pure logic and easy to test)
- Add component tests for shared components (StatCard, Pagination, LoadingLogo)
- Add API route tests for critical paths (auth, sales creation)
- Add integration tests for the credit system business logic

---

## 10. Low: Consistency Issues

### 10.1 Inconsistent Tailwind Color Classes

Dark mode color variants are inconsistent:
- `dark:bg-purple-900` (admin/my-expenses line 426) vs `dark:bg-purple-900/40` (sales/expenses line 378)
- `dark:text-gray-200` vs `dark:text-gray-300` — inconsistent gray scale
- Custom color `text-red-650` (line 546, staff/expenses) — not a standard Tailwind color

**Refactoring needed:** Use Tailwind's built-in color scale. Define custom colors in `tailwind.config.js` theme extension if needed.

### 10.2 Inconsistent File Naming

| Convention | Examples |
|------------|----------|
| kebab-case | `format-date.ts`, `format-quantity.ts`, `receipt-utils.ts` |
| camelCase | `usePagination.ts`, `useDashboardStats.ts` |
| PascalCase | `StatCard.tsx`, `Pagination.tsx`, `ErrorBoundary.tsx` |
| SCREAMING_SNAKE | `FIX_*.md`, `COMPLETE_*.md` (root .md files) |

**Refactoring needed:** Consistent naming won't break anything but improves navigability. Standardize on kebab-case for utility files, PascalCase for components.

### 10.3 Favicon Chaos

30 favicon SVG files at root, plus `frontend/public/favicon.svg`. No decision recorded on which design was chosen.

**Refactoring needed:** Choose one favicon. Move the other 29 explorations out of the project root. Move the chosen one to `frontend/public/favicon.svg`.

### 10.4 `download-designs/` in App Router

`frontend/app/download-designs/` has 10 numbered subdirectories (`1/`, `2/`, …, `10/`) each with a `page.tsx`. These are design explorations living inside the App Router — they're accessible at `/download-designs/1`, `/download-designs/2`, etc.

**Refactoring needed:** Move design explorations to a `/design-explorations/download/` directory outside the app router. Remove the routes.

---

## 11. Summary & Priority Matrix

### Priority Ranking

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| **P0** | Delete/reorganize 283 root `.md` files | 1 hour | Project navigability |
| **P0** | Consolidate 55 root `.sql` files into `migrations/` | 2 hours | Database integrity tracking |
| **P0** | Extract shared expense components (3 nearly identical pages → 1 set of components) | 4 hours | Eliminates ~1000 lines of duplication |
| **P0** | Replace duplicated loading spinner with shared component | 2 hours | ~200 lines removed, consistency |
| **P1** | Choose one API architecture (Express vs Next.js) and remove the other | 8 hours | Deployment simplicity, maintenance |
| **P1** | Remove manual token passing from hooks (use interceptor) | 2 hours | Simpler hook signatures, fewer bugs |
| **P1** | Standardize error handling (addToast vs alert vs console.error) | 3 hours | Consistent UX |
| **P1** | Remove debug console.log from production code | 1 hour | Clean console, performance |
| **P2** | Create shared Modal, StatusBadge, EmptyState components | 4 hours | Reusability, ~300 lines saved |
| **P2** | Adopt React Query for server state | 8 hours | Caching, deduplication, less boilerplate |
| **P2** | Add tests for hooks and shared components | 8 hours | Confidence in refactors |
| **P2** | Fix type safety — eliminate `any` usage | 6 hours | TypeScript value |
| **P3** | Standardize Tailwind colors and class patterns | 2 hours | Visual consistency |
| **P3** | Split 772-line admin/staff/page.tsx into components | 3 hours | Maintainability |
| **P3** | Move favicon explorations, download-designs out of app router | 1 hour | Cleaner routes |
| **P3** | Set up npm workspaces or turborepo | 4 hours | Monorepo tooling |

### Estimated Total Effort

| Tier | Total Hours |
|-------|-------------|
| P0 (Critical) | ~9 hours |
| P1 (High) | ~14 hours |
| P2 (Medium) | ~26 hours |
| P3 (Low) | ~10 hours |
| **Grand Total** | **~59 hours** |

---

## Appendix: Architecture Decision Records Needed

1. **ADR-001:** API Architecture — Express vs Next.js API routes vs hybrid
2. **ADR-002:** State Management — Continue with Zustand or adopt React Query
3. **ADR-003:** Component Library — Shared components standard
4. **ADR-004:** Testing Strategy — Vitest + Testing Library vs Cypress E2E
5. **ADR-005:** Database Migration Strategy — Numbered migrations with version tracking
