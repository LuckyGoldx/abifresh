# Backend Requirements - Posted Items Tracking & Notifications

**Status:** Frontend Ready - Backend Implementation Needed  
**Created:** January 26, 2026

---

## 📦 Database Schema Requirements

### 1. Posted Items Table
```sql
CREATE TABLE posted_items (
  id VARCHAR(36) PRIMARY KEY,
  sale_id VARCHAR(36) NOT NULL,
  posted_by_staff_id VARCHAR(36) NOT NULL,
  posted_to_staff_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  rejection_reason TEXT,
  notes TEXT,
  
  FOREIGN KEY (posted_by_staff_id) REFERENCES staff(id),
  FOREIGN KEY (posted_to_staff_id) REFERENCES staff(id),
  INDEX idx_posted_to (posted_to_staff_id),
  INDEX idx_posted_by (posted_by_staff_id),
  INDEX idx_status (status)
);
```

### 2. Posted Items Detail Table
```sql
CREATE TABLE posted_items_details (
  id VARCHAR(36) PRIMARY KEY,
  posted_item_id VARCHAR(36) NOT NULL,
  item_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  
  FOREIGN KEY (posted_item_id) REFERENCES posted_items(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);
```

### 3. Notifications Table
```sql
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  staff_id VARCHAR(36) NOT NULL,
  type ENUM('post_items', 'item_accepted', 'item_rejected', 'system') DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  related_id VARCHAR(36),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  INDEX idx_staff (staff_id),
  INDEX idx_unread (is_read)
);
```

---

## 🔌 API Endpoints Required

### 1. Post Items to Staff
**Endpoint:** `POST /api/sales/post-items`

**Request Body:**
```json
{
  "staff_id": "staff-uuid",
  "items": [
    {
      "id": "item-uuid",
      "name": "Item Name",
      "sale_quantity": 5,
      "unit_price": 1500
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "posted_id": "posted-uuid",
  "message": "Items posted successfully",
  "notification_sent": true
}
```

**Implementation:**
1. Create entry in `posted_items` table
2. Create entries in `posted_items_details` for each item
3. Create notification for receiving staff
4. Return posted_id and confirmation

---

### 2. Get Posted Items (Sales Staff View)
**Endpoint:** `GET /api/sales/posted-items`

**Query Parameters:**
- `status` (pending|accepted|rejected) - optional
- `staff_id` - receiving staff filter

**Response:**
```json
{
  "items": [
    {
      "id": "posted-uuid",
      "posted_to": {
        "id": "staff-uuid",
        "full_name": "John Doe",
        "role": "commission_staff"
      },
      "items": [
        {
          "id": "item-uuid",
          "name": "Item Name",
          "quantity": 5,
          "unit_price": 1500
        }
      ],
      "status": "pending",
      "created_at": "2026-01-26T10:30:00Z",
      "accepted_at": null,
      "rejected_at": null,
      "rejection_reason": null
    }
  ],
  "total": 5,
  "pending": 2,
  "accepted": 2,
  "rejected": 1
}
```

---

### 3. Get Received Items (Staff Dashboard)
**Endpoint:** `GET /api/staff/received-items`

**Query Parameters:**
- `status` (pending|accepted|rejected) - optional

**Response:**
```json
{
  "items": [
    {
      "id": "posted-uuid",
      "posted_by": {
        "id": "staff-uuid",
        "full_name": "Jane Smith",
        "role": "sales_staff"
      },
      "items": [
        {
          "id": "item-uuid",
          "name": "Item Name",
          "quantity": 5,
          "unit_price": 1500
        }
      ],
      "status": "pending",
      "created_at": "2026-01-26T10:30:00Z",
      "total_items": 5,
      "total_value": 7500
    }
  ],
  "pending_count": 3,
  "accepted_count": 2,
  "rejected_count": 1
}
```

---

### 4. Accept Posted Items
**Endpoint:** `POST /api/staff/posted-items/{id}/accept`

**Request Body:**
```json
{
  "notes": "Accepted and ready to sell"
}
```

**Response:**
```json
{
  "success": true,
  "posted_id": "posted-uuid",
  "status": "accepted",
  "accepted_at": "2026-01-26T10:35:00Z",
  "notification_sent": true
}
```

**Implementation:**
1. Update `posted_items.status = 'accepted'`
2. Update `posted_items.accepted_at = NOW()`
3. Create notification for posting staff
4. Update inventory assignment to receiving staff (optional)

---

### 5. Reject Posted Items
**Endpoint:** `POST /api/staff/posted-items/{id}/reject`

**Request Body:**
```json
{
  "reason": "Items damaged or not as expected"
}
```

**Response:**
```json
{
  "success": true,
  "posted_id": "posted-uuid",
  "status": "rejected",
  "rejected_at": "2026-01-26T10:35:00Z",
  "rejection_reason": "Items damaged or not as expected",
  "notification_sent": true
}
```

**Implementation:**
1. Update `posted_items.status = 'rejected'`
2. Update `posted_items.rejected_at = NOW()`
3. Update `posted_items.rejection_reason`
4. Create notification for posting staff
5. Revert inventory assignment if applicable

---

### 6. Get Admin Posted Items Activity
**Endpoint:** `GET /api/admin/posted-items-activity`

