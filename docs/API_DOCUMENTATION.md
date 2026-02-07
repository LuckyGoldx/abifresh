# API Documentation

## Base URL

```
Development: http://localhost:5000
Production: https://abifresh-backend-xxxxx.koyeb.app
```

## Authentication

All endpoints (except `/api/auth/register` and `/api/auth/login`) require JWT token in header:

```
Authorization: Bearer <jwt_token>
```

---

## Authentication Endpoints

### Register New User

**POST** `/api/auth/register`

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "role": "sales",
  "store_location": "Jalingo"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "sales",
    "store_location": "Jalingo",
    "is_active": true,
    "created_at": "2026-01-24T10:00:00Z"
  },
  "message": "User registered successfully"
}
```

**Roles:**
- `admin` - Full system access
- `sales` - Sales and inventory management
- `staff_commission` - Staff with commission on sales
- `staff_non_commission` - Staff without commission

---

### User Login

**POST** `/api/auth/login`

Authenticate user and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "sales",
    "store_location": "Jalingo",
    "is_active": true,
    "created_at": "2026-01-24T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

---

### Get Current User

**GET** `/api/auth/me`

Get authenticated user's profile.

**Query Parameters:**
- `user_id` - (Required) User ID from token

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "sales",
  "store_location": "Jalingo",
  "is_active": true,
  "created_at": "2026-01-24T10:00:00Z"
}
```

---

## Sales Endpoints

### Get Available Items

**GET** `/api/sales/items/available`

List all items available for sale in active store.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Product Name",
    "category": "Category",
    "base_price": 5000,
    "commission_amount": 500,
    "is_available": true,
    "created_at": "2026-01-24T10:00:00Z"
  }
]
```

---

### Get Unavailable Items

**GET** `/api/sales/items/unavailable`

List items out of stock in active store.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Out of Stock Item",
    "category": "Category",
    "base_price": 5000,
    "commission_amount": 500,
    "is_available": false
  }
]
```

---

### Record a Sale

**POST** `/api/sales/record`

Record a new sales transaction.

**Request:**
```json
{
  "item_id": "uuid",
  "quantity": 5,
  "payment_method": "cash",
  "buyer_type": "customer",
  "buyer_id": null,
  "store_location": "Jalingo"
}
```

**Parameters:**
- `item_id` - (Required) UUID of item
- `quantity` - (Required) Number of items
- `payment_method` - (Required) "cash", "pos", or "transfer"
- `buyer_type` - (Required) "customer" or "staff"
- `buyer_id` - UUID if buyer_type is "staff"
- `store_location` - Default "Jalingo"

**Response:**
```json
{
  "sale": {
    "id": "uuid",
    "sales_person_id": "uuid",
    "item_id": "uuid",
    "quantity": 5,
    "unit_price": 5000,
    "total_amount": 25000,
    "payment_method": "cash",
    "buyer_type": "customer",
    "store_location": "Jalingo",
    "is_printed": false,
    "created_at": "2026-01-24T10:00:00Z"
  },
  "message": "Sale recorded successfully"
}
```

**Logic:**
- Unit price = base_price + 500 (if not Jalingo)
- Active store inventory auto-deducted
- Daily sales summary updated
- Activity logged

---

### Post Items to Staff

**POST** `/api/sales/post-items`

Send items to staff for further sales.

**Request:**
```json
{
  "staff_id": "uuid",
  "item_id": "uuid",
  "quantity": 10
}
```

**Response:**
```json
{
  "posted_item": {
    "id": "uuid",
    "sales_person_id": "uuid",
    "receiver_staff_id": "uuid",
    "item_id": "uuid",
    "quantity": 10,
    "unit_price": 5000,
    "status": "pending",
    "created_at": "2026-01-24T10:00:00Z"
  },
  "message": "Items posted successfully"
}
```

**Effects:**
- Creates posted_item with "pending" status
- Sends notification to staff
- Activity logged

---

### Get Sales Dashboard

**GET** `/api/sales/dashboard`

