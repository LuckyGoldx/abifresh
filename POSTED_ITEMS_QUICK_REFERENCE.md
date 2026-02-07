# Quick Reference: Posted Items & Notifications Feature

## What Was Added

### 1. Sales Dashboard - Posted Items Stats
```
📈 Posted Items (Accepted): Shows total accepted items + quantities
👥 Posted Items (Total): Shows total posted items + quantities
```
- Updates in real-time as staff accepts/rejects items
- Tracks all posted items from this sales person

### 2. Sales Dashboard - Recent Activities
Now shows:
- ✅ Sales made (existing)
- ✅ Items posted to staff (NEW)
- ✅ Items accepted by staff (NEW)
- ✅ Items rejected by staff (NEW)

### 3. Comprehensive Notifications
Staff can now see:
- 🟣 **Posted Items**: When items you sent are accepted/rejected
- 🔵 **Payments**: When payments are approved/rejected
- 🟠 **System**: General system messages
- 🟢 **Comments**: Reserved for future feedback

### 4. Notification Bell
- Shows number of unread notifications (red badge)
- Click to navigate to notifications page
- Updates every 15 seconds

---

## How It Works

### For Sales Person:
1. Posts items to staff via "Post Items" tab
2. Recent Activities shows "Items Posted" entry
3. When staff accepts: Activity shows "Items Accepted" + stats update
4. Can see all posted items history in stats cards

### For Staff:
1. Receives notification when items are posted (pending)
2. Accepts/rejects items from "Posted Items" page
3. Sees notification in bell and notifications page
4. Can filter notifications by category

### Data Flow:
```
Sales Posts Items → Staff Receives → Staff Accepts/Rejects
                                              ↓
                    Notification Generated → Bell Updates
                                              ↓
                    Dashboard Stats Update → Activity Logged
```

---

## API Endpoints

### For Sales Dashboard
```
GET /api/sales/posted-items/history
- Returns: List of posted items with status, staff name, timestamp

GET /api/sales/posted-items/stats
- Returns: Totals (posted, accepted, rejected, pending) + quantities
```

### For Notifications
```
GET /api/notifications
- Returns: All notifications (posted items, payments, system)

GET /api/notifications/unread-count
- Returns: Total unread count

PUT /api/notifications/:id/read
- Marks notification as read
```

---

## File Changes Summary

### Backend Files Modified:
- ✅ `backend/src/routes/sales.routes.ts` - Added 2 new endpoints
- ✅ `backend/src/routes/notifications.routes.ts` - Enhanced notifications system

### Frontend Files Modified:
- ✅ `frontend/app/sales/dashboard/page.tsx` - Added stats + activities
- ✅ `frontend/app/staff/notifications/page.tsx` - Complete redesign
- ✅ `frontend/components/Header.tsx` - Already has bell (working now)

---

## Configuration

### Notification Polling
- **Interval:** 15 seconds
- **Why:** Optimal for < 20 users, balances responsiveness + performance
- **Change:** Edit `frontend/context/NotificationContext.tsx` line 77

### Activity Limit
- **Limit:** Last 10 activities shown
- **Change:** Modify `setActivities(allActivities.slice(0, 10))`

---

## Testing Workflow

### Test Posted Items Feature:
1. Login as sales person
2. Go to Sales Dashboard
3. Post items to staff via "Post Items" tab
4. See "Items Posted" in Recent Activities
5. Logout, login as staff
6. Accept/reject items
7. Logout, login as sales
8. See "Items Accepted/Rejected" in Recent Activities
9. Check stats cards updated

### Test Notifications:
1. Perform item posting/acceptance
2. Check bell icon - should show unread count
3. Click bell → goes to notifications page
4. See categorized notifications
5. Filter by category
6. Verify timestamps and amounts display

---

## What Data Is Shown

### Posted Items Stats Card:
```
{
  total_posted_items: 5,        // All items posted
  total_posted_quantity: 50,    // Total units posted
  accepted_items: 3,            // Accepted count
  accepted_quantity: 25,        // Accepted units
  rejected_items: 1,            // Rejected count
  rejected_quantity: 10,        // Rejected units
  pending_items: 1              // Still pending
}
```

### Recent Activity Entry:
```
Title: "Items Accepted by Staff"
Description: "25 x Product Name to Staff Name"
Amount: ₦1,250.00
Quantity: 25
Timestamp: Jan 28, 2026 10:30 AM
Icon: 📈 (blue trending up arrow)
```

### Notification:
```
Category: posted_items (purple)
Title: "Items Accepted by Staff"
Status Badge: "Accepted" (green)
Message: "25x Product Name accepted by John Doe"
Timestamp: Jan 28, 2026 10:30 AM
```

---

## Common Issues & Solutions

### Issue: Stats not updating
**Solution:** Verify `/api/sales/posted-items/stats` endpoint returns data
- Check backend route is registered
- Verify poster_id matches current user ID
- Check posted_items table has data

### Issue: Notifications not showing
**Solution:** Check notification sources
- Posted items must have status != 'pending'
- Payment records must exist in staff_payments table
- User must be staff role to see posted items notifications

### Issue: Bell count stuck
**Solution:** Notification refresh issue
- Check `/api/notifications/unread-count` returns correct value
- Verify 15-second polling is running
- Clear browser cache and reload

### Issue: Performance slow
**Solution:** Reduce polling frequency
- Change from 15s to 30s in NotificationContext
- Reduce activity limit from 10 to 5
- Check database query performance

---

## Database Requirements

No new tables required! Uses existing:
- ✅ `posted_items` table
- ✅ `notifications` table
- ✅ `staff_payments` table

Ensure columns exist:
- `posted_items.poster_id` (who sent)
- `posted_items.staff_id` (who received)
- `posted_items.status` (pending/accepted/rejected)
- `staff_payments.status` (pending/approved/rejected)

---

## Frontend Features Added

### Header.tsx
- Notification bell with badge count
- Click to navigate to notifications

### NotificationContext.tsx
- Already exists, handles polling + state

### SalesDashboard
- Stats cards for posted items
- Recent activities including posted items
- Fetches from 2 new endpoints

### StaffNotifications
- Category filtering
- Color-coded notifications
- Status badges
- Amount display for payments
- Auto-refresh every 15 seconds

---

## Next Steps

1. **Restart backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Clear frontend cache**
   - Ctrl+Shift+Delete in browser → Clear Cache

3. **Test the feature**
   - Use checklist above

4. **Monitor performance**
   - Check browser DevTools → Network
   - Verify requests are ~15 seconds apart
   - Check response sizes (< 50KB)

---

## Support Resources

- Backend route logs: `console.log` in routes
- Frontend errors: Browser Console (F12)
- Database: Check Supabase dashboard for data
- Auth: Verify JWT token in Authorization header

---

