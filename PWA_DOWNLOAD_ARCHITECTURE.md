# PWA Download System - Architecture & Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER (Frontend)                       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Download Page (/download)                       │   │
│  │                                                              │   │
│  │  • Hero Section with CTA                                   │   │
│  │  • Statistics Dashboard (Real-time)                        │   │
│  │  • Feature Showcase                                        │   │
│  │  • Installation Guides                                     │   │
│  │  • FAQ Section                                             │   │
│  │                                                              │   │
│  │  Components:                                                │   │
│  │  ├─ PWAPrompt (Floating)                                   │   │
│  │  └─ DownloadBanner (Top/Bottom)                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 React Hooks & Utilities                      │   │
│  │                                                              │   │
│  │  • usePWAInstall()                                          │   │
│  │  • trackDownload()                                          │   │
│  │  • Installation state management                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/HTTPS
                                 │
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION TIER (Backend)                    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Express.js API Server (Port 5000)               │   │
│  │                                                              │   │
│  │  Routes:                                                     │   │
│  │  ├─ POST   /api/download/track     → Record download       │   │
│  │  ├─ GET    /api/download/stats     → Get statistics        │   │
│  │  └─ GET    /api/download/history   → Get history           │   │
│  │                                                              │   │
│  │  Middleware:                                                │   │
│  │  ├─ CORS Configuration                                      │   │
│  │  ├─ Rate Limiting                                           │   │
│  │  ├─ CSRF Protection                                         │   │
│  │  └─ Request Logging                                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Download Services                               │   │
│  │                                                              │   │
│  │  • Track Download Service                                   │   │
│  │  • Statistics Aggregation                                   │   │
│  │  • Data Validation                                          │   │
│  │  • Error Handling                                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ SQL Queries
                                 │
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA TIER (Database)                           │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Supabase PostgreSQL                             │   │
│  │                                                              │   │
│  │  Table: pwa_downloads                                        │   │
│  │  ├─ id (BIGSERIAL)                                          │   │
│  │  ├─ platform (VARCHAR)                                      │   │
│  │  ├─ user_agent (TEXT)                                       │   │
│  │  ├─ ip_address (INET)                                       │   │
│  │  ├─ downloaded_at (TIMESTAMP)                               │   │
│  │  └─ created_at (TIMESTAMP)                                  │   │
│  │                                                              │   │
│  │  Indexes:                                                    │   │
│  │  ├─ idx_pwa_downloads_downloaded_at                         │   │
│  │  ├─ idx_pwa_downloads_platform                              │   │
│  │  └─ idx_pwa_downloads_created_at                            │   │
│  │                                                              │   │
│  │  Views:                                                      │   │
│  │  └─ pwa_download_stats                                      │   │
│  │                                                              │   │
│  │  Security:                                                   │   │
│  │  ├─ Row Level Security (RLS)                                │   │
│  │  ├─ Insert Policy: Allow anonymous                          │   │
│  │  └─ Select Policy: Allow read                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## User Flow - PWA Download Journey

```
START
  │
  ├─→ Visit /download page
  │   │
  │   └─→ Page loads
  │       ├─ Fetch statistics from /api/download/stats
  │       ├─ Display hero section
  │       ├─ Show feature cards
  │       └─ Auto-show PWA prompt after 3s
  │
  ├─→ User clicks "Download & Install"
  │   │
  │   ├─ Call trackDownload() 
  │   │   └─ POST /api/download/track
  │   │       └─ Database records download
  │   │
  │   └─ Trigger PWA install prompt
  │       ├─ Browser prompt shown
  │       ├─ User accepts/rejects
  │       └─ If accepted → Installation starts
  │
  ├─→ Stats Update (Every 60 seconds)
  │   │
  │   └─ GET /api/download/stats
  │       └─ Display updated numbers
  │
  └─→ User can install or dismiss
      ├─ Session remembers dismissal
      └─ Won't show prompt again this session

END
```

---

## Data Flow - Download Tracking

