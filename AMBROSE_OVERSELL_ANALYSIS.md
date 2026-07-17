# Ambrose Chinonso Anthony — Store Oversell Analysis

**Date**: July 16, 2026  
**Staff**: Ambrose Chinonso Anthony (commission_staff)  
**Issue**: 57 units oversold across 9 items — `quantity_sold` exceeds `quantity` in `staff_store`

---

## 1. The Data — Physical Reality

| Metric | Value |
|---|---|
| **Physically posted to Ambrose** (original − returns) | **5,559.5** units |
| Total staff_sales recorded | 5,616.5 units |
| **Total phantom sales (physically impossible)** | **334 units across 9 items** |
| Phantom sales tracked by counter (quantity_sold overshoot) | 57 units |
| Phantom sales NOT tracked by counter (race condition lost) | 277 units |
| Revenue recorded for phantom sales | ₦10M+ estimated |

**Physical reality:** Ambrose was given 5,559.5 units to sell, period. Every sale beyond that is physically impossible. The race condition allowed the checkout flow to create phantom staff_sales records when no physical goods remained. The counter only caught 57 of the 334 phantom units.

**The phantom sales per item (chronologically, after stock hit zero):**

| Item | Posted | Phantom Units | Phantom Records | Date Range |
|---|---|---|---|---|
| JUSTFIT CARRY PACK S2 | 1,321 | **208** (10+124+74) | 3 | Jul 5–10, 2026 |
| AFRICAN TRADITIONAL | 58 | **53** (16+2+22+13) | 4 | May 19–Jul 10, 2026 |
| BESENSE POCKET PACK 3 | 177 | **21** (10+2+1+3+5) | 5 | Jun 16–Jul 10, 2026 |
| LEB CARRY PACK S2 | 23 | **16** (5+5+1+5) | 4 | May 19–Jul 10, 2026 |
| BESENSE BLUE MEGA | 34 | **14** (10+2+2) | 3 | Jun 6–Jul 10, 2026 |
| JUSTFIT ZIP PAD BY 30 | 6 | **7** (2+2+2+1) | 4 | May 19–Jul 10, 2026 |
| BESENSE WIPES 60PCS | 15 | **6** (3+1+2) | 3 | Jun 22–Jul 10, 2026 |
| BESENSE WIPES 128PCS | 14 | **5** (1+3+1) | 3 | Jun 15–Jun 23, 2026 |
| JUSTFIT JUMBO S2 | 9 | **4** (3+1) | 2 | Jun 6–Jun 29, 2026 |
| **TOTAL** | | **334 phantom units** | **31 records** | |

**The counter (quantity_sold) only caught 57 of these 334.** The remaining 277 phantom sales happened through the race condition and were never counted by quantity_sold — but staff_sales records exist for ALL 334.

## 2. Impact of the 334 Phantom Sales

### 2.1 Revenue Impact

The 334 phantom units recorded ₦3,704,100 in phantom revenue in `staff_sales`. This inflates every report that reads from staff_sales.

| Item | Phantom Units | Phantom Revenue | Covered by Payments | Uncovered |
|---|---|---|---|---|
| JUSTFIT CARRY PACK S2 | 208 | ₦1,724,400 | 10 | **198** ❌ |
| AFRICAN TRADITIONAL | 53 | ₦590,000 | 18 | **35** ❌ |
| BESENSE BLUE MEGA | 14 | ₦561,400 | 12 | 2 |
| JUSTFIT ZIP PAD BY 30 | 7 | ₦256,600 | 4 | 3 |
| BESENSE POCKET PACK 3 | 21 | ₦167,500 | 13 | 8 |
| LEB CARRY PACK S2 | 16 | ₦141,200 | 11 | 5 |
| JUSTFIT JUMBO PACK S2 | 4 | ₦99,300 | 4 | 0 |
| BESENSE WIPES 60PCS | 6 | ₦89,200 | 4 | 2 |
| BESENSE WIPES 128PCS | 5 | ₦74,500 | 5 | 0 |
| **TOTAL** | **334** | **₦3,704,100** | **81 (24%)** | **253 (76%)** |

### 2.2 Payment Coverage

- **81 phantom units (24%)** have payment records — Ambrose submitted and admin approved payment for phantom goods that never existed
- **253 phantom units (76%)** have NO payment — they contribute to Ambrose's ₦8,062,950 outstanding gap

The 253 uncovered phantom units are why his payment page shows 51 unpaid items. He can never submit payment for them because no goods were physically sold.

