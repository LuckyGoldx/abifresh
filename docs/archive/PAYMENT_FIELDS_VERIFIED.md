# ✅ PAYMENT FIELDS VERIFICATION

## Frontend Fields Submitted (from /sales/payments & /staff/payments)

**FormData fields sent to backend:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | string/number | ✅ YES | Payment amount |
| `staff_name` | string | ✅ YES | Staff member name |
| `items_paid_for` | JSON array | ✅ YES | Items with qty/amount |
| `reference_number` | string | ⚠️ OPTIONAL | Bank transfer reference |
| `payment_method` | string | ✅ YES | cash/online/bank_deposit/pos |
| `notes` | string | ⚠️ OPTIONAL | Additional notes |
| `receipt` | File | ✅ YES | Receipt image/file |

---

## Backend Processing

**What backend does with these fields:**

```typescript
// Extracts from request:
const { amount, items_paid_for, reference_number, payment_method, notes } = req.body;

// Gets from file upload:
receipt_url = upload to /payments bucket

// Gets from auth user:
staff_id, staff_name, staff_email, staff_phone

// Inserts into staff_payments table:
{
  staff_id,
  staff_name,
  staff_email,
  staff_phone,
  amount,
  payment_type: 'other',
  payment_method,
  status: 'pending',
  reference_number,
  receipt_url,
  items_paid_for,
  notes,
  requested_date
}
```

---

## Database Column Mapping

**All fields have corresponding columns:**

| Frontend Field | Backend Variable | DB Column | Type | Status |
|---|---|---|---|---|
| amount | amount | amount | DECIMAL | ✅ |
| staff_name | staff_name | staff_name | VARCHAR | ✅ |
| items_paid_for | items_paid_for | items_paid_for | JSONB | ✅ |
| reference_number | reference_number | reference_number | VARCHAR | ✅ |
| payment_method | payment_method | payment_method | VARCHAR | ✅ |
| notes | notes | notes | TEXT | ✅ |
| receipt (file) | receipt_url | receipt_url | TEXT | ✅ |
| (auto) | staff_id | staff_id | UUID | ✅ |
| (auto) | status | status | VARCHAR | ✅ |
| (auto) | payment_type | payment_type | VARCHAR | ✅ |
| (auto) | requested_date | requested_date | TIMESTAMP | ✅ |

---

## Additional Columns (for admin workflow)

| Column | Purpose | Auto-Set | Status |
|---|---|---|---|
| approval_date | When admin approved | ✅ | ✅ |
| rejection_reason | Why rejected | ✅ | ✅ |
| created_at | Record creation time | ✅ | ✅ |

---

## ✨ Everything Verified

✅ All 7 frontend fields have database columns
✅ All required fields are marked mandatory
✅ Optional fields (reference_number, notes) can be NULL
✅ Receipt file uploads to /payments bucket
✅ Staff info auto-captured from auth user
✅ Timestamps auto-set by backend
✅ Status defaults to 'pending'

**Status:** READY FOR TESTING ✅
