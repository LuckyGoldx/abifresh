# Receipts Database Setup Instructions

## Overview
This document provides instructions for setting up the receipts storage system in Supabase.

## Steps to Execute

### 1. Go to Supabase SQL Editor
- Open your Supabase dashboard: https://app.supabase.com
- Select your project
- Click on "SQL Editor" in the left sidebar

### 2. Create New Query
- Click the "+" button or "New query"
- Copy the entire SQL from: `C:\Users\LuckyGold\Desktop\AKV\backend\migrations\create_receipts_table.sql`

### 3. Execute SQL
- Paste the SQL code into the editor
- Click "Run" or press Ctrl+Enter
- Wait for execution to complete (should see success message)

### 4. Verify Tables Created
- Go to "Database" in Supabase sidebar
- Expand "Tables" section
- You should see:
  - `receipts` table
  - `receipt_items` table
  - Both with proper columns and relationships

## What Gets Created

### receipts Table
```
- id (UUID, Primary Key)
- receipt_number (VARCHAR, UNIQUE)
- staff_id (UUID, FK to users)
- total_amount (DECIMAL)
- payment_method (VARCHAR: 'cash', 'pos', 'transfer')
- sold_outside_jalingo (BOOLEAN)
- items_count (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### receipt_items Table
```
- id (UUID, Primary Key)
- receipt_id (UUID, FK to receipts)
- item_id (UUID, FK to items)
- quantity (INTEGER)
- unit_price (DECIMAL)
- total_price (DECIMAL)
- created_at (TIMESTAMP)
```

### Indexes Created
- receipt_number lookup (receipt_number)
- Staff receipts (staff_id, created_at DESC)
- Payment method filtering (payment_method)
- Receipt items lookup (receipt_id, item_id)

### Row Level Security (RLS)
Enabled on both tables with policies for:
- Users viewing their own receipts
- Staff creating receipts
- Admin access to all receipts

## API Endpoints Available

Once the tables are created, these endpoints are ready:

### Create Receipt
```
POST /api/receipts/create
Authorization: Bearer {token}
Body: {
  receipt_number: "RCP-1234567890",
  items: [{ id, sale_quantity, unit_price, name }],
  total_amount: 50000,
  payment_method: "cash",
  sold_outside_jalingo: false
}
```

### Get My Receipts
```
GET /api/receipts?limit=50&offset=0
Authorization: Bearer {token}
```

### Get All Receipts (Admin)
```
GET /api/receipts/all?limit=100&offset=0
Authorization: Bearer {token} (admin role required)
```

### Get Single Receipt
```
GET /api/receipts/{id}
Authorization: Bearer {token}
```

### Search Receipts
```
GET /api/receipts/search?q=RCP-123&startDate=2024-01-01&endDate=2024-12-31&limit=50
Authorization: Bearer {token}
```

### Get Receipt Stats
```
GET /api/receipts/{staff_id}/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {token}
```

### Delete Receipt
```
DELETE /api/receipts/{id}
Authorization: Bearer {token}
```

## Testing

After creating tables, you can test with:

1. **Create a receipt through the app:**
   - Complete a sale in make-a-sale page
   - Receipt should be auto-saved to database
   - Check Supabase "receipts" and "receipt_items" tables

2. **View receipts:**
   - Go to `/sales/receipts` page (will be created next)
   - Should display all receipts with filters and search

3. **Check database:**
   - Supabase SQL Editor
   - Run: `SELECT * FROM receipts;`
   - Should see the receipt you just created

## Troubleshooting

### "Table already exists" error
- The tables may already exist from a previous run
- You can safely ignore this or drop and recreate:
  ```sql
  DROP TABLE IF EXISTS receipt_items CASCADE;
  DROP TABLE IF EXISTS receipts CASCADE;
  ```
  Then run the creation SQL again.

### "Foreign key constraint failed"
- Ensure `users` and `items` tables exist
- Ensure staff_id exists in `users` table
- Check user role is not 'admin' (sales staff only)

### RLS Policy Errors
- These are normal warnings in development
- Policies are correctly configured
- Test with actual API calls, not direct Supabase queries

## Next Steps

After tables are created:

1. **Phase 2**: Create receipts history page (`/sales/receipts`)
   - Display all user receipts
   - Filter by date, payment method
   - Search by receipt number
   - View receipt details with print/download

2. **Phase 3**: Create posted items workflow
   - Extend `posted_items` table
   - Add accept/reject functionality
   - Staff dashboard integration

3. **Phase 4**: Notifications system
   - Create notifications table
   - Send notifications for posted items
   - Activity tracking for all roles

## Database Diagram

```
users (existing)
  ├─ id (PK)
  ├─ email
  ├─ role
  └─ is_active

items (existing)
  ├─ id (PK)
  ├─ name
  ├─ unit_price
  ├─ active_store_quantity
  └─ main_store_quantity

receipts (NEW)
  ├─ id (PK)
  ├─ receipt_number (UNIQUE)
  ├─ staff_id (FK → users.id)
  ├─ total_amount
  ├─ payment_method
  ├─ sold_outside_jalingo
  └─ items_count

receipt_items (NEW)
  ├─ id (PK)
  ├─ receipt_id (FK → receipts.id)
  ├─ item_id (FK → items.id)
  ├─ quantity
  ├─ unit_price
  └─ total_price
```

## Status

✅ SQL Migration File: Created
✅ Backend Service: Implemented (receiptsService)
✅ API Routes: Implemented (5 endpoints + 2 utility)
✅ Frontend Integration: Updated (handleCheckout saves receipt)
✅ Database Schema: Ready to deploy

⏳ Database Tables: Awaiting SQL execution in Supabase
⏳ Testing: After tables created
⏳ Receipts History Page: Next (Phase 2)