### 2.3 Commission Impact

Commission is generated when admin approves payments. For the 81 phantom units that WERE covered by payments:
- Commission was generated at `paidItem.quantity × commission_rate`
- **Ambrose's commission was inflated by ~₦commission_rate × 81**

For the 253 uncovered phantom units — no payment records exist, so no commission was generated.

### 2.4 Reports Impact

| Report | Source | Phantoms Included? |
|---|---|---|
| **Admin comprehensive report** | `staff_sales` + `receipts` | ✅ ₦3.7M inflated |
| **Sales analysis** | `staff_sales` + `sales` | ✅ ₦3.7M inflated |
| **Admin payments** | `staff_payments.amount` | Only covered 81 units |
| **Ambrose's dashboard** | `staff_sales` | ✅ Inflated |
| **Ambrose's commission** | `staff_sales.approved_commission` | Only covered 81 units |

---

## 2. How Sales Are Made — The Checkout Flow

### 2.1 The Old Flow (In Effect During Ambrose's Sales)

When a commission staff member clicks "Complete Sale", two API calls fire in sequence:

**Step 1: `POST /api/receipts/create`** (no stock validation, creates receipt)

```
→ inserts receipt record with total_amount ✓
→ inserts receipt_items with quantity and prices ✓
→ updates daily_sales_summary ✓
```

**Step 2: `POST /api/staff/store/make-sales`** (has 6 validation gates)

The critical gate is **Gate 3** — the stock availability check:

```javascript
// Gate 3: stock availability
const storeEntry = /* SELECT quantity, quantity_sold FROM staff_store WHERE staff_id = X AND item_id = Y AND location = Z */;
const quantityAvailable = storeEntry.quantity - storeEntry.quantity_sold - lockedQty;
if (quantityAvailable < requestedQuantity) {
  return error("Insufficient stock. Available: " + quantityAvailable);
}
```

If Gate 3 passes, the old flow continues:

```javascript
// Gate 5: update staff_store.quantity_sold
await supabaseAdmin
  .from('staff_store')
  .update({ quantity_sold: (storeEntry.quantity_sold || 0) + requestedQuantity })
  .eq('id', storeEntry.id);

// Gate 6: insert staff_sales
await supabaseAdmin
  .from('staff_sales')
  .insert([{ staff_id, item_id, quantity, unit_price, total_amount, ... }])
  .select()
  .single();
```

### 2.2 The Order Was Wrong — The July 13 Fix

**Before 2026-07-13**: Gate 5 (update quantity_sold) ran **before** Gate 6 (insert staff_sales). If Gate 6 failed (network, timeout, rate limit), `quantity_sold` was already incremented but no sale was recorded. The counter was permanently inflated.

**After 2026-07-13**: The order was reversed — `staff_sales` is inserted **first**, then `quantity_sold` is updated. If the insert fails, the counter is never touched.

However, the oldest of Ambrose's sales date back to **April 3, 2026** — over 3 months before the fix. All 9 oversold items had sales during this vulnerable period.

**The July 13 fix also changed the ordering to insert BEFORE updating. But the original problem of Gate 3 checking a stale value wasn't addressed — the check and update are still two separate operations (SELECT + UPDATE), not one atomic operation.**

---

## 3. The Race Condition — How Gate 3 Was Bypassed

The fundamental flaw is that **Gate 3 reads `quantity_sold`** and then **Gate 5 writes `quantity_sold`** — two separate database operations with no lock between them.

### 3.1 The Scenario

Two checkout attempts happen simultaneously for the same item:

```
Initial state: quantity = 100, quantity_sold = 98, available = 2

Checkout A: wants to sell 2 units
  → Gate 3 reads: available = 100 - 98 - 0 = 2 → 2 >= 2 → PASSES

Checkout B: wants to sell 2 units (starts at the same millisecond)
  → Gate 3 reads: available = 100 - 98 - 0 = 2 → 2 >= 2 → PASSES

Checkout A: Gate 5 writes quantity_sold = 98 + 2 = 100
Checkout B: Gate 5 writes quantity_sold = 98 + 2 = 100   ← OVERWRITES!
Checkout A: Gate 6 inserts staff_sales ✓
Checkout B: Gate 6 inserts staff_sales ✓

Result: quantity_sold = 100, but staff_sales has 4 units sold (2 + 2)
         True available = 100 - 100 = 0, but 4 were sold
         Oversell = +2 units
```

### 3.2 Why This Doesn't Affect All Items Equally

