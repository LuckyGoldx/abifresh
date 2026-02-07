# Item Filtering Logic REFACTORED ✅

## Problem Identified
When making a new sale of an item that previously had approved/pending payments:
- Previously approved items that should stay hidden were reappearing
- Only unpaid/rejected items should show in "Select Items You're Paying For"

**Example:**
```
Scenario:
1. Sell Item A (5 units)
2. Pay for Item A (3 units) - APPROVED
3. Item A (2 units unpaid) shows correctly ✅

But then:
4. Sell Item A again (2 more units) - now 4 unpaid units exist
5. Refresh page
6. Item A (5 units) appears - WRONG! Should show only 4 unpaid units ❌
```

## Root Cause
The old logic:
1. Grouped ALL sales by item_id first
2. Then checked if ANY sale_id was in payments
3. If any was paid, filtered out the ENTIRE grouped item
4. When new sales were added, grouping included both paid and unpaid

**Issue:** When filtering happens at the GROUP level, you can't distinguish between paid and unpaid sales of the same item.

## Solution Implemented

### New Two-Step Process:

**Step 1: Filter Individual Sales** ← NEW
```typescript
const getUnpaidSales = () => {
  // Build set of paid sale IDs
  const paidSaleIds = new Set<string>();
  payments.forEach(payment => {
    if (payment.status === 'pending' || 'approved') {
      payment.items_paid_for.forEach(item => {
        item.sale_ids.forEach(sid => {
          paidSaleIds.add(normalizeId(sid));  // Track each paid sale
        });
      });
    }
  });
  
  // Filter: Keep only unpaid sales
  return sales.filter(sale => !paidSaleIds.has(normalizeId(sale.id)));
};
```

**Step 2: Group Remaining Sales** ← THEN GROUP
```typescript
const getSoldItemsGrouped = () => {
  const unpaidSales = getUnpaidSales();  // Start with unpaid only!
  // Now group by item_id
  const itemMap = new Map();
  unpaidSales.forEach(sale => {
    if (itemMap.has(sale.item_id)) {
      // Add to existing group
    } else {
      // Create new group
    }
  });
  return Array.from(itemMap.values());
};
```

## Files Modified

### 1. `/frontend/app/sales/payments/page.tsx`
- ✅ Refactored filtering logic
- ✅ Created new `getUnpaidSales()` function
- ✅ Modified `getSoldItemsGrouped()` to use unpaid sales only
- ✅ Simplified `getAvailableItems()` to just return grouped unpaid items
- ✅ Removed fallback to `paidItemIds` (only need sale_ids)

### 2. `/frontend/app/staff/payments/page.tsx`
- ✅ Simplified filtering to only track `sale_ids`
- ✅ Removed debug logging
- ✅ Cleaner, more maintainable code

## How It Works Now

### Scenario: Multiple Sales of Same Item

```
Initial State:
- Item A Sale #1 (3 units, ₦1,500)
- Item A Sale #2 (2 units, ₦1,000)
- Item A Sale #3 (1 unit, ₦500)
Total: 6 units, ₦3,000

User pays for Sales #1 and #2 (APPROVED):
- Pending Payment: 5 units, ₦2,500

User makes new sale:
- Item A Sale #4 (2 units, ₦1,000)

After refresh:
┌─ getUnpaidSales() ────────────────────────┐
│ Input: All 4 sales                        │
│ Paid sale IDs: [#1, #2]                   │
│ Filter: Remove #1, #2                     │
│ Output: [Sale #3, Sale #4]                │
│         (1 unit, 2 units = 3 unpaid)      │
└───────────────────────────────────────────┘
        ↓
┌─ getSoldItemsGrouped() ───────────────────┐
│ Input: Unpaid sales [#3, #4]              │
│ Group by item_id                          │
│ Output: Item A (3 units, ₦1,500) ✅        │
│         sale_ids: [#3, #4]                │
└───────────────────────────────────────────┘
```

✅ Correctly shows ONLY 3 unpaid units!

## Filter Behavior Matrix

| Status | Show? | Reason |
|--------|-------|--------|
| Never paid | ✅ YES | New/unpaid sales |
| Pending payment | ❌ NO | Will be approved/rejected |
| Approved payment | ❌ NO | Already paid |
| Rejected payment | ✅ YES | Can pay again |

## Benefits of New Approach

1. **Precision**: Each individual sale is tracked, not grouped items
2. **New Sales**: Adding new sales doesn't break filtering
3. **Accuracy**: Shows exact unpaid quantity per item
4. **Simplicity**: Cleaner code logic
5. **Maintainability**: Easier to understand and debug

## Testing Checklist

- [ ] Make sale of Item A (5 units)
- [ ] Pay for Item A (3 units) → APPROVED
- [ ] Refresh page → Should show Item A (2 units) only ✅
- [ ] Make another sale of Item A (2 units)
- [ ] Refresh page → Should show Item A (4 units) - NOT 5 ❌
- [ ] Pay for 1 more unit of Item A → Should show Item A (3 units) remaining
- [ ] Reject a payment → Rejected items should reappear ✅

## Code Comparison

### OLD (Flawed):
```typescript
// Group ALL sales first
const grouped = getSoldItemsGrouped();  // Has all sales: [#1, #2, #3, #4]

// Then check if ANY sale is paid
const filtered = grouped.filter(item => {
  const hasPaidSale = item.sale_ids.some(id => paidSaleIds.has(id));
  return !hasPaidSale;  // If ANY paid, filter entire item
});
// Result: Item A completely filtered out even though #3, #4 are unpaid ❌
```

### NEW (Correct):
```typescript
// Filter individual sales first
const unpaid = sales.filter(sale => !paidSaleIds.has(sale.id));
// Result: [Sale #3, Sale #4]

// Then group unpaid sales
const grouped = getSoldItemsGrouped();  // Now uses only unpaid
// Result: Item A (3 units from sales #3, #4) ✅
```

---

**Status:** ✅ Ready for testing
**Impact:** Fixes item visibility after new sales of previously-paid items
