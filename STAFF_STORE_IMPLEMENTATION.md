# Staff Store Implementation Guide

## Overview
The Staff Store feature allows sales staff to post items to commission and non-commission staff. These items are moved from the active store to a staff-specific store, where staff can only sell items that have been posted to them.

## Database Schema Changes

### New Tables Created

1. **staff_store**
   - Tracks items assigned to each staff member
   - Columns: staff_id, item_id, quantity, quantity_sold, quantity_available (calculated)
   - Unique constraint on (staff_id, item_id)

2. **posted_items_mapping**
   - Maps posted items to staff store entries
   - Tracks acceptance/rejection status with timestamps

3. **staff_sales**
   - Records sales made by staff from their store
   - Columns: staff_id, item_id, quantity, unit_price, total_amount, payment_method, etc.

### Modified Tables

- **posted_items**: Added staff_id and unit_price columns
- **items**: Uses existing active_store_quantity column

## Workflow

### 1. Sales Staff Posts Items to Staff

**Endpoint**: `POST /api/sales/post-items`

**Request Format**:
```json
{
  "staff_id": "uuid",
  "items": [
    {
      "item_id": "uuid",
      "quantity": 10,
      "unit_price": 5000
    }
  ]
}
```

**What Happens**:
- Items are deducted from active_store_quantity
- Posted_items entries are created with status "pending"
- Staff receives notification
- Activity is logged

### 2. Staff Receives & Reviews Items

**Page**: `/staff/posted-items`

**Actions**:
- View all items posted to them (pending, accepted, rejected)
- Accept or reject items with optional comments

**Endpoint to Accept**: `POST /api/staff/store/accept-items`
```json
{
  "posted_item_ids": ["uuid1", "uuid2"]
}
```

**What Happens**:
- Creates entries in staff_store table
- Updates posted_items status to "accepted"
- Creates mapping records

### 3. Staff Makes Sales from Store

**Page**: `/staff/make-sale`

**Features**:
- View store inventory with available quantities
- Record sales from items in their store
- Track sales history
- View summary stats

**Endpoint**: `POST /api/staff/store/make-sale`
```json
{
  "item_id": "uuid",
  "quantity": 5,
  "payment_method": "cash"
}
```

**What Happens**:
- Creates entry in staff_sales table
- Updates staff_store quantity_sold
- Automatically calculates quantity_available
- Activity is logged

### 4. Admin Monitors Staff Stores

**Page**: `/admin/staff-stores`

**Features**:
- View all staff with their store inventory
- Summary statistics (total items, quantity, sold, available)
- Sell-through rate percentage for each staff
- View detailed inventory for each staff member
- Search and sort capabilities

**Endpoints**:
- `GET /api/admin/staff-stores` - Get all staff stores summary
- `GET /api/admin/staff-stores/:staffId` - Get specific staff store details
- `GET /api/admin/staff-stores-stats` - Get statistics for all staff

## API Routes

### Sales Routes
- `POST /api/sales/post-items` - Post items to staff (batch)

### Staff Routes (Private)
- `GET /api/staff/store` - Get staff's store inventory
- `GET /api/staff/store/summary` - Get store summary stats
- `POST /api/staff/store/accept-items` - Accept posted items
- `POST /api/staff/store/reject-items` - Reject posted items
- `POST /api/staff/store/make-sale` - Record a sale
- `POST /api/staff/store/make-sales` - Record multiple sales
- `GET /api/staff/store/sales-history` - Get sales history

### Admin Routes (Admin only)
- `GET /api/admin/staff-stores` - Get all staff stores summary
- `GET /api/admin/staff-stores/:staffId` - Get staff store details
- `GET /api/admin/staff-stores-stats` - Get statistics

## Frontend Pages

### Sales Staff
- `/sales/post-items` - Post items to staff (updated with batch support)