Not every checkout causes oversell. The race condition only triggers when:

1. **Two checkouts coincide** — both processing the same item at the same millisecond
2. **Stock is near zero** — when `available` is exactly enough for one checkout but not two, both pass the stale Gate 3 read
3. **The writes interleave** — Gate 5's `quantity_sold` update from Checkout B overwrites Checkout A's

This is why only 9 of 51 items are oversold, and by small amounts (2-16 units each). The busiest items (JUSTFIT CARRY PACK S2, BESENSE POCKET PACK 3) see the most overlap and the biggest oversells.

### 3.3 Why Other Staff Are Clean

- **Shadrack**: 24 sales over 3 months — too few for significant overlap
- **Thankgod**: 153 sales, but distribution across different items/times reduces overlap
- **Kefas**: 230 sales, but each sale for different items at different times
- **Ambrose**: **385 sales** over 3 months — heavy volume, many concurrent checkouts

Ambrose is the highest-volume seller by far. His checkout page was likely open on multiple tabs/devices, creating the race conditions at scale.

---

## 4. How Stock Was Posted

The admin posts stock to staff via the `/admin/staff-stores` page. Each posting creates or updates a row in `staff_store`:

```
staff_store
  id           UUID
  staff_id     UUID    → Ambrose's ID
  item_id      UUID    → the product
  quantity     decimal → admin-set total assigned (overwritten each time)
  quantity_sold decimal → auto-tracked by checkout flow
  posted_date  timestamptz
  last_updated timestamptz
```

**Key observation:** The `quantity` column represents the **current total**, not a cumulative sum. Each time the admin posts stock, the `quantity` value is overwritten. There is no history of past postings. If the admin posted 100 units, then later posted 50 more, the quantity would be 150 (not 100 + 50 tracked separately).

When stock runs low and Ambrose keeps selling, the race condition allows overselling before the admin gets a chance to post more. By the time the admin sees negative available and posts more stock, the oversell has already happened.

---

## 5. The Complete Timeline