**Query Parameters:**
- `date_from` - start date filter
- `date_to` - end date filter
- `status` - filter by status
- `posted_by_id` - filter by sales staff
- `posted_to_id` - filter by receiving staff

**Response:**
```json
{
  "items": [
    {
      "id": "posted-uuid",
      "posted_by": {
        "id": "staff-uuid",
        "full_name": "Jane Smith",
        "role": "sales_staff"
      },
      "posted_to": {
        "id": "staff-uuid",
        "full_name": "John Doe",
        "role": "commission_staff"
      },
      "items": [
        {
          "name": "Item Name",
          "quantity": 5,
          "unit_price": 1500,
          "subtotal": 7500
        }
      ],
      "total_value": 7500,
      "status": "accepted",
      "created_at": "2026-01-26T10:30:00Z",
      "accepted_at": "2026-01-26T10:35:00Z",
      "rejected_at": null
    }
  ],
  "total": 150,
  "by_status": {
    "pending": 45,
    "accepted": 90,
    "rejected": 15
  }
}
```

---

### 7. Get Notifications
**Endpoint:** `GET /api/notifications`

**Query Parameters:**
- `unread_only` (true|false) - default false
- `type` - filter by notification type
- `limit` - pagination limit

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-uuid",
      "type": "post_items",
      "title": "Items Posted to You",
      "message": "Jane Smith posted 5 items to you",
      "related_id": "posted-uuid",
      "is_read": false,
      "created_at": "2026-01-26T10:30:00Z"
    }
  ],
  "unread_count": 3
}
```

---

### 8. Mark Notification as Read
**Endpoint:** `PATCH /api/notifications/{id}/read`

**Response:**
```json
{
  "success": true,
  "notification_id": "notif-uuid",
  "is_read": true
}
```

---

### 9. Get Unread Notification Count
**Endpoint:** `GET /api/notifications/unread/count`

**Response:**
```json
{
  "unread_count": 3
}
```

---

## 🎯 Frontend Features Ready to Connect

### Sales Staff Features
1. **Posted Items Section** - Track all items posted to other staff
   - Endpoint: `GET /api/sales/posted-items`
   - Shows pending, accepted, rejected items
   - Displays staff member and status
   - Timestamps for each action

2. **Posted Items Notifications** - Real-time updates
   - When staff accepts items: Show notification
   - When staff rejects items: Show notification with reason
   - Unread badge on notification icon

### Receiving Staff Features
1. **Received Items Section** - Dashboard widget
   - Endpoint: `GET /api/staff/received-items?status=pending`
   - Shows items posted to current staff
   - Accept/Reject buttons
   - View full item details
   - Add notes on action

2. **Item Action Modals**
   - Endpoint: `POST /api/staff/posted-items/{id}/accept`
   - Endpoint: `POST /api/staff/posted-items/{id}/reject`
   - Confirmation before action
   - Optional notes field

### Admin Features
1. **Posted Items Activity Dashboard**
   - Endpoint: `GET /api/admin/posted-items-activity`
   - Timeline view of all posted items
   - Filter by date, staff, status
   - Export report functionality
   - Activity metrics

---

## 📊 Data Flow Diagram

```
Sales Staff                  Receiving Staff              Admin
    |                              |                       |
    +-- Post Items ---------> posted_items table <-------- View Activity
    |                              |
    +-- Send Notification <-- notifications table
    |                              |
    +<-- Receive Update --------- Accept/Reject
    |
    +-- View Posted Items <-- Get Posted Items API
         (GET /api/sales/posted-items)

Receiving Staff
    |
    +-- View Received Items <-- Get Received Items API
    |       (GET /api/staff/received-items)
    |
    +-- Accept Items ---------> Update Status + Notify Sales
    |       (POST /accept)
    |
    +-- Reject Items ---------> Update Status + Notify Sales
            (POST /reject)
```

---

## 🔔 Notification Examples

### Type 1: Items Posted
**Title:** "Items Posted to You"  
**Message:** "Jane Smith posted 5 items to you"  
**Action:** Click to view received items

### Type 2: Items Accepted
**Title:** "Items Accepted"  
**Message:** "John Doe accepted your posted items"  
**Action:** Click to view accepted items

### Type 3: Items Rejected
**Title:** "Items Rejected"  
**Message:** "John Doe rejected your posted items: Items damaged"  
**Action:** Click to view rejection reason

---

## 🚀 Implementation Priority

**Phase 1 (High Priority):**
1. Create posted_items and posted_items_details tables
2. Implement `/api/sales/post-items` endpoint
3. Implement `/api/staff/received-items` endpoint
4. Create notifications table
5. Add basic notification sending

**Phase 2 (Medium Priority):**
1. Implement accept/reject endpoints
2. Add notification types
3. Create `/api/sales/posted-items` for sales staff
4. Add admin posted items activity endpoint

**Phase 3 (Low Priority):**
1. Real-time WebSocket notifications
2. Advanced filtering and search
3. Export/report generation
4. Email notifications for important events

---

## 💾 Notes

- All IDs use UUID format
- Timestamps in ISO 8601 format
- Soft deletes recommended for audit trail
- Consider adding staff notes/comments field
- Track action timestamps for analytics
- Log all rejections for staff performance
- Consider commission impact of accepted items