Get sales metrics and statistics.

**Response:**
```json
{
  "today": {
    "total_items_sold": 25,
    "total_amount_sold": 125000
  },
  "all_time": {
    "total_items": 1250,
    "total_amount": 6250000
  },
  "available_items_count": 45
}
```

---

## Inventory Endpoints

### Get Main Store Inventory (Admin Only)

**GET** `/api/inventory/main-store`

**Response:**
```json
[
  {
    "id": "uuid",
    "item_id": "uuid",
    "quantity": 100,
    "items": {
      "name": "Product",
      "category": "Category",
      "base_price": 5000
    }
  }
]
```

---

### Get Active Store Inventory

**GET** `/api/inventory/active-store`

**Response:**
```json
[
  {
    "id": "uuid",
    "item_id": "uuid",
    "quantity": 30,
    "updated_at": "2026-01-24T10:00:00Z",
    "items": {
      "id": "uuid",
      "name": "Product",
      "category": "Category",
      "base_price": 5000,
      "is_available": true
    }
  }
]
```

---

### Add New Item (Admin Only)

**POST** `/api/inventory/items`

**Request:**
```json
{
  "name": "Product Name",
  "category": "Category Name",
  "base_price": 5000,
  "commission_amount": 500
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Product Name",
  "category": "Category Name",
  "base_price": 5000,
  "commission_amount": 500,
  "is_available": true,
  "created_at": "2026-01-24T10:00:00Z"
}
```

---

### Edit Item (Admin Only)

**PUT** `/api/inventory/items/:id`

**Request:**
```json
{
  "base_price": 5500,
  "commission_amount": 550
}
```

---

### Delete Item (Admin Only)

**DELETE** `/api/inventory/items/:id`

---

### Move Items to Active Store (Admin Only)

**POST** `/api/inventory/move-to-active`

Move items from main store to active store for selling.

**Request:**
```json
{
  "item_id": "uuid",
  "quantity": 30
}
```

**Logic:**
- Deducts from main_store
- Adds to active_store
- Updates inventory counts

---

### Get Inventory Summary

**GET** `/api/inventory/summary`

**Response:**
```json
{
  "main_store_total": 500,
  "active_store_total": 150,
  "total_inventory": 650
}
```

---

## Admin Endpoints

All admin endpoints require `role: 'admin'`

### Get All Staff