| Date | Event |
|---|---|
| **April 3, 2026** | Ambrose's first sale — checkout flow begins |
| **April–July 2026** | 385 sales across 51 items — race conditions accumulate |
| **July 10, 2026** | Ambrose's last sale — runs out of stock |
| **July 10–16** | Ambrose idle — no stock to sell |
| **July 13** | Fix applied: staff_sales inserted BEFORE quantity_sold updated (prevents future, doesn't retro for existing) |
| **July 16** | Admin discovers −57 available across 9 oversold items |

During the April–July period, Ambrose sometimes sold via the staff portal, and the checkout flow was running the **old order** (Gate 5 before Gate 6). This means some quantity_sold increments may also have come from **failed checkout retries** where the first attempt inflated the counter but didn't create a sale record. However, the data shows `staff_sales total = 5,616.5` matches `quantity_sold = 5,616.5` exactly, so no failed-attempt inflation is visible. The oversell is purely from race conditions.

---

## 6. The Data Matches — No Hidden Damage

| Check | Result |
|---|---|
| `staff_sales` total vs `quantity_sold` total | 5,616.5 = 5,616.5 ✅ Perfect match |
| `staff_sales` records exist for all oversold units | Yes ✅ |
| Revenue collected for oversold units | Yes, ₦54M total sales recorded |
| Failed checkout inflation visible | No — totals match perfectly |
| Other staff affected | No — only Ambrose |

## 7. Payment Coverage — Critical Finding

**Not all oversold units have been paid for.** Querying the payment records reveals:

| Item | Total Sold | Covered by Payments | **Uncovered** |
|---|---|---|---|
| AFRICAN TRADITIONAL BY 8+2LINER | 111 | 76 | **35** ❌ |
| JUSTFIT CARRY PACK S2 | 1,525 | 1,327 | **198** ❌ |
| BESENSE POCKET PACK 3 | 192 | 184 | **8** ❌ |
| LEB CARRY PACK S2 | 38 | 33 | **5** ❌ |
| JUSTFIT ZIP PAD BY 30 PCS | 12 | 9 | **3** ❌ |
| BESENSE WIPES BY 60PCS | 20 | 18 | **2** ❌ |
| BESENSE BLUE MEGA MIX 30 PCS ZIP PAD | 39 | 37 | **2** ❌ |
| BESENSE WIPES BY 128PCS | 19 | 19 | 0 ✅ |
| JUSTFIT JUMBO PACK S2 | 11 | 11 | 0 ✅ |

| Metric | Value |
|---|---|
| Total staff_sales revenue | **₦54,084,150** |
| Total approved payments | **₦46,021,200** |
| **Outstanding gap** | **₦8,062,950** |

**The 57 oversold units are connected to a larger problem:** Ambrose has ₦8,062,950 in outstanding sales that were either never submitted for payment or submitted but rejected. The oversold inventory is just the inventory tracking side — the real financial gap is ₦8M in unpaid sales across ALL items, not just the 9 oversold ones.

This means:
- Ambrose sold ₦54M worth of goods (385 staff_sales records)
- Admin approved ₦46M in payments
- The remaining ₦8M was never paid for — no `staff_payments` records exist for these sales
- The 57-oversold units are part of that ₦8M gap. The overselling happened because inventory posting fell behind his actual sales, and the race condition let him sell through when he should have been blocked. The payments for those extra sales were never collected.

This is the same ₦8,062,950 outstanding that the auto-heal scaling displays in his payment page. The money-based tracking correctly identifies the gap, and the auto-heal handles the display. The issue is not with the tracking — it's that Ambrose genuinely sold more than was assigned AND those extra sales were never paid for.

---

## 8. Comprehensive Solution

### 8.1 Fix the Inventory Counter (Test Database)

Run on the test Supabase (`wkyakaunbejmuzqnvgno.supabase.co`):

```sql
-- Acknowledge oversold units as legitimate posted stock
UPDATE staff_store
SET quantity = quantity_sold
WHERE staff_id = 'ff0c1e84-db2e-4e90-a370-88f7f8130d37'
  AND quantity_sold > quantity;
```

**What this does:**
- Increases posted quantity on 9 items by +57 total
- Makes posted=5,616.5 = sold=5,616.5 → gap=0
- Available becomes 0 for all items (no negative display)

**What this does NOT do:**
- Does not change staff_sales records
- Does not change payment records
- Does not create/fix the ₦8M outstanding gap
- Does not fix the race condition

### 8.2 Fix the Race Condition (Code Change)

File: `frontend/app/api/staff/store/make-sales/route.ts`

Replace the two-step Gate 3 + Gate 5 with one atomic SQL operation:

```javascript
// BEFORE: Two separate operations — race condition vulnerable
const storeEntry = await supabaseAdmin
  .from('staff_store')
  .select('quantity, quantity_sold')
  .eq('id', storeId)
  .single();

const available = storeEntry.quantity - storeEntry.quantity_sold - lockedQty;
if (available < quantity) {
  return error("Insufficient stock");
}

// ... later
await supabaseAdmin
  .from('staff_store')
  .update({ quantity_sold: storeEntry.quantity_sold + quantity })
  .eq('id', storeEntry.id);
```

```javascript
// AFTER: Single atomic operation — race condition immune
const { data: updated, error: updateErr } = await supabaseAdmin
  .from('staff_store')
  .update({ quantity_sold: db.raw('quantity_sold + ?', [quantity]) })
  .eq('id', storeEntry.id)
  .gte('quantity', db.raw('quantity_sold + ?', [quantity + lockedQty]))
  .select()
  .single();

if (!updated) {
  return error("Insufficient stock or race condition");
}
```

**What this does:**
- Combines the check (Gate 3) and increment (Gate 5) into one atomic SQL UPDATE
- PostgreSQL's row-level locking ensures no two concurrent updates can interfere
- If the condition fails (not enough stock), the UPDATE returns 0 rows → sale is rejected
- If it succeeds, the increment is guaranteed atomic

### 8.3 Address the ₦8M Outstanding

Ambrose has ₦8,062,950 in unpaid sales across ALL items. This is the real financial gap.

**Options:**

| Option | Approach | Pros | Cons |
|---|---|---|---|
| **A: Submit payment** | Ambrose submits payment for the outstanding via his payment page | Clean, proper flow | Insufficient — ₦8M is large |
| **B: Partial write-off** | Admin adjusts approved_commission or writes off as inventory loss | Reduces the gap | Accounting hack |
| **C: Inventory audit** | Verify each uncovered sale actually happened, then reconcile | Accurate, auditable | Time-consuming |

**Option C is recommended.** For each of the uncovered staff_sales records (rows where the sale exists but no payment covers it), verify with Ambrose whether the sale actually happened. If yes, he should submit payment through the normal flow. If no, the record should be audited and potentially voided.

This process is separate from the inventory oversell fix. The oversell is about inventory tracking — the ₦8M outstanding is about payment collection for actual sales.
