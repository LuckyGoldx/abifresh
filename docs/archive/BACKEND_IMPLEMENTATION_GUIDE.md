# Sales Portal - Testing & Backend Implementation Guide

**Last Updated:** January 26, 2026

---

## 🧪 TESTING THE LOGOUT FIX

### Step 1: Login to Sales Portal
1. Go to `http://localhost:3001`
2. Login with sales credentials
3. You should NOT be logged out anymore ✅

### Step 2: Test Each Sales Page
Navigate to each page without getting logged out:
- ✅ `/sales/dashboard` - Dashboard
- ✅ `/sales/make-sale` - Make Sale (NEW)
- ✅ `/sales/items` - Available Items
- ✅ `/sales/unavailable` - Unavailable Items
- ✅ `/sales/post-items` - Post Items
- ✅ `/sales/receipts` - Receipts

**Before Fix:** Pages would log you out immediately  
**After Fix:** Pages load normally and keep you logged in ✅

---

## 🎯 TESTING MAKE-SALE PAGE FEATURES

### Available Items Search
1. Go to `/sales/make-sale`
2. Type in search box: "Apples"
3. Should see only items matching "Apples"
4. Try searching by SKU or category
5. Items should filter in real-time

### Add to Cart
1. Click "+ Add to Cart" on any item
2. Item should appear in right-side cart
3. Quantity controls should work (+/-)
4. Cart total should update

### Payment Methods
1. In cart, select different payment methods:
   - 💰 Cash
   - 🏦 POS
   - 📱 Transfer
2. Each item can have different payment method

### Location Pricing
1. Check "Outside Jalingo" checkbox on an item
2. Cart total should increase by logistics price
3. Uncheck to remove logistics fare

### Post Items to Staff
1. Add items to cart
2. Click "Post to Staff" button
3. Select a staff member from dropdown
4. Click "Post Items"
5. Should show success message

---

## 🔧 BACKEND IMPLEMENTATION NEEDED

### **1. Sales Creation Endpoint**

**Endpoint:** `POST /api/sales/create-sale`

**Request Body:**
```json
{
  "items": [
    {
      "item_id": "uuid",
      "quantity": 2,
      "unit_price": 1500,
      "payment_method": "cash",
      "sold_outside_jalingo": false,
      "logistics_fee": 0
    }
  ],
  "total_amount": 3000
}
```

**Response:**
```json
{
  "success": true,
  "receipt_id": "RECEIPT-20260126-001",
  "sale_id": "uuid",
  "timestamp": "2026-01-26T10:30:00Z"
}
```

**Backend Actions:**
- Create sale record in `sales` table
- Deduct quantities from `inventory_active_store`
- Update item status to sold
- Generate receipt ID
- Create notification if staff
- Emit real-time update to dashboard