**GET** `/api/admin/staff`

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "staff@example.com",
    "full_name": "John Staff",
    "role": "sales",
    "store_location": "Jalingo",
    "total_sales_items": 250,
    "total_sales_amount": 1250000
  }
]
```

---

### Create New Staff (Admin Only)

**POST** `/api/admin/staff/create`

**Request:**
```json
{
  "email": "newstaff@example.com",
  "password": "SecurePassword123!",
  "full_name": "New Staff",
  "role": "staff_commission",
  "store_location": "Jalingo"
}
```

---

### Get Commissions

**GET** `/api/admin/commissions`

**Response:**
```json
[
  {
    "id": "uuid",
    "staff_id": "uuid",
    "item_id": "uuid",
    "commission_percentage": 5.5,
    "users": {
      "full_name": "John Staff",
      "email": "staff@example.com"
    },
    "items": {
      "name": "Product"
    }
  }
]
```

---

### Set Commission for Staff

**POST** `/api/admin/commissions/set`

**Request:**
```json
{
  "staff_id": "uuid",
  "item_id": "uuid",
  "commission_percentage": 5.5
}
```

---

### Get Pending Payments

**GET** `/api/admin/payments/pending`

Get all payments awaiting admin approval.

**Response:**
```json
[
  {
    "id": "uuid",
    "staff_id": "uuid",
    "posted_item_id": "uuid",
    "amount_paid": 50000,
    "payment_method": "transfer",
    "receipt_reference": "TRF123456",
    "status": "pending",
    "created_at": "2026-01-24T10:00:00Z"
  }
]
```

---

### Approve Payment

**POST** `/api/admin/payments/:id/approve`

**Response:**
```json
{
  "message": "Payment approved"
}
```

**Effects:**
- Updates payment status to "approved"
- Sends notification to staff
- Activity logged

---

### Reject Payment

**POST** `/api/admin/payments/:id/reject`

**Request:**
```json
{
  "reason": "Receipt not clear"
}
```

---

### Get Sales Report

**GET** `/api/admin/reports/sales`

Get comprehensive sales statistics.

**Query Parameters:**
- `staff_id` - (Optional) Filter by specific staff

**Response:**
```json
{
  "total_sales": 150,
  "total_amount": 750000,
  "total_items": 1500,
  "by_category": {
    "Category1": { "count": 50, "amount": 250000 },
    "Category2": { "count": 100, "amount": 500000 }
  },
  "by_payment_method": {
    "cash": { "count": 80, "amount": 400000 },
    "transfer": { "count": 50, "amount": 250000 },
    "pos": { "count": 20, "amount": 100000 }
  }
}
```

---

### Get Expenses

**GET** `/api/admin/expenses`

Get staff expenses.

**Query Parameters:**
- `staff_id` - (Optional) Filter by specific staff

**Response:**
```json
[
  {
    "id": "uuid",
    "staff_id": "uuid",
    "expense_type": "Transport",
    "amount": 5000,
    "description": "Fuel for delivery",
    "created_at": "2026-01-24T10:00:00Z"
  }
]
```

---

## Staff Endpoints

### Get Posted Items

**GET** `/api/staff/posted-items`

Get items posted to the staff member.

**Response:**
```json
[
  {
    "id": "uuid",
    "sales_person_id": "uuid",
    "item_id": "uuid",
    "quantity": 10,
    "unit_price": 5000,
    "status": "pending",
    "created_at": "2026-01-24T10:00:00Z"
  }
]
```

---

### Accept Posted Items

**POST** `/api/staff/posted-items/:id/accept`

**Response:**
```json
{
  "message": "Posted items accepted"
}
```

---

### Reject Posted Items

**POST** `/api/staff/posted-items/:id/reject`

---

### Make Payment

**POST** `/api/staff/payments`

**Request:**
```json
{
  "posted_item_id": "uuid",
  "amount_paid": 50000,
  "payment_method": "transfer",
  "receipt_reference": "TRF123456"
}
```

**Response:**
```json
{
  "payment": {
    "id": "uuid",
    "staff_id": "uuid",
    "posted_item_id": "uuid",
    "amount_paid": 50000,
    "payment_method": "transfer",
    "receipt_reference": "TRF123456",
    "status": "pending"
  },
  "message": "Payment recorded successfully"
}
```

---

### Add Expense

**POST** `/api/staff/expenses`

**Request:**
```json
{
  "expense_type": "Transport",
  "amount": 5000,
  "description": "Fuel for delivery"
}
```

---

### Get Staff Dashboard

**GET** `/api/staff/dashboard`

Get staff metrics.

**Response:**
```json
{
  "total_items_sold": 100,
  "total_amount_sold": 500000,
  "total_posted_items": 50,
  "pending_payment_count": 5,
  "pending_posted_items": 3,
  "total_expenses": 15000
}
```

---

### Get Notifications

**GET** `/api/staff/notifications`

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "type": "posted_item",
    "title": "New Items Posted",
    "message": "You have received new items for sale",
    "is_read": false,
    "created_at": "2026-01-24T10:00:00Z"
  }
]
```

---

### Mark Notification as Read

**POST** `/api/staff/notifications/:id/read`

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "No authorization token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Route not found"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "message": "Error details (development only)"
}
```

---

## Rate Limiting

Rate limiting is implemented per IP:
- 100 requests per minute for authentication
- 1000 requests per minute for other endpoints

---

## Pagination

For list endpoints that return large datasets, use query parameters:

```
GET /api/admin/staff?page=1&limit=20
```

---

**Last Updated:** January 2026  
**API Version:** 1.0.0
