# 💰 Commission Feature - Quick Reference

## What Was Done ✅

### Commission Tracking System
- Created **commission card** for commission staff dashboard
- Calculates **total commission** from all sales
- Commission stored in `staff_sales.commission` per sale
- **Only commission staff** see the commission card

---

## Quick Facts

| Aspect | Details |
|--------|---------|
| **Who Sees It** | Only commission staff (role: `commission_staff` or `staff_commission`) |
| **What's Shown** | Total commission earned from ALL sales |
| **Card Color** | Orange (TrendingUp icon) |
| **Position** | Last card in stats grid |
| **Calculation** | `SUM(item.commission × quantity)` for all sales |
| **Data Storage** | `staff_sales.commission` column |
| **Update Timing** | Real-time on sale + dashboard refresh |

---

## Visual Preview

### Commission Staff Dashboard
```
┌─────────────────────────────────────────┐
│ Staff Dashboard                          │
│ Welcome, John Doe (Commission Staff)    │
├─────────────────────────────────────────┤
│                                         │
│ 📊 Stats Grid (4 columns on desktop)    │
│                                         │
│ ┌──────────┬──────────┬──────────────┐  │
│ │ Today's  │ Today's  │ Total Sales  │  │
│ │ Sales    │ Sales    │ Amount       │  │
│ │ ₦ 15,000 │ 5 items  │ ₦ 125,000   │  │
│ │ 🟢       │ 🛒       │ 💵          │  │
│ └──────────┴──────────┴──────────────┘  │
│                                         │
│ ┌──────────┬──────────┬──────────────┐  │
│ │ Total    │ Approved │ Commission   │  │
│ │ Items    │ Payments │ (NEW!) ✨    │  │
│ │ 25 items │ ₦ 50,000 │ ₦ 2,500      │  │
│ │ 📦       │ ✅       │ 📈          │  │
│ └──────────┴──────────┴──────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Non-Commission Staff Dashboard
```
┌─────────────────────────────────────────┐
│ Staff Dashboard                          │
│ Welcome, Jane Doe (Non-Commission Staff)│
├─────────────────────────────────────────┤
│                                         │
│ 📊 Stats Grid (4 columns on desktop)    │
│                                         │
│ ┌──────────┬──────────┬──────────────┐  │
│ │ Today's  │ Today's  │ Total Sales  │  │
│ │ Sales    │ Sales    │ Amount       │  │
│ │ ₦ 15,000 │ 5 items  │ ₦ 125,000   │  │
│ │ 🟢       │ 🛒       │ 💵          │  │
│ └──────────┴──────────┴──────────────┘  │
│                                         │
│ ┌──────────┬──────────────────────────┐ │
│ │ Total    │ Approved Payments        │ │
│ │ Items    │                          │ │
│ │ 25 items │ ₦ 50,000 ✅              │ │
│ │ 📦       │                          │ │
│ └──────────┴──────────────────────────┘ │
│                                         │
│ (NO COMMISSION CARD)                   │
│                                         │
└─────────────────────────────────────────┘
```

---

## How Commission is Earned

### Step 1: Setup (Admin configures items)
```
Item: Banana
├─ Unit Price: ₦100
├─ Commission: ₦10 per unit  ← Admin sets this
└─ Quantity in stock: 1000
```

### Step 2: Sale is made (Commission staff sells)
```
Commission Staff makes a sale:
- Item: Banana
- Quantity: 5 units
- Price: ₦100 × 5 = ₦500 total
- Commission earned: ₦10 × 5 = ₦50 ✓
```

### Step 3: Dashboard shows total
```
Total Commission Card:
- Shows: ₦50 (from this sale)
- Plus any other commissions from other sales
- Continuously updates as more sales are made
```

---

## Example Transaction

### Scenario: Commission Staff Makes Multiple Sales

```
Sale 1:
├─ Item: Banana (commission ₦10/unit)
├─ Quantity: 5
└─ Commission: ₦50

Sale 2:
├─ Item: Orange (commission ₦15/unit)
├─ Quantity: 3
└─ Commission: ₦45

Sale 3:
├─ Item: Apple (commission ₦8/unit)
├─ Quantity: 10
└─ Commission: ₦80

━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL COMMISSION: ₦175 ✓
(Shown in dashboard commission card)
```

---

## Database Peek

### staff_sales Table Structure
```
id              | UUID
staff_id        | UUID → users.id
item_id         | UUID → items.id
quantity        | INT         (e.g., 5)
unit_price      | DECIMAL     (e.g., 100.00)
total_amount    | DECIMAL     (e.g., 500.00)
commission      | DECIMAL     ← NEW! (e.g., 50.00)
payment_method  | VARCHAR
sale_date       | TIMESTAMP
receipt_number  | VARCHAR
...
```

### Query for Staff Commission Total
```sql
SELECT 
  SUM(commission) AS total_commission
FROM staff_sales
WHERE staff_id = 'commission-staff-uuid'
AND commission > 0;
```

---

## Test Credentials

### Commission Staff
- **Email:** staff.comm@abifresh.com
- **Password:** StaffComm@123456
- **Role:** commission_staff
- **Dashboard:** `/staff/dashboard` ← See commission card

### Non-Commission Staff
- **Email:** staff@abifresh.com
- **Password:** Staff@123456
- **Role:** staff_non_commission
- **Dashboard:** `/staff/dashboard` ← NO commission card

---

## Checklist for First Use

- [ ] Run migration: `add_commission_to_staff_sales.sql`
- [ ] Restart backend
- [ ] Clear browser cache
- [ ] Login as commission staff
- [ ] See commission card (should show ₦0 initially)
- [ ] Make a sale
- [ ] Refresh dashboard
- [ ] Commission card should increase 🎉

---

## Common Questions

**Q: How does commission increase?**
A: Each sale by commission staff automatically adds to total = item.commission × quantity

**Q: Why don't non-commission staff see the card?**
A: Card is hidden with condition: `{dashboard?.is_commission_staff && <CommissionCard />}`

**Q: Can commission staff transfer commission to payments?**
A: Not yet - that's an enhancement for future (staff_payments integration)

**Q: Where is commission stored?**
A: In `staff_sales.commission` column (stored per sale, summed for dashboard)

**Q: Is commission real-time?**
A: Yes! Updated immediately when sale is recorded, visible after dashboard refresh

---

## Support Commands

### Check if items have commission
```bash
curl http://localhost:3001/api/admin/items | grep commission
```

### Verify staff role
```bash
curl http://localhost:3001/api/staff/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check sales with commission
```sql
SELECT * FROM staff_sales 
WHERE commission > 0 
LIMIT 5;
```

---

**Status:** 🟢 Ready to Deploy
