# Staff Store - API Route Reference

## Table of Contents
1. [Sales Routes](#sales-routes)
2. [Staff Routes](#staff-routes)
3. [Admin Routes](#admin-routes)
4. [Error Codes](#error-codes)

---

## Sales Routes

### POST /api/sales/post-items
**Purpose**: Post items from active store to a staff member

**Authentication**: Required (Bearer token)
**Role Required**: `sales`, `admin`

**Request Body**:
```json
{
  "staff_id": "uuid-of-staff",
  "items": [
    {
      "item_id": "uuid-of-item",
      "quantity": 10,
      "unit_price": 5000
    },
    {
      "item_id": "uuid-of-another-item",
      "quantity": 5,
      "unit_price": 3500
    }
  ]
}
```

**Response (Success - 201)**:
```json
{
  "posted_items": [
    {
      "id": "uuid",
      "item_id": "uuid",
      "posted_by_id": "uuid",
      "posted_to_id": "uuid",
      "staff_id": "uuid",
      "quantity": 10,
      "unit_price": 5000,
      "status": "pending",
      "posted_date": "2026-01-28T10:00:00Z"
    }
  ],
  "message": "Successfully posted 2 item(s) to staff",
  "count": 2
}
```

**Errors**:
- `400`: Missing staff_id or items array
- `400`: Insufficient quantity in active store
- `400`: Item not found

---

## Staff Routes

### GET /api/staff/store
**Purpose**: Get staff member's store inventory

**Authentication**: Required
**Role Required**: Commission or non-commission staff

**Response (Success - 200)**:
```json
[
  {
    "id": "uuid",
    "staff_id": "uuid",
    "item_id": "uuid",
    "quantity": 10,
    "quantity_sold": 3,
    "quantity_available": 7,
    "posted_date": "2026-01-28T10:00:00Z",
    "items": {
      "id": "uuid",
      "name": "Item Name",
      "sku": "SKU-123",
      "category": "Category",
      "unit_price": 5000
    }
  }
]
```

---

### GET /api/staff/store/summary
**Purpose**: Get summary statistics of staff store

**Response (Success - 200)**:
```json
{
  "total_items": 5,
  "total_quantity": 50,
  "total_sold": 15,
  "total_available": 35
}
```

---

### POST /api/staff/store/accept-items
**Purpose**: Accept posted items into store

**Request Body**:
```json
{
  "posted_item_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response (Success - 200)**:
```json
{
  "message": "Successfully accepted 3 item(s)",
  "items": [
    {
      "id": "uuid",
      "staff_id": "uuid",
      "item_id": "uuid",
      "quantity": 10,
      "quantity_sold": 0,
      "quantity_available": 10
    }
  ]
}
```

**Errors**:
- `400`: posted_item_ids array required
- `404`: Posted item not found
- `403`: Item not posted to this staff member

---

### POST /api/staff/store/reject-items
**Purpose**: Reject posted items (returns to active store)

**Request Body**:
```json
{
  "posted_item_ids": ["uuid1", "uuid2"],
  "comment": "Not needed right now"
}
```

**Response (Success - 200)**:
```json
{
  "message": "Successfully rejected 2 item(s)",
  "items": [
    {
      "id": "uuid",
      "item_id": "uuid",
      "quantity": 10,
      "status": "rejected"
    }
  ]
}
```

---

### POST /api/staff/store/make-sale
**Purpose**: Record a single sale from staff store

**Request Body**:
```json
{
  "item_id": "uuid",
  "quantity": 5,
  "payment_method": "cash"
}
```

**Valid Payment Methods**: `"cash"`, `"transfer"`, `"pos"`, `"cheque"`

**Response (Success - 201)**:
```json
{
  "message": "Sale recorded successfully",
  "sale": {
    "id": "uuid",
    "staff_id": "uuid",
    "item_id": "uuid",
    "quantity": 5,
    "unit_price": 5000,
    "total_amount": 25000,
    "payment_method": "cash",
    "receipt_number": "STAFF-1706420400000",
    "sale_date": "2026-01-28T10:15:00Z"
  }
}
```

**Errors**:
- `400`: item_id and quantity required
- `400`: Item not in staff store
- `400`: Insufficient quantity in staff store

---

### POST /api/staff/store/make-sales
**Purpose**: Record multiple sales in batch

**Request Body**:
```json
{
  "items": [
    {
      "item_id": "uuid1",
      "quantity": 5,
      "payment_method": "cash"
    },
    {
      "item_id": "uuid2",
      "quantity": 3,
      "payment_method": "transfer"
    }
  ]
}
```

**Response (Success - 201)**:
```json
{
  "message": "Successfully recorded 2 sale(s)",
  "sales": [
    {
      "id": "uuid",
      "staff_id": "uuid",
      "item_id": "uuid",
      "quantity": 5,
      "total_amount": 25000
    }
  ]
}
```

---

### GET /api/staff/store/sales-history
**Purpose**: Get staff's sales history

**Query Parameters**:
- `limit` (optional): Number of records (default: 50, max: 1000)

**Example**: `GET /api/staff/store/sales-history?limit=100`

**Response (Success - 200)**:
```json
[
  {
    "id": "uuid",
    "staff_id": "uuid",
    "item_id": "uuid",
    "quantity": 5,
    "unit_price": 5000,
    "total_amount": 25000,
    "payment_method": "cash",
    "sale_date": "2026-01-28T10:15:00Z",
    "receipt_number": "STAFF-1706420400000",
    "items": {
      "id": "uuid",
      "name": "Item Name",
      "sku": "SKU-123"
    }
  }
]
```

---

## Admin Routes

### GET /api/admin/staff-stores
**Purpose**: Get summary of all staff stores

**Authentication**: Required
**Role Required**: `admin`

**Response (Success - 200)**:
```json
[
  {
    "staff_id": "uuid",
    "staff_name": "John Doe",
    "staff_role": "commission_staff",
    "items": [
      {
        "id": "uuid",
        "quantity": 10,
        "quantity_sold": 3,
        "quantity_available": 7,
        "items": {
          "name": "Item Name",
          "unit_price": 5000
        }
      }
    ],
    "total_items": 5,
    "total_quantity": 50,
    "total_sold": 15,
    "total_available": 35
  }
]
```

---

### GET /api/admin/staff-stores/:staffId
**Purpose**: Get detailed store information for specific staff

**Path Parameters**:
- `staffId` (required): UUID of the staff member

**Response (Success - 200)**:
```json
{
  "staff_id": "uuid",
  "total_items": 3,
  "total_quantity": 25,
  "total_sold": 8,
  "total_available": 17,
  "items": [
    {
      "id": "uuid",
      "staff_id": "uuid",
      "item_id": "uuid",
      "quantity": 10,
      "quantity_sold": 3,
      "quantity_available": 7,
      "posted_date": "2026-01-28T10:00:00Z",
      "items": {
        "id": "uuid",
        "name": "Item Name",
        "sku": "SKU-123",
        "category": "Category",
        "unit_price": 5000
      }
    }
  ]
}
```

---

### GET /api/admin/staff-stores-stats
**Purpose**: Get analytics and statistics for all staff stores

**Response (Success - 200)**:
```json
[
  {
    "staff_id": "uuid",
    "staff_name": "John Doe",
    "staff_role": "commission_staff",
    "total_items": 5,
    "total_quantity": 50,
    "total_sold": 15,
    "available": 35,
    "sell_through_rate": "30.00"
  },
  {
    "staff_id": "uuid",
    "staff_name": "Jane Smith",
    "staff_role": "non_commission_staff",
    "total_items": 3,
    "total_quantity": 30,
    "total_sold": 25,
    "available": 5,
    "sell_through_rate": "83.33"
  }
]
```

**Notes**:
- `sell_through_rate` is a percentage (0-100)
- Sorted by staff performance by default
- Use in charts and dashboards

---

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing required fields, invalid data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User doesn't have permission for this action |
| 404 | Not Found | Item/staff/posted_item doesn't exist |
| 500 | Server Error | Unexpected server error |

---

## Example Request/Response Cycle

### Scenario: Sales staff posts items to commission staff

**1. Sales staff gets active items**
```
GET /api/sales/items/available
```

**2. Sales staff posts items**
```
POST /api/sales/post-items
{
  "staff_id": "commission-staff-uuid",
  "items": [
    { "item_id": "item-1", "quantity": 10, "unit_price": 5000 },
    { "item_id": "item-2", "quantity": 5, "unit_price": 3500 }
  ]
}
```

**3. Commission staff views posted items**
```
GET /api/staff/posted-items
```

**4. Commission staff accepts items**
```
POST /api/staff/store/accept-items
{
  "posted_item_ids": ["posted-item-uuid-1", "posted-item-uuid-2"]
}
```

**5. Commission staff views store**
```
GET /api/staff/store
```

**6. Commission staff makes sale**
```
POST /api/staff/store/make-sale
{
  "item_id": "item-1",
  "quantity": 3,
  "payment_method": "cash"
}
```

**7. Admin monitors staff store**
```
GET /api/admin/staff-stores-stats
```

---

## Rate Limiting

Currently no rate limiting implemented. Recommended:
- 100 requests per minute for regular endpoints
- 1000 requests per minute for analytics

---

## Pagination

Currently supported on:
- `/api/staff/store/sales-history` - use `limit` query parameter

Recommended to add pagination support for:
- `/api/admin/staff-stores` - large deployments
- `/api/staff/store` - staff with many items

---

## Webhooks (Future Enhancement)

Consider adding webhooks for:
- When items are posted to staff
- When staff accepts/rejects items
- When sale is recorded
