# 📊 Staff Posted Items System - Quick Start Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    POSTED ITEMS FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  SALES STAFF              POSTED ITEMS             STAFF MEMBER │
│  ┌──────────┐             DATABASE                 ┌──────────┐ │
│  │          │                                      │          │ │
│  │ 1. Post  ├──────────────────────────────────────┤ 1. View  │ │
│  │   Items  │  Status: pending                     │  Posted  │ │
│  │ to Staff │  Quantity: X                         │  Items   │ │
│  │          │                                      │          │ │
│  └──────────┘   ┌──────────────────────────────┐   └──────────┘ │
│                 │  posted_items TABLE          │                 │
│                 │  • id                        │    ┌──────────┐ │
│                 │  • item_id                   │    │          │ │
│                 │  • quantity                  ├────┤ 2. Accept│ │
│  ┌──────────┐   │  • status (pending →        │    │   or     │ │
│  │          │   │   accepted → sold)          │    │ Reject   │ │
│  │ View     ├───┤  • sales_person_id          │    │          │ │
│  │ Posting  │   │  • receiver_staff_id        │    └──────────┘ │
│  │ History  │   │  • created_at               │                 │
│  │          │   └──────────────────────────────┘    ┌──────────┐ │
│  └──────────┘                                       │          │ │
│                                                      │ 3. Make  │ │
│                                                      │   Sales  │ │
│                                                      │ (quantity│ │
│                                                      │ decreases)
│                                                      │          │ │
│                                                      └──────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Page Access URLs

### Sales Staff
```
http://localhost:3000/sales/post-items-to-staff

Features:
  ✓ Select staff member (commission/non-commission)
  ✓ Select item from inventory
  ✓ Enter quantity to post
  ✓ Add notes
  ✓ View posting history
  ✓ See acceptance status
```

### Staff Members
```
AVAILABLE ITEMS PAGE:
http://localhost:3000/staff/available-items

Features:
  ✓ View posted items (pending, accepted, rejected)
  ✓ Accept items
  ✓ Reject items with reason
  ✓ See total accepted quantity
  ✓ Quick link to make sales

─────────────────────────────────────

MAKE SALE PAGE:
http://localhost:3000/staff/make-sale

Features:
  ✓ Dropdown of accepted items only
  ✓ Enter quantity to sell
  ✓ Choose payment method
  ✓ Select buyer type
  ✓ Add buyer name (optional)
  ✓ See real-time total amount
  ✓ View sales history
  ✓ See available quantity (updates live)
```

## Database Tables

### posted_items (Main Table)
```
Column              Type      Purpose
──────────────────────────────────────────────────────
id                  UUID      Primary Key
sales_person_id     UUID      Who posted (Foreign Key: users)
receiver_staff_id   UUID      Who received (Foreign Key: users)
item_id             UUID      Item details (Foreign Key: items)
quantity            INTEGER   How many posted
status              VARCHAR   pending | accepted | rejected | sold
notes               TEXT      Notes from sales staff
staff_comment       TEXT      Reason if rejected
created_at          TIMESTAMP When posted
updated_at          TIMESTAMP Last update
```

### Related Tables
```
items               - Item catalog (name, price, category)
users               - Staff members (full_name, email, role)
sales               - Recorded sales (created from posted items)
notifications       - Alerts when items posted
```

## Workflow Steps

### Step 1: Sales Posts Items
```
POST /api/staff/post-items-to-staff
{
  "staff_id": "uuid-of-staff",
  "item_id": "uuid-of-item",
  "quantity": 10,
  "notes": "High demand item"
}

Response: ✓ Success + notification sent to staff
```

### Step 2: Staff Accepts Items
```
POST /api/staff/posted-items/:id/accept

Response: Status changes from pending → accepted
Notification: Items now available to sell
```

### Step 3: Staff Makes Sale
```
POST /api/staff/make-sale-from-posted
{
  "posted_item_id": "uuid-of-posted-item",
  "quantity": 5,
  "payment_method": "cash",
  "buyer_type": "retail",
  "buyer_id": "customer-name"
}

Response: ✓ Sale recorded + quantity updated
Updates: posted_item.quantity = 10 - 5 = 5
```

### Step 4: Inventory Tracking
```
Quantity Flow:
Posted Qty: 10
After Sale 1 (5 items): 5 remaining
After Sale 2 (5 items): 0 remaining → Status = "sold"
```

## Status Codes & Meanings

### posted_items Status
```
pending   → Waiting for staff to accept/reject
accepted  → Staff approved, ready to sell
rejected  → Staff refused
sold      → All items sold (quantity = 0)
```

### HTTP Status Codes
```
201 Created     → Successfully posted/sold items
400 Bad Request → Missing fields or validation error
404 Not Found   → Item/posted item doesn't exist
200 OK          → Successfully fetched data
```

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| No items in dropdown | Post items first, then refresh |
| Can't accept items | Refresh page or check permissions |
| Sale not recording | Check quantity is ≤ available, item is accepted |
| Staff not in list | Verify staff has correct role (commission/non-commission_staff) |
| Wrong quantity showing | Refresh page or check database for consistency |

## Testing Scenarios

### Scenario 1: Basic Flow (5 mins)
1. Login as sales staff
2. Post 10 items to a staff member
3. Logout and login as that staff member
4. Accept the items
5. Go to make-sale page
6. Make a sale of 3 items
7. Verify quantity is now 7

### Scenario 2: Multiple Sales (10 mins)
1. Post 5 different items to staff
2. Staff accepts all items
3. Staff makes 2 sales from different items
4. Check sales history shows both sales
5. Check available-items shows quantities updated

### Scenario 3: Rejection Flow (5 mins)
1. Post items to staff
2. Staff rejects with reason
3. Check rejected items show with reason
4. Verify they don't appear in available-items for selling

### Scenario 4: Inventory Exhaustion (5 mins)
1. Post 3 items to staff
2. Staff accepts all 3
3. Staff makes 1 sale of 3 items
4. Check status changes to "sold"
5. Verify item disappears from available-items

## Database Queries (for debugging)

```sql
-- See all posted items
SELECT * FROM posted_items ORDER BY created_at DESC;

-- See items posted to specific staff
SELECT * FROM posted_items 
WHERE receiver_staff_id = 'staff-uuid'
ORDER BY created_at DESC;

-- See all accepted items ready to sell
SELECT * FROM posted_items 
WHERE receiver_staff_id = 'staff-uuid' 
AND status = 'accepted'
ORDER BY created_at DESC;

-- See sales made from posted items
SELECT * FROM sales 
WHERE sales_person_id = 'staff-uuid'
ORDER BY created_at DESC;

-- See quantity tracking
SELECT item_id, quantity, status 
FROM posted_items
ORDER BY item_id;
```

## Performance Notes

✅ All endpoints have database indexes for:
- `posted_items(receiver_staff_id, status)` → Fast staff lookups
- `sales(sales_person_id)` → Fast sales history
- Real-time quantity updates

✅ Optimizations included:
- Batch API calls in frontend
- Notification creation on post
- Automatic status change on quantity = 0

## Security Features

✅ Implemented:
- Only staff can see items posted to them (`receiver_staff_id` check)
- Only sales staff can post items
- Only staff can accept/reject their items
- Only staff can make sales from their accepted items
- All requests require authentication

---

**Last Updated:** January 27, 2026
**Status:** ✅ Ready for Production Testing