```
User Action
    │
    ├─→ [Client] usePWAInstall() hook detects installable
    │
    ├─→ [Client] User clicks "Download & Install"
    │
    ├─→ [Client] trackDownload() function called
    │   └─ Collects: platform, userAgent, timestamp
    │
    ├─→ [Network] POST /api/download/track
    │   │
    │   ├─ Request Headers:
    │   │  └─ Content-Type: application/json
    │   │
    │   └─ Request Body:
    │      {
    │        "platform": "web",
    │        "userAgent": "Mozilla/5.0...",
    │        "timestamp": "2024-03-16T10:30:00Z"
    │      }
    │
    ├─→ [Server] Express Route Handler
    │   │
    │   ├─ Validate request
    │   ├─ Extract IP from request
    │   └─ Format data for database
    │
    ├─→ [Server] Insert into Database
    │   │
    │   └─ INSERT INTO pwa_downloads
    │      (platform, user_agent, ip_address, downloaded_at)
    │      VALUES (...)
    │
    ├─→ [Database] Store Record
    │   │
    │   ├─ Generate ID
    │   ├─ Set timestamps
    │   └─ Apply RLS policies
    │
    ├─→ [Server] Return Response
    │   │
    │   └─ {
    │       "success": true,
    │       "id": 12345
    │     }
    │
    ├─→ [Client] Receive Response
    │   │
    │   ├─ Success → Show confirmation message
    │   └─ Error → Log and continue
    │
    └─→ Trigger Browser Install Prompt
        └─ User completes installation

Record Stored for Analytics
```

---

## Statistics Aggregation Flow

```
Every 60 seconds (Auto-refresh on page)
    │
    ├─→ [Client] Call /api/download/stats
    │
    ├─→ [Server] Process Request
    │   │
    │   ├─ Query 1: Count Total Downloads
    │   │  SELECT COUNT(*) FROM pwa_downloads
    │   │
    │   ├─ Query 2: Count Today's Downloads
    │   │  SELECT COUNT(*) FROM pwa_downloads
    │   │  WHERE DATE(downloaded_at) = TODAY
    │   │
    │   ├─ Query 3: Count Last 7 Days
    │   │  SELECT COUNT(*) FROM pwa_downloads
    │   │  WHERE downloaded_at > (NOW - 7 days)
    │   │
    │   └─ Query 4: Platform Breakdown
    │      SELECT platform, COUNT(*) FROM pwa_downloads
    │      GROUP BY platform
    │
    ├─→ [Server] Aggregate Results
    │   │
    │   └─ {
    │       "totalDownloads": 1250,
    │       "recentDownloads": 45,
    │       "todayDownloads": 12,
    │       "platformBreakdown": {
    │         "web": 850,
    │         "ios": 200,
    │         "android": 200
    │       }
    │     }
    │
    ├─→ [Client] Update UI
    │   │
    │   ├─ Update "Total Downloads" card
    │   ├─ Update "Today" card
    │   ├─ Update "Last 7 Days" card
    │   └─ Update platform breakdown
    │
    └─→ Loop (60s interval)
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Download Page Component                   │
│                   (page.tsx)                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ useEffect: Fetch Stats, Setup Install Listener       │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                     │
│    ┌───────────────────┼───────────────────┐                │
│    │                   │                   │                │
│    ▼                   ▼                   ▼                │
│  ┌──────────┐  ┌────────────────┐  ┌──────────────┐       │
│  │ usePWA   │  │ fetch/stats    │  │ beforeinstall│       │
│  │ Install  │  │ on page load   │  │ prompt event │       │
│  │ Hook     │  │ & every 60s    │  │ listener     │       │
│  └──────────┘  └────────────────┘  └──────────────┘       │
│       │               │                   │                 │
│       ├─ canInstall   ├─ stats            ├─ deferredPrompt
│       ├─ isInstalled  └─ Platform data    └─ showInstallPrompt
│       └─ install()                                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Render Methods:                                      │  │
│  │                                                      │  │
│  │ • renderHeroSection()                               │  │
│  │   ├─ Display download button                         │  │
│  │   └─ Show stats preview                              │  │
│  │                                                      │  │
│  │ • renderFeatures()                                   │  │
│  │   └─ Feature cards (6 items)                         │  │
│  │                                                      │  │
│  │ • renderInstallationGuide()                          │  │
│  │   └─ Platform guides (3 platforms)                   │  │
│  │                                                      │  │
│  │ • renderStatistics()                                 │  │
│  │   └─ Live stats dashboard                            │  │
│  │                                                      │  │
│  │ • renderFAQ()                                        │  │
│  │   └─ Collapsible FAQs (6 items)                      │  │
│  │                                                      │  │
│  │ • renderCTA()                                        │  │
│  │   └─ Call-to-action section                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────┐
│              PWAPrompt Component                            │
│           (Floating Install Prompt)                        │
│                                                             │
│  • Auto-shows after 3 seconds                              │
│  • respects sessionStorage dismissal                       │
│  • Follows scroll (bottom-aware positioning)               │
│  • Triggers trackDownload() on install                     │
│  • Calls usePWAInstall().install()                         │
│                                                             │
└───────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────┐
│           DownloadBanner Component                         │
│        (Top/Bottom Promotional Banner)                    │
│                                                             │
│  • Dismissible option                                      │
│  • Links to /download page                                 │
│  • Shows across multiple pages                             │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

---

## Installation Prompt Lifecycle

```
Page Load
    │
    ├─→ Browser fires 'beforeinstallprompt' event
    │   │
    │   └─→ [Client] handleBeforeInstallPrompt()
    │       ├─ Prevent default
    │       ├─ Save deferredPrompt
    │       └─ Set canInstall = true
    │
    ├─→ Render download page
    │   │
    │   └─→ Show download button (enabled)
    │
    ├─→ User clicks "Download & Install"
    │   │
    │   ├─→ trackDownload() → POST to API
    │   │
    │   ├─→ Call deferredPrompt.prompt()
    │   │   │
    │   │   └─→ Browser shows install dialog
    │   │
    │   ├─→ User accepts/rejects
    │   │   │
    │   │   ├─ ACCEPTED:
    │   │   │  ├─ Show success message
    │   │   │  ├─ Fire 'appinstalled' event
    │   │   │  ├─ Set isInstalled = true
    │   │   │  └─ Update button state
    │   │   │
    │   │   └─ DISMISSED:
    │   │      └─ Keep prompt for next time
    │   │
    │   └─→ Response received
    │       └─ Update UI accordingly
    │
    ├─→ App Installation Complete
    │   │
    │   └─→ Browser adds to home screen/apps
    │
    └─→ Display Mode Detection
        └─ window.matchMedia('(display-mode: standalone)')
           └─ Returns true if installed & running as app

