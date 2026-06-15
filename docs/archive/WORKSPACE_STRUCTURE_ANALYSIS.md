# ABIFRESH & KIDDIES VENTURES - Project Structure Analysis

## Project Overview
**ABIFRESH & KIDDIES VENTURES** is a Progressive Web App (PWA) sales management system for managing inventory, sales, commissions, and payments across multiple roles and locations.

---

## 1. MAIN TECH STACK

### Frontend
- **Framework**: Next.js 13.5+ (React 18.2)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + PostCSS + Autoprefixer
- **UI Components**: Lucide React icons
- **PWA**: next-pwa (service workers, offline support)
- **State Management**: Zustand (auth store, theme store)
- **HTTP Client**: Axios
- **Notifications**: react-toastify, sonner
- **Data Export**: XLSX (Excel), jsPDF (PDF generation)
- **Charts**: Recharts
- **Other**: html2canvas, date-fns, clsx

### Backend
- **Framework**: Express.js with TypeScript
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, rate limiting, CSRF protection
- **Logging**: Winston with daily rotating files
- **File Upload**: Multer, express-fileupload
- **Password Hashing**: bcrypt
- **Real-time**: WebSocket support

### Database
- **Provider**: Supabase (PostgreSQL-based)
- **Tables**: users, sales, inventory, payments, posted_items, notifications, receipts, expenses, etc.
- **Storage Buckets**: For product images, receipts, and downloads

### Deployment
- **Frontend**: Vercel (Next.js deployment)
- **Backend**: Node.js server (can run on Koyeb, Railway, or self-hosted)

---

## 2. KEY DIRECTORIES & PURPOSES

### Frontend Structure (`/frontend`)
```
frontend/
├── app/                          # Next.js app directory (routing)
│   ├── login/                   # Login page with role-based redirect
│   ├── admin/                   # Admin dashboard and management
│   ├── sales/                   # Sales staff portal
│   ├── staff/                   # Commission/Non-commission staff portal
│   ├── superadmin/              # Superadmin portal
│   ├── api/                     # API routes (if using Next.js API routes)
│   ├── download/                # PWA download functionality
│   ├── layout.tsx               # Root layout with PWA setup
│   └── providers.tsx            # Context providers setup
│
├── components/                  # Reusable React components
│   ├── Sidebar.tsx              # Collapsible navigation sidebar (role-aware)
│   ├── Header.tsx               # Top navigation header
│   ├── NotificationsDrawer.tsx   # Notification panel
│   ├── UserProfileDropdown.tsx   # User profile menu
│   ├── PWAPrompt.tsx            # PWA install prompt
│   ├── ToastContainer.tsx       # Toast notifications
│   └── ...                      # Other UI components
│
├── context/                     # React Context providers
│   ├── NotificationContext.tsx   # Real-time notifications (polling/WebSocket)
│   └── ToastContext.tsx          # Toast notification state
│
├── lib/                         # Utility functions & helpers
│   ├── api.ts                   # Axios instance with token injection
│   ├── supabase.ts              # Supabase client config
│   ├── receipt-utils.ts         # Receipt printing/PDF generation
│   ├── format-quantity.ts       # Quantity formatting utilities
│   ├── NotificationService.ts   # Notification management
│   └── usePWAInstall.ts         # PWA install hook
│
├── store/                       # Zustand stores (state management)
│   └── auth.ts                  # Authentication & theme store
│
├── public/                      # Static assets
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker
│   └── favicon files
│
└── package.json                 # Frontend dependencies
```