**Database Updates:**
```sql
-- Create sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id),
  total_amount DECIMAL(10, 2),
  payment_method VARCHAR(20),
  sale_items JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  receipt_id VARCHAR(50) UNIQUE
);

-- Create sale_items table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  item_id UUID REFERENCES items(id),
  quantity INT,
  unit_price DECIMAL(10, 2),
  sold_outside_jalingo BOOLEAN,
  logistics_fee DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### **2. Post Items to Staff Endpoint**

**Endpoint:** `POST /api/sales/post-items`

**Request Body:**
```json
{
  "staff_id": "uuid",
  "items": [
    {
      "id": "item_uuid",
      "name": "Product Name",
      "quantity": 2,
      "unit_price": 1500
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "posting_id": "POST-20260126-001",
  "notification_id": "uuid"
}
```

**Backend Actions:**
- Create posting record
- Create notification for receiving staff
- Return posting confirmation

**Database:**
```sql
CREATE TABLE item_postings (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES staff(id),
  receiver_id UUID REFERENCES staff(id),
  items JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

---

### **3. Fetch Staff List Endpoint**

**Endpoint:** `GET /api/admin/staff`

**Response:**
```json
[
  {
    "id": "uuid",
    "full_name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "sales",
    "store_location": "Jalingo"
  }
]
```

**Implementation:** Already exists, just ensure it filters out inactive staff

---

### **4. Get Logistics Price Endpoint**

**Endpoint:** `GET /api/admin/settings/logistics-price`

**Response:**
```json
{
  "price": 500,
  "currency": "NGN",
  "updated_at": "2026-01-26T08:00:00Z"
}
```

**Database:**
```sql
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE,
  setting_value VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default logistics price
INSERT INTO admin_settings (setting_key, setting_value) 
VALUES ('logistics_price', '500');
```

---

### **5. Update Logistics Price Endpoint** (For Admin)

**Endpoint:** `POST /api/admin/settings/logistics-price`

**Request Body:**
```json
{
  "price": 750
}
```

**Response:**
```json
{
  "success": true,
  "price": 750,
  "updated_at": "2026-01-26T10:35:00Z"
}
```

---

## 📱 FRONTEND DATA FLOW

```
User Login
    ↓
[Sales Dashboard] → Fetches daily stats
    ↓
[Make Sale Page]
    ├─ GET /api/inventory/active-store → Available Items
    ├─ GET /api/admin/staff → Staff List
    └─ GET /api/admin/settings/logistics-price → Logistics Fee
    ↓
User Adds Items to Cart → Local State (no API call)
    ↓
User Selects Payment Method → Local State
    ↓
User Checks Location → Updates Cart Total (Local)
    ↓
Complete Sale
    ├─ POST /api/sales/create-sale
    ├─ GET /api/inventory/active-store (refresh)
    └─ Dashboard Updates (real-time)
        ↓
    OR
        ↓
Post Items to Staff
    ├─ POST /api/sales/post-items
    ├─ Staff Gets Notification
    └─ Staff Can Accept/Reject
```

---

## 🔄 REAL-TIME UPDATES NEEDED

After a sale is completed:

1. **Dashboard Updates:**
   - Total items sold today increases
   - Total amount sold today increases
   - Recently sold items list updates

2. **Inventory Updates:**
   - Active store quantities decrease
   - Available items list refreshes
   - Out of stock items moved to unavailable list

3. **Notifications:**
   - Posted items notification to receiving staff
   - Acceptance/rejection status to sender

---

## 📊 DASHBOARD ENHANCEMENTS NEEDED

**Dashboard Page Changes:**

```typescript
// Add to dashboard stats
interface SalesSummary {
  total_items_sold_today: number;      // Resets at 12:00 AM
  total_amount_sold_today: number;     // Resets at 12:00 AM
  total_sales_count_today: number;
  payment_breakdown: {
    cash: number;
    pos: number;
    transfer: number;
  };
  recent_sales: Sale[];
  posted_items_pending: number;
}
```

**Endpoint:** `GET /api/sales/dashboard-summary`

---

## 🖨️ RECEIPT GENERATION

**Endpoint:** `GET /api/sales/receipt/:receipt_id`

**Response:** PDF or printable HTML

```html
<html>
  <head><title>Sale Receipt #RECEIPT-20260126-001</title></head>
  <body>
    <h1>Sales Receipt</h1>
    <p>Receipt ID: RECEIPT-20260126-001</p>
    <p>Date: Jan 26, 2026 10:30 AM</p>
    <p>Staff: John Doe</p>
    <table>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
      <!-- Items here -->
    </table>
    <h2>Total: ₦3,000</h2>
    <p>Payment: Cash</p>
  </body>
</html>
```

---

## ✅ IMPLEMENTATION PRIORITY

1. **Phase 1 (Critical):**
   - POST /api/sales/create-sale
   - Inventory deduction logic
   - Dashboard updates

2. **Phase 2 (Important):**
   - POST /api/sales/post-items
   - Notifications system
   - GET /api/admin/settings/logistics-price

3. **Phase 3 (Nice to Have):**
   - Receipt generation
   - Real-time updates (WebSocket)
   - Daily reset of sales stats

---

## 🚨 ERROR HANDLING

Frontend expects these error responses:

```json
{
  "error": "Item is out of stock",
  "code": "OUT_OF_STOCK"
}
```

Common errors to handle:
- `OUT_OF_STOCK` - Item quantity exceeded
- `INVALID_STAFF_ID` - Staff not found
- `SALE_FAILED` - General sale creation error
- `INVENTORY_ERROR` - Couldn't update inventory