On Subsequent Visits:
    │
    ├─→ Browser detects standalone mode
    │   └─ deferredPrompt won't fire again
    │
    ├─→ Show "✓ Already Installed" button
    │
    └─→ Hide PWAPrompt component
```

---

## Database Relationships & Queries

```
pwa_downloads Table
├─ id (PRIMARY KEY)
│  └─ Used for: Unique record identification
│
├─ platform (VARCHAR)
│  └─ Values: 'web', 'ios', 'android', 'unknown'
│     Used for: Statistics breakdown by platform
│
├─ user_agent (TEXT)
│  └─ Example: "Mozilla/5.0 (Windows...; Chrome..."
│     Used for: Browser & OS identification
│
├─ ip_address (INET)
│  └─ Example: "192.168.1.1"
│     Used for: Geographic analysis, duplicate detection
│
├─ downloaded_at (TIMESTAMP)
│  └─ Example: "2024-03-16 10:30:00+00"
│     Used for: Time-based queries, trends
│
└─ created_at (TIMESTAMP)
   └─ Default: NOW()
      Used for: Server-side timestamp


Key Query Patterns:

1. Total Downloads (All-time)
   SELECT COUNT(*) FROM pwa_downloads;

2. Today's Downloads
   SELECT COUNT(*) FROM pwa_downloads 
   WHERE DATE(downloaded_at) = CURRENT_DATE;

3. Last 7 Days
   SELECT COUNT(*) FROM pwa_downloads 
   WHERE downloaded_at > NOW() - INTERVAL '7 days';

4. Platform Breakdown
   SELECT platform, COUNT(*) as count 
   FROM pwa_downloads 
   GROUP BY platform;

5. Recent Downloads (Last N)
   SELECT * FROM pwa_downloads 
   ORDER BY downloaded_at DESC 
   LIMIT 50;

6. Daily Average
   SELECT EXTRACT(DAY FROM downloaded_at), AVG(count) 
   FROM pwa_downloads 
   GROUP BY EXTRACT(DAY FROM downloaded_at);