### Backend Structure (`/backend`)
```
backend/
├── src/
│   ├── config/
│   │   ├── supabase.ts          # Supabase admin client
│   │   ├── logger.ts            # Winston logger setup
│   │   ├── security.ts          # Security headers
│   │   └── storage-init.ts      # Storage bucket initialization
│   │
│   ├── routes/                  # API route handlers
│   │   ├── auth.routes.ts       # Login, logout, token refresh
│   │   ├── sales.routes.ts      # Sales operations (record, dashboard, etc.)
│   │   ├── admin.routes.ts      # Admin operations (staff, commissions, payments)
│   │   ├── staff.routes.ts      # Staff operations (posted items, make-sale, etc.)
│   │   ├── inventory.routes.ts  # Inventory management
│   │   ├── receipts.routes.ts   # Receipt generation & storage
│   │   ├── notifications.routes.ts # Notifications
│   │   ├── download.routes.ts   # PWA download functionality
│   │   └── backup.routes.ts     # Data backup/export
│   │
│   ├── controllers/             # Business logic (if using MVC pattern)
│   ├── services/                # Service layer
│   │   ├── auth.service.ts
│   │   ├── sales.service.ts
│   │   ├── admin.service.ts
│   │   ├── staff-store.service.ts
│   │   ├── storage.service.ts   # Handle file uploads/downloads
│   │   └── ...
│   │
│   ├── middleware/              # Express middleware
│   │   ├── auth.ts              # JWT verification & role checking
│   │   ├── rateLimit.ts         # Rate limiting
│   │   ├── csrf.ts              # CSRF protection
│   │   └── validation.ts        # Request validation
│   │
│   ├── types/                   # TypeScript interfaces
│   ├── utils/                   # Helper utilities
│   └── index.ts                 # Main Express app setup
│
├── migrations/                  # Database migrations
├── package.json                 # Backend dependencies
└── Dockerfile                   # Docker configuration
```

---

## 3. KEY PAGES & FUNCTIONALITY

### Make Sale Page
- **Frontend**: `/frontend/app/sales/make-sale/page.tsx` & `/frontend/app/staff/make-sale/page.tsx`
- **Backend API**: `POST /api/sales/create`
- **Functionality**:
  - Search and filter products
  - Add items to cart (with quantities)
  - Select payment method (cash, POS, transfer)
  - Option to sell "outside Jalingo" (commission staff only)
  - Generate & print receipt
  - Store sale in database

### Staff Payments Page
- **Frontend**: `/frontend/app/staff/payments/page.tsx`
- **Backend API**: `GET /api/staff/payments`, `POST /api/staff/payments/request`
- **Functionality**:
  - View pending payments
  - Create payment requests
  - Upload payment receipts
  - Manage payment status (pending, approved, rejected)
  - Filter by date, payment method, status

### Posted Items Page
- **Frontend**: `/frontend/app/staff/posted-items/page.tsx`
- **Backend API**: `GET /api/staff/posted-items`
- **Functionality**:
  - View items posted to the staff by sales persons
  - Accept/reject posted items
  - Track commission on items
  - See posted item status

### Admin Dashboard
- **Frontend**: `/frontend/app/admin/dashboard/page.tsx`
- **Backend API**: `GET /api/admin/dashboard`
- **Functionality**:
  - View sales summary, revenue, pending payments
  - Monitor staff performance
  - Access reports and analytics

### Admin Payments Management
- **Frontend**: `/frontend/app/admin/payments/page.tsx`
- **Backend API**: `GET /api/admin/payments`, `POST /api/admin/payments/approve`
- **Functionality**:
  - Review submitted payments from staff
  - Approve/reject payments
  - Add notes to payments
  - Generate payment reports

---

## 4. AUTHENTICATION & ROLE SYSTEM

### User Roles
1. **superadmin** - Full system access, user management, reports
2. **admin** - Manage staff, inventory, commissions, payments
3. **sales** / **sales_staff** - Record sales, post items to staff, manage payments
4. **staff_commission** / **commission_staff** - Make sales with commission tracking, view commissions
5. **staff_non_commission** / **non_commission_staff** - Make sales without commission tracking

### Authentication Flow
1. User logs in with `username` + `password` at `/login`
2. Backend validates credentials and issues JWT token
3. Token stored in localStorage (`auth-storage` via Zustand)
4. Token automatically added to all API requests (via Axios interceptor)
5. Role-based redirect after login:
   - `superadmin` → `/superadmin/dashboard`
   - `admin` → `/admin/dashboard`
   - `sales_*` → `/sales/dashboard`
   - `*_staff` / `staff_*` → `/staff/dashboard`

### Authentication Store (`/frontend/store/auth.ts`)
```typescript
useAuthStore: {
  user: User | null,
  token: string | null,
  isAuthenticated: boolean,
  setUser(user),
  setToken(token),
  logout(),
  hydrateFromStorage()
}

useThemeStore: {
  theme: 'light' | 'dark',
  toggleTheme()
}
```

### Backend Auth Middleware
- Location: `/backend/src/middleware/auth.ts`
- Verifies JWT token
- Checks user exists in database
- Validates user is not deactivated
- Injects user info into `req.user`
- Role-based access control: `roleMiddleware('admin', 'sales')`

