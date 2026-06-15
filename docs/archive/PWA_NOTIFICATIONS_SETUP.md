# PWA Notifications Setup & Usage Guide

## 1. **App Name Fix** ✅
**Status: Already fixed in manifest.json**
- **Icon label:** "ABIFRESH" (short_name)
- **Hover tooltip:** "ABIFRESH & KIDDIES VENTURES" (name)
- **Description:** "Management System for ABIFRESH & KIDDIES VENTURES"

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

---

## 4. **Supabase for Cloud Messaging** ☁️

### Can You Use Supabase?
**Yes! Supabase works great for cloud messaging with PWAs.**

### Setup Options:

#### Option A: Supabase Realtime (Best for Real-time Apps)
**No additional service needed - uses your existing Supabase connection**

```typescript
import { RealtimeChannel } from '@supabase/supabase-js';
import { NotificationService } from '@/lib/NotificationService';
import { supabase } from '@/lib/supabase';

export function setupRealtimeNotifications(userId: string) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'broadcast',
      { event: 'notification' },
      (payload) => {
        NotificationService.showNotification(
          payload.payload.title,
          {
            body: payload.payload.body,
            tag: payload.payload.tag,
          }
        );
      }
    )
    .subscribe();

  return channel;
}

// Usage in dashboard:
useEffect(() => {
  const user = useAuthStore((state) => state.user);
  if (user) {
    setupRealtimeNotifications(user.id);
  }
}, []);
```

#### Option B: Supabase Edge Functions + Web Push
**For true push notifications (works even when app is closed)**

```typescript
// 1. Create Supabase Edge Function: supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as webpush from "https://cdn.jsdelivr.net/npm/web-push@3.6.7/+esm"

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidPublicKey,
  vapidPrivateKey
)

serve(async (req) => {
  const { subscription, title, body } = await req.json()

  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title,
      body,
      icon: '/favicon.svg',
    }))
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// 2. In frontend, call the edge function:
import { supabase } from '@/lib/supabase';

export async function sendNotificationViaSupabase(
  subscription: PushSubscription,
  title: string,
  body: string
) {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: { subscription, title, body },
  });

  if (error) console.error('Failed to send notification:', error);
  return data;
}
```

**Setup Steps:**
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add to Supabase project settings as environment variables
3. Deploy Edge Function
4. Call from frontend when you want to send notifications

---

## 5. **What Happens When HTTPS Expires?** 🔐

### Short Answer: ✅ **Download still works, new features don't**

### Details:

| Feature | HTTPS Expired? | Works? | Notes |
|---------|---|---|---|
| **Downloaded app** | ❌ Expired | ✅ YES | App works normally, fully offline-capable |
| **App updates** | ❌ Expired | ❌ NO | Can't check for service worker updates |
| **Push notifications** | ❌ Expired | ❌ NO | Requires HTTPS for security |
| **New installations** | ❌ Expired | ❌ NO | Browser won't install from expired HTTPS |
| **Existing logins** | ❌ Expired | ✅ YES | OAuth/session data persists locally |

### Timeline:

```
Day 1: HTTPS expires
├─ Users with installed app → ✅ Still works!
├─ New users trying to install → ❌ Blocked by browser
└─ Push notifications → ❌ Stopped

Day 2-30: Grace period (varies by browser)
├─ App still works for installed users
└─ They may see security warnings

Day 31+: Could have issues
├─ Service worker stops updating
└─ App stays frozen at last version
```

### How to Prevent Expiration:

**Vercel (Automatic HTTPS)** ✅
```
- Auto-renews every 90 days
- Zero maintenance needed
```

**Manual Setup:**
```
1. Use Let's Encrypt (free)
2. Set auto-renewal with Certbot
3. Renews 30 days before expiration automatically
```

### What You Can Do:

```bash
# Check current certificate expiration
openssl s_client -connect yourdomain.com:443 | grep -i "not after"

# For Let's Encrypt - auto-renew:
sudo certbot renew --dry-run  # Test renewal
sudo certbot renew            # Actually renew
```

### Best Practice for PWAs:
✅ **Use Vercel** - HTTPS is automatic and always valid  
✅ **Renew certificates 30 days before expiry**  
✅ **Monitor certificate expiration dates**  
✅ **Set calendar reminders** just in case

---

## Quick Reference: Supabase vs Firebase for Push

| Feature | Supabase | Firebase |
|---------|----------|----------|
| **Cost** | Free tier available | Free tier available |
| **Setup** | Simpler (use existing DB) | Requires separate setup |
| **Edge Functions** | ✅ Yes (Deno) | ✅ Yes (Cloud Functions) |
| **Realtime** | ✅ Built-in | ❌ Separate service |
| **Documentation** | ✅ Good | ✅ Excellent |
| **Integration** | ✅ Already using | ❌ New dependency |

**Recommendation:** Use **Supabase Realtime** for your use case since you already have Supabase set up!