```

---

## Error Handling Flow

```
User Action
    │
    ├─→ Try to Track Download
    │   │
    │   └─→ POST /api/download/track
    │       │
    │       ├─ Network Error (CORS, Connection)
    │       │  └─ Catch: console.error(), continue silently
    │       │
    │       ├─ API Returns 500
    │       │  └─ Catch: Log error, show toast message
    │       │
    │       ├─ Database Insert Fails
    │       │  └─ Response: { error: 'Failed to track' }
    │       │
    │       └─ Success
    │          └─ Response: { success: true, id: 123 }
    │
    ├─→ Try to Get Statistics
    │   │
    │   └─→ GET /api/download/stats
    │       │
    │       ├─ Network Error → Show warning, use cached
    │       ├─ API Error → Display "Stats unavailable"
    │       └─ Success → Update stats display
    │
    ├─→ Try to Install PWA
    │   │
    │   └─→ Call deferredPrompt.prompt()
    │       │
    │       ├─ Browser Error → Show fallback instructions
    │       ├─ User Dismisses → Allow retry
    │       └─ User Accepts → Proceed with install
    │
    └─→ Page Navigation
        │
        └─→ Try to Fetch Stats on New Page
            │
            ├─ Fail → Continue without stats
            └─ Success → Display stats
```

---

## Security & Rate Limiting

```
Request → Rate Limiter
    │
    ├─→ Check Request Rate
    │   │
    │   ├─ Within Limit → Continue ✓
    │   │
    │   └─ Exceeded Limit → 429 Too Many Requests
    │       └─ Response Headers:
    │          Retry-After: 60
    │
    ├─→ CORS Validation
    │   │
    │   ├─ Origin Allowed → Continue ✓
    │   │
    │   └─ Origin Not Allowed → Block
    │
    ├─→ CSRF Protection
    │   │
    │   ├─ Token Valid → Continue ✓
    │   │
    │   └─ Token Invalid → 403 Forbidden
    │
    ├─→ Input Validation
    │   │
    │   ├─ Data Valid → Continue ✓
    │   │
    │   └─ Invalid Data → 400 Bad Request
    │
    └─→ Database RLS Policies
        │
        ├─ SELECT: Allow all (public stats)
        ├─ INSERT: Allow all (public tracking)
        └─ UPDATE/DELETE: Deny (protected)
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│           Production Environment                 │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ Frontend (Vercel/Railway)                 │  │
│  │ • /download route                          │  │
│  │ • PWA manifest                             │  │
│  │ • Service worker                           │  │
│  │ • HTTPS enabled                            │  │
│  └───────────────────────────────────────────┘  │
│              ↓ (API calls)                       │
│  ┌───────────────────────────────────────────┐  │
│  │ Backend (Railway/Koyeb)                   │  │
│  │ • Express.js API server                    │  │
│  │ • Download routes                          │  │
│  │ • Rate limiting                            │  │
│  │ • Logging & monitoring                     │  │
│  └───────────────────────────────────────────┘  │
│              ↓ (Database queries)                │
│  ┌───────────────────────────────────────────┐  │
│  │ Database (Supabase PostgreSQL)            │  │
│  │ • pwa_downloads table                      │  │
│  │ • RLS policies                             │  │
│  │ • Indexes & views                          │  │
│  │ • Backups enabled                          │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## File Organization

```
Project Root
├── frontend/
│   ├── app/
│   │   └── download/
│   │       └── page.tsx                  ← Main download page
│   │
│   ├── components/
│   │   ├── PWAPrompt.tsx                 ← Floating prompt
│   │   └── DownloadBanner.tsx            ← Promo banner
│   │
│   ├── lib/
│   │   └── usePWAInstall.ts              ← PWA hook
│   │
│   └── public/
│       ├── manifest.json                 ← PWA manifest
│       ├── favicon.svg                   ← App icon
│       └── sw.js                         ← Service worker
│
├── backend/
│   └── src/
│       └── routes/
│           └── download.routes.ts        ← API endpoints
│
└── docs/
    ├── PWA_DOWNLOAD_PAGE_GUIDE.md
    ├── PWA_DOWNLOAD_QUICK_REFERENCE.md
    ├── PWA_DOWNLOAD_SETUP_CHECKLIST.md
    └── PWA_DOWNLOAD_IMPLEMENTATION_SUMMARY.md
```

---

This architecture provides a scalable, secure, and user-friendly PWA download system for ABIFRESH.