---

## 5. NAVIGATION & HAMBURGER MENU STRUCTURE

### Sidebar Component (`/frontend/components/Sidebar.tsx`)
- **Responsive**: Fixed on desktop (md breakpoint), collapsible hamburger on mobile
- **Features**:
  - Mobile hamburger toggle (top-left, pink button)
  - Desktop collapse/expand button
  - Role-aware title display
  - Badge counting (notifications, pending items)
  - Active route highlighting
  - Dark mode support

### Navigation Menu Items by Role

#### Sales Staff Menu (`/frontend/app/sales/layout.tsx`)
```
📊 Dashboard
💰 Make Sale
✅ Available Items
❌ Unavailable Items
📤 Post Items (to staff)
↪️ Returned Items (badge: pending count)
💳 Make Payment
💸 Expenses
🧾 Receipts
🔔 Notifications
```

#### Staff Menu (`/frontend/app/staff/layout.tsx`)
```
📊 Dashboard
📥 Posted Items (badge: pending count)
🛒 Make Sale
↩️ Return Items (badge: pending count)
💳 Make Payment
💸 Expenses
🧾 Receipts
💰 Commissions (only for commission staff)
🔔 Notifications
```

#### Admin Menu (`/frontend/app/admin/layout.tsx`)
```
📊 Dashboard
🔔 Notifications
🏪 Staff Stores
📮 Post Items
📦 Inventory
💳 Payments (badge: pending count)
📄 Receipts
💵 Commissions
📋 Expenses Tracker
💰 My Expenses
📈 Reports
🛍️ Items
🛒 Restock Orders
👥 Staff Management
(more items...)
```

### Header Component (`/frontend/components/Header.tsx`)
- Shows current user info
- Theme toggle (light/dark mode)
- User profile dropdown
- Installation button (PWA)
- Search bar (context-aware)

---

## 6. API ENDPOINTS STRUCTURE

### Authentication
```
POST /api/auth/login              # Login with username/password
POST /api/auth/logout             # Logout
POST /api/auth/refresh-token      # Refresh JWT token
```

### Sales Operations
```
GET  /api/sales/items/available          # Get available items for sale
GET  /api/sales/items/unavailable        # Get unavailable items
POST /api/sales/record                   # Record single sale
POST /api/sales/create                   # Create sale (for make-sale)
POST /api/sales/post-items               # Post items to staff (batch)
GET  /api/sales/dashboard                # Sales dashboard data
GET  /api/sales/payments                 # View payment submissions
POST /api/sales/payments/request         # Submit payment request
GET  /api/sales/returned-items           # View returned items
```

### Admin Operations
```
GET  /api/admin/staff                      # List all staff
POST /api/admin/staff/create               # Create new staff user
GET  /api/admin/payments                   # Review staff payments
POST /api/admin/payments/approve           # Approve payment
POST /api/admin/payments/reject            # Reject payment
GET  /api/admin/commissions                # View commissions
POST /api/admin/commissions/set            # Set commission for staff
GET  /api/admin/inventory                  # View inventory
```

### Staff Operations
```
GET  /api/staff/my-sales                   # Get staff's own sales
GET  /api/staff/posted-items               # Get items posted to staff
POST /api/staff/posted-items/accept        # Accept posted item
POST /api/staff/posted-items/reject        # Reject posted item
GET  /api/staff/payments                   # View own payments
POST /api/staff/payments/request           # Request payment
```

### Common Endpoints
```
GET  /api/notifications                    # Get user notifications
POST /api/notifications/mark-read          # Mark notification as read
GET  /api/receipts                         # Get receipts
POST /api/receipts/upload                  # Upload receipt
POST /api/expenses                         # Record expense
GET  /health                               # Health check
```

---

## 7. DATABASE SCHEMA (Key Tables)

### Core Tables
- **users** - User accounts (email, password_hash, full_name, role, store_location, is_active)
- **sales** - Sale transactions (sales_person_id, item_id, quantity, total_amount, payment_method, created_at)
- **inventory** - Product inventory (name, sku, price_jalingo, unit_price, active_store_quantity, commission)
- **posted_items** - Items posted to staff (poster_id, staff_id, item_id, quantity, status)
- **payments** - Payment transactions (staff_id, amount, payment_method, status, approval_date)
- **notifications** - System notifications (user_id, type, message, is_read)
- **receipts** - Sale receipts (sale_id, receipt_url, generated_at)
- **expenses** - Expense tracking (staff_id, category, amount, description)