### Commission/Non-Commission Staff
- `/staff/posted-items` - View and accept/reject posted items
- `/staff/make-sale` - Make sales from their store

### Admin
- `/admin/staff-stores` - Monitor all staff stores

## Inventory Flow

```
Active Store (sales access)
    |
    ├─ Items Posted to Staff
    │
    ↓
Posted Items (staff review)
    |
    ├─ Accept → Staff Store
    │ 
    ├─ Reject → Back to Active Store
    │
    ↓
Staff Store (staff can only sell from here)
    |
    ├─ Staff Makes Sale
    │
    ↓
Removed from Staff Store (quantity_sold incremented)
```

## Testing Checklist

### 1. Database Setup
- [ ] Run STAFF_STORE_MIGRATION.sql in Supabase
- [ ] Verify staff_store table created
- [ ] Verify posted_items_mapping table created
- [ ] Verify staff_sales table created

### 2. API Testing

**Test Posting Items**:
- [ ] Login as sales staff
- [ ] Create batch post with multiple items
- [ ] Verify items deducted from active_store_quantity
- [ ] Verify posted_items created with correct staff_id

**Test Accepting Items**:
- [ ] Login as commission staff
- [ ] Accept items from posting
- [ ] Verify staff_store entries created
- [ ] Verify quantity_available calculated correctly

**Test Staff Sales**:
- [ ] Login as staff
- [ ] Record sale from staff_store
- [ ] Verify quantity_sold incremented
- [ ] Verify staff_sales entry created

**Test Admin Dashboard**:
- [ ] Login as admin
- [ ] Navigate to /admin/staff-stores
- [ ] Verify summary statistics
- [ ] Click view on staff member
- [ ] Verify detailed inventory displayed

### 3. Frontend Testing

**Post Items Page**:
- [ ] Search items works
- [ ] Staff dropdown populated
- [ ] Add items to cart works
- [ ] Quantity adjustment works
- [ ] Submit posts items correctly

**Posted Items Page**:
- [ ] View pending items
- [ ] Accept items with comment
- [ ] Reject items with comment
- [ ] Verify status updates

**Make Sale Page**:
- [ ] Store items display correctly
- [ ] Quantity available correct
- [ ] Can record sale
- [ ] Sales history updates

### 4. Data Validation

**Quantity Constraints**:
- [ ] Cannot post more than active_store_quantity
- [ ] Cannot sell more than staff store quantity_available
- [ ] quantity_available = quantity - quantity_sold
- [ ] When all items sold, quantity_available = 0

**Role-Based Access**:
- [ ] Sales staff can post items
- [ ] Commission/non-commission staff see their store
- [ ] Admin can view all stores
- [ ] Staff cannot see other staff's store

### 5. Notifications & Logging

- [ ] Staff receive notification when items posted
- [ ] Staff receive notification when items accepted
- [ ] Activity logs created for all operations
- [ ] Timestamps recorded correctly

## Troubleshooting

### Items not appearing in staff store
- Check if staff accepted the items
- Verify posted_items status = "accepted"
- Check staff_store table for entries

### Quantity calculations off
- Verify quantity_available is calculated correctly
- Check if quantity_sold is being incremented
- Review staff_sales entries

### Admin dashboard shows no data
- Verify staff_store has entries
- Check if query is filtering correctly
- Verify admin role on user

### Sales failing
- Verify quantity_available > 0
- Check if item_id is valid
- Verify staff has accepted items

## Performance Considerations

1. **Queries**: Uses indexes on staff_id, item_id, and posted_date
2. **Materialized Columns**: quantity_available is GENERATED ALWAYS
3. **Batch Operations**: Supports multiple items in single request
4. **RLS Policies**: Each user can only see their own data

## Future Enhancements

1. Bulk approve/reject for admin
2. Export staff store inventory as CSV
3. Staff store performance analytics
4. Automated restock alerts
5. Commission calculation based on staff sales
6. Multi-location support
