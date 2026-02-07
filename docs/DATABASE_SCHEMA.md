# Database Schema Documentation

## Complete Schema Reference

### 1. Users Table

Stores user accounts and role information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'sales', 'staff_commission', 'staff_non_commission')),
    is_active BOOLEAN DEFAULT TRUE,
    store_location TEXT DEFAULT 'Jalingo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id` - References Supabase auth.users
- `email` - Unique email address
- `full_name` - User's full name
- `role` - One of four roles
- `is_active` - Account status
- `store_location` - Where user is based
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
```sql
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
```

---

### 2. Items Catalog

Product/item information with pricing and commission.

```sql
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id` - Unique item identifier
- `name` - Product name
- `category` - Product category
- `base_price` - Base selling price (Jalingo)
- `commission_amount` - Commission when sold
- `is_available` - Availability status
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

---

### 3. Inventory - Main Store

Master inventory in the main warehouse.

```sql
CREATE TABLE inventory_main_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id)
);
```

**Purpose:** Tracks total inventory in main warehouse  
**Unique Constraint:** One record per item (use UPDATE, not INSERT)

---

### 4. Inventory - Active Store

Selling inventory in the active store.

```sql
CREATE TABLE inventory_active_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id)
);
```

**Purpose:** Tracks inventory available for sales  
**Flow:** Items moved from main_store → active_store for selling

---

### 5. Sales Transactions

All sales records with payment information.

```sql
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_person_id UUID NOT NULL REFERENCES users(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'pos', 'transfer')),
    buyer_type TEXT NOT NULL CHECK (buyer_type IN ('customer', 'staff')),
    buyer_id UUID REFERENCES users(id),
    store_location TEXT DEFAULT 'Jalingo',
    receipt_reference TEXT,
    is_printed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `unit_price` - Price applied (base_price or base_price + logistics)
- `total_amount` - quantity × unit_price
- `payment_method` - Cash, POS, or Transfer
- `buyer_type` - Customer or Staff
- `buyer_id` - Reference to buyer if staff
- `store_location` - Where sale occurred
- `receipt_reference` - Receipt number for printed receipts

**Indexes:**
```sql
CREATE INDEX idx_sales_person_id ON sales(sales_person_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
```

---

### 6. Daily Sales Summary

Aggregated daily sales (resets at 12 AM).

```sql
CREATE TABLE daily_sales_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_date DATE DEFAULT CURRENT_DATE,
    sales_person_id UUID NOT NULL REFERENCES users(id),
    total_items_sold INTEGER DEFAULT 0,
    total_amount_sold DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sales_date, sales_person_id)
);
```

**Purpose:** Fast access to today's sales totals  
**Reset:** Daily at 12:00 AM UTC

---

### 7. Posted Items

Items posted from sales to staff for further sales.

```sql
CREATE TABLE posted_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_person_id UUID NOT NULL REFERENCES users(id),
    receiver_staff_id UUID NOT NULL REFERENCES users(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Status Flow:**
- `pending` - Awaiting staff acceptance
- `accepted` - Staff accepted, can sell
- `rejected` - Staff rejected

**Index:**
```sql
CREATE INDEX idx_posted_items_receiver ON posted_items(receiver_staff_id);
```

---

### 8. Staff Payments

Payments made by staff for posted items.

```sql
CREATE TABLE staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id),
    posted_item_id UUID NOT NULL REFERENCES posted_items(id),
    amount_paid DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'pos', 'transfer')),
    receipt_reference TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Status Flow:**
- `pending` - Awaiting admin approval
- `approved` - Admin approved
- `rejected` - Admin rejected with notes

---

### 9. Staff Commissions

Commission configuration for commissioned staff.

```sql
CREATE TABLE staff_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    commission_percentage DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(staff_id, item_id)
);
```

**Purpose:** Define which staff earn commission on which items  
**Usage:** Commission % calculated when staff's role is 'staff_commission'

---

### 10. Expenses

Staff expense tracking.

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id),
    expense_type TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `expense_type` - Type of expense (e.g., "Transport", "Lunch")
- `amount` - Expense amount
- `description` - Details about expense
- `created_at` - When expense was incurred

---

### 11. Notifications

User notifications for important events.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('posted_item', 'payment_approved', 'payment_rejected', 'item_request')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Types:**
- `posted_item` - Items posted to staff
- `payment_approved` - Payment approved by admin
- `payment_rejected` - Payment rejected by admin
- `item_request` - Item request from sales

**Index:**
```sql
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
```

---

### 12. Activity Logs

Audit trail of all system activities.

```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Examples:**
- Action: `SALE_CREATED`, Entity: `sale`
- Action: `ITEMS_POSTED`, Entity: `posted_item`
- Action: `PAYMENT_APPROVED`, Entity: `staff_payment`

---

## Row Level Security (RLS) Policies

### Users Table
```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Admins can see all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );
```

### Sales Table
```sql
-- Salesperson can view own sales
CREATE POLICY "Sales person views own sales" ON sales
    FOR SELECT USING (auth.uid() = sales_person_id);

-- Admins see all sales
CREATE POLICY "Admins view all sales" ON sales
    FOR SELECT USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );
```

### Posted Items Table
```sql
-- Staff can see items posted to them
CREATE POLICY "Staff views posted items" ON posted_items
    FOR SELECT USING (
        auth.uid() = receiver_staff_id OR 
        auth.uid() = sales_person_id OR
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );
```

---

## Data Integrity Rules

### Inventory Rules
1. **Transfer Flow:** Main Store → Active Store only
2. **Sales Deduction:** Sold items deducted from active store
3. **Quantity:** Cannot go below 0
4. **Unique Items:** One record per item per store

### Sales Rules
1. **Unit Price:** Auto-calculated based on location
2. **Logistics Fare:** +₦500 for non-Jalingo locations
3. **Payment Methods:** Cash, POS, or Transfer only
4. **Buyer Type:** Customer or Staff

### Payment Rules
1. **Approval Flow:** Pending → Approved/Rejected
2. **Amount:** Must match or be part of posted items total
3. **Reference:** Required for cash/transfer

---

## Performance Optimization

### Indexes
All critical foreign keys and frequently queried columns have indexes.

### Queries
- Daily sales aggregation runs at midnight
- Inventory checks use indexed lookups
- Payment queries filtered by status

### Caching
- Dashboard data cached for 30 seconds
- Inventory updates real-time via Realtime API
- Sales totals computed on-demand for accuracy

---

## Backup & Recovery

**Supabase Backup:**
- Automated daily backups
- Point-in-time recovery available
- Manual backup command:
```sql
pg_dump postgresql://user:password@db.supabase.co:5432/postgres > backup.sql
```

---

**Last Updated:** January 2026
