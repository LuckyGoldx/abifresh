# PWA Notifications Setup & Usage Guide

## 1. **App Name Fix** ✅
**Status: Already fixed in manifest.json**
- **Icon label:** "ABIFRESH" (short_name)
- **Hover tooltip:** "ABIFRESH & KIDDIES VENTURES" (name)
- **Description:** "Sales Management System for ABIFRESH & KIDDIES VENTURES"

## 2. **Session Persistence Fix** ✅
**Status: Updated auth store**
- Token and user data now properly saved to localStorage
- Added `hydrateFromStorage()` method for explicit rehydration
- Used `createJSONStorage()` for explicit storage configuration
- Partialize persists only essential auth state

**To use in components:**
```typescript
import { useAuthStore } from '@/store/auth';

// In useEffect or app initialization:
const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);
hydrateFromStorage(); // Ensures auth persists across app restarts
```

## 3. **PWA Notifications** 🔔

### Simple Notifications (No Server Needed)
```typescript
import { NotificationService } from '@/lib/NotificationService';

// Request permission first (show once on app load)
await NotificationService.requestPermission();

// Show different types of notifications
NotificationService.showInfo('Title', 'Message');
NotificationService.showSuccess('Done!', 'Task completed');
NotificationService.showWarning('Alert', 'Warning message');
NotificationService.showError('Failed', 'Error message');
```

### Where to Trigger Notifications
```typescript
import { NotificationService } from '@/lib/NotificationService';

// After successful login
const handleLogin = async () => {
  // ... login logic
  if (success) {
    NotificationService.showSuccess('Welcome!', `Logged in as ${username}`);
  }
};

// After payment/transaction
const handlePayment = async () => {
  // ... payment logic
  if (success) {
    NotificationService.showSuccess('Payment Processed', 'N5,000.00 received');
  }
};

// For errors
const handleError = (error) => {
  NotificationService.showError('Error', error.message);
};

// For real-time updates
if (newInventoryAlert) {
  NotificationService.showInfo('Inventory Update', 'Low stock alert!');
}
```

### Enable Push Notifications (Server Required)
```typescript
// Requires backend setup with Web Push protocol
const subscription = await NotificationService.enablePushNotifications();

if (subscription) {
  // Send subscription to your backend
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}
```

## Implementation Checklist

### For Basic Notifications (Use Immediately)
- ✅ Request permission on app load
- ✅ Use NotificationService in event handlers
- ✅ Show after successful actions (login, payment, etc.)
- ✅ Show errors and warnings

### For Push Notifications (Requires Backend)
- [ ] Set up Web Push service (e.g., Firebase Cloud Messaging)
- [ ] Generate VAPID keys
- [ ] Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to env
- [ ] Create backend endpoint to send push messages
- [ ] Handle push events in service worker

## Example: Add to Admin Dashboard

```typescript
'use client';

import { useEffect } from 'react';
import { NotificationService } from '@/lib/NotificationService';

export default function AdminDashboard() {
  useEffect(() => {
    // Request notification permission on first visit
    NotificationService.requestPermission();
  }, []);

  const handleMakeSale = async () => {
    try {
      // ... make sale logic
      NotificationService.showSuccess('Sale Created', 'Sale #12345 recorded');
    } catch (error) {
      NotificationService.showError('Sale Failed', error.message);
    }
  };

  return (
    <div>
      {/* Dashboard content */}
    </div>
  );
}
```

## Testing

### Desktop
1. Open app
2. Look for notification permission prompt
3. Click "Allow"
4. Trigger actions to see notifications

### Mobile (After HTTPS Deployment)
1. Install app from Vercel/Netlify
2. Notifications will work in both app and browser
3. Close app and send push notification - it will appear!

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Notifications not showing | Check browser permissions in Settings |
| Permission prompt doesn't appear | Clear localStorage and reload |
| Session logs out | Ensure auth store hydration is called |
| Mobile notifications don't work | Must be HTTPS + PWA installed |

## Files Added/Modified
- ✅ `frontend/lib/NotificationService.ts` - Notification service
- ✅ `frontend/components/NotificationExample.tsx` - Example component
- ✅ `frontend/store/auth.ts` - Enhanced persistence
- ✅ `frontend/public/manifest.json` - Fixed app name
