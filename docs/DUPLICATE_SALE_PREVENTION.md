# Duplicate Sale Prevention — Implementation Guide

## Overview

Three-layer defense to prevent duplicate sales from double-submission, network retry, or human error.

## Layer 1: Frontend Button Disable (Instant)

**Status**: ✅ Already implemented in both `staff/make-sale` and `sales/make-sale`

The submit button inside the cart preview modal has `disabled={isProcessing}`. On first click, `isProcessing` becomes `true`, the button is disabled, and a spinner shows.

| File | Line | Code |
|---|---|---|
| `staff/make-sale/page.tsx` | 753 | `disabled={cart.length === 0 \|\| isProcessing}` |
| `sales/make-sale/page.tsx` | (same pattern) | `disabled={cart.length === 0 \|\| isProcessing}` |

**Prevents**: Accidental double-clicks on all viewports (mobile, tablet, desktop)

---

## Layer 2: Idempotency Key (Request-Level)

**Status**: ✅ Implemented in both routes + both frontend pages

### Implementation

**Shared Helper** — `lib/server/idempotency.ts`

Wraps the sale operation. Uses `INSERT ... ON CONFLICT` on the `idempotency_keys` table (PRIMARY KEY constraint). If key already exists → returns cached result without processing. If key is new → runs the sale, stores the result on success (2xx only). Cleans up claimed keys on error or non-2xx responses so the client can retry with the same key.

**Backend Routes**

| Route | File | Line | How |
|---|---|---|---|
| Staff make-sale | `api/staff/store/make-sales/route.ts` | 13 | `return await withIdempotency(key, async () => { ... })` |
| Sales make-sale | `api/sales/create-sale/route.ts` | 17 | Same pattern |

**Frontend Pages**

| Page | File | Line | How |
|---|---|---|---|
| Staff make-sale | `app/staff/make-sale/page.tsx` | 282 | `headers: { ..., 'Idempotency-Key': crypto.randomUUID() }` |
| Sales make-sale | `app/sales/make-sale/page.tsx` | 304 | Same pattern |

The key is generated on every submit inside the preview modal's checkout handler. Both `isProcessing` (button disable) and the idempotency key work together — the button disable catches double-clicks, and the key catches browser retries and tab replays.

**New Table** (create in Supabase SQL Editor):

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Cleanup Cron** (optional, via Supabase):

```sql
SELECT cron.schedule(
  'cleanup-idempotency-keys',
  '0 0 */2 * *',
  $$DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '2 days'$$
);
```

**Prevents**: Browser network retries, curl/Postman replays, accidental double-submit across tabs

---

## Layer 3: 30-Second Duplicate Guard (Business-Level)

**Status**: ✅ Implemented in both routes below

### How It Works

Before processing any sale, the backend:
1. Queries recent sales (last 60 seconds) for the same staff member
2. Generates a `saleSignature` from `JSON.stringify({ items, total_amount, payment_method, sold_outside_jalingo })`
3. Compares it against each recent sale's data
4. If match found → returns **409 Conflict** with error message

### Implementation

#### `staff/store/make-sales/route.ts` (lines 15-45)

```typescript
const sixtySecAgo = new Date(Date.now() - 60000).toISOString();
const saleSignature = JSON.stringify({ items, payment_method, sold_outside_jalingo });

const { data: recentSales } = await supabaseAdmin
  .from('staff_sales')
  .select('item_id, quantity, unit_price, payment_method, sold_outside_jalingo, created_at')
  .eq('staff_id', authResult.id)
  .gte('created_at', sixtySecAgo)
  .limit(50);

// Groups sales by minute (items from the same transaction have close timestamps)
const recentGroups = new Map<string, { ... }>();
for (const s of recentSales) {
  const key = s.created_at.substring(0, 16);
  // ... group items ...
}
for (const [, group] of recentGroups) {
  const sig = JSON.stringify({ items: group.items, payment_method: ..., sold_outside_jalingo: ... });
  if (sig === saleSignature) {
    return NextResponse.json({ error: 'Duplicate sale detected...' }, { status: 409 });
  }
}
```

#### `sales/create-sale/route.ts` (lines 19-46)

```typescript
const sixtySecAgo = new Date(Date.now() - 60000).toISOString();
const saleSignature = JSON.stringify({ items, total_amount, payment_method, sold_outside_jalingo });

const { data: recentSales } = await supabaseAdmin
  .from('sales')
  .select('id, created_at, total_amount, payment_method, sold_outside_jalingo, sales_items(item_id, quantity, unit_price)')
  .eq('staff_id', authResult.id)
  .gte('created_at', sixtySecAgo)
  .limit(20);

for (const s of recentSales) {
  const saleItems = (s.sales_items || []).map(si => ({ item_id: si.item_id, quantity: si.quantity, unit_price: si.unit_price }));
  const sig = JSON.stringify({ items: saleItems, total_amount: s.total_amount, payment_method: s.payment_method, sold_outside_jalingo: s.sold_outside_jalingo });
  if (sig === saleSignature) {
    return NextResponse.json({ error: 'Duplicate sale detected...' }, { status: 409 });
  }
}
```

**Prevents**: User submitting the same sale twice after thinking it failed, human error, browser replay

---

## Defense Summary

| Layer | What It Stops | Where | Status |
|---|---|---|---|
| **Button disable** | Accidental double-click | Frontend preview modal | ✅ Done |
| **Idempotency key** | Network retry, tab replay, curl | Backend (header check) | ✅ Done |
| **30-second guard** | Human retry (thought it failed) | Backend (before processing) | ✅ Done |

## Files Modified

| File | Change |
|---|---|
| `lib/server/idempotency.ts` | New — shared idempotency helper with PRIMARY KEY guard |
| `app/api/staff/store/make-sales/route.ts` | Wrapped with `withIdempotency` (line 13) |
| `app/api/sales/create-sale/route.ts` | Wrapped with `withIdempotency` (line 17) |
| `app/staff/make-sale/page.tsx` | `Idempotency-Key` header with `crypto.randomUUID()` (line 282) |
| `app/sales/make-sale/page.tsx` | `Idempotency-Key` header with `crypto.randomUUID()` (line 304) |

## SQL Required (Run in Supabase)

Execute `docs/CREATE_IDEMPOTENCY_KEYS.sql` in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

No RLS needed — only accessed server-side via `supabaseAdmin` (service role key). The optional cron cleanup is documented in the SQL file.