---

## 8. KEY PATTERNS & CONVENTIONS

### Component Organization
- **Client-side components**: Use `'use client'` directive
- **Server-side functions**: In `/app/api/` or `/lib/server/`
- **Shared utilities**: In `/lib/`

### State Management
- **Zustand stores**: For global auth and theme state
- **React Context**: For notifications and toasts
- **Component state**: For local UI state (forms, modals)

### API Communication
- All API calls use axios instance at `/lib/api.ts`
- Automatic token injection in Authorization header
- Error handling with response interceptors
- Logout on 401 from auth endpoints

### Error Handling
- Try-catch blocks in all async functions
- User-friendly error messages via toast notifications
- Server logs errors with Winston logger
- Rate limiting to prevent abuse

### Security Features
- **JWT Authentication**: Token-based auth
- **Role-based Access Control**: Middleware checks user role
- **CSRF Protection**: CSRF token validation
- **Rate Limiting**: Per-endpoint rate limiters
- **Helmet Security Headers**: XSS, HSTS, X-Frame-Options
- **Input Validation**: Request validation middleware
- **Password Hashing**: bcrypt for password storage

---

## 9. PWA FEATURES

### Service Worker (`/frontend/public/sw.js`)
- Offline support
- Cache strategies for assets
- Background sync for updates

### Manifest (`/frontend/public/manifest.json`)
- App name: ABIFRESH
- Display mode: standalone/fullscreen
- Theme colors and icons

### Installation
- Install button component
- Native `beforeinstallprompt` event handling
- Download functionality for offline use

---

## 10. REAL-TIME FEATURES

### Notifications
- **Polling-based**: By default, polls `/api/notifications` every few seconds
- **Real-time updates**: Can use WebSocket for live updates
- **Unread count**: Displayed in sidebar badges and notifications drawer
- **Mark as read**: Individual or bulk marking

### Dashboard Updates
- Auto-refresh every 15-30 seconds
- Polling for pending payments, posted items, returns

---

## 11. FILE NAMING & CODE STYLE

### TypeScript
- `.ts` for server-side code
- `.tsx` for React components
- Strict mode enabled (`strict: true` in tsconfig)

### Component Naming
- PascalCase for component files: `Header.tsx`, `Sidebar.tsx`
- camelCase for utility files: `api.ts`, `receipt-utils.ts`

### Styling
- Tailwind CSS utility classes
- Dark mode support: `dark:` prefix for dark theme
- Responsive: `md:` breakpoint at 768px

### Code Organization
- Each route has its own folder with `page.tsx`
- Shared components in `/components`
- Utility functions in `/lib`
- Services in `/backend/src/services`
- Type definitions in TypeScript files or `/backend/src/types`

---

## 12. ENVIRONMENT VARIABLES

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000  # Backend API URL
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Backend (`.env`)
```
PORT=5000
JWT_SECRET=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
CORS_ORIGIN=http://localhost:3000
```

---

## 13. QUICK REFERENCE: COMMON TASKS

### Add a New Page
1. Create folder in `/frontend/app/[role]/[feature]/`
2. Add `page.tsx` with `'use client'` directive
3. Use `useAuthStore` to get user info
4. Call API endpoints for data
5. The layout automatically adds navigation

### Add a New API Endpoint
1. Create new route file in `/backend/src/routes/` or add to existing
2. Import `authMiddleware` and `roleMiddleware` for protection
3. Add error handling with try-catch
4. Return JSON response
5. Register route in `/backend/src/index.ts`

### Add Authentication Check
```typescript
import { useAuthStore } from '@/store/auth';

const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

// Redirect if not authenticated
if (!isAuthenticated) router.push('/login');
```

---

## 14. DEVELOPMENT SETUP

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

### Backend
```bash
cd backend
npm install
npm run dev  # Runs on http://localhost:5000
```

### Database
- Supabase project (free tier available)
- Run migrations from `/migrations` folder
- Create storage buckets for images/receipts

---

**Last Updated**: May 10, 2026
**Project Name**: ABIFRESH & KIDDIES VENTURES PWA Sales Management System
