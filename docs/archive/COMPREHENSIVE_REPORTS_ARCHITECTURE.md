# Comprehensive Reports - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPREHENSIVE REPORTS SYSTEM                      │
└─────────────────────────────────────────────────────────────────────┘

┌─ FRONTEND (Next.js/React) ──────────────────────────────────────────┐
│                                                                       │
│  📄 /admin/reports/page.tsx (1000+ lines)                           │
│  ├─ 5 Tabs (Overview, Sales, Expenses, Inventory, Performance)     │
│  ├─ Advanced Filtering System                                        │
│  │  ├─ Date Range Selector                                          │
│  │  ├─ Staff Member Dropdown                                        │
│  │  ├─ Staff Role Filter                                            │
│  │  └─ Custom Date Range                                            │
│  ├─ 6 KPI Summary Cards                                             │
│  ├─ Multiple Visualizations                                         │
│  │  ├─ BarCharts (5 instances)                                      │
│  │  ├─ LineCharts (3 instances)                                     │
│  │  ├─ PieCharts (2 instances)                                      │
│  │  └─ ComposedCharts (1 instance)                                  │
│  ├─ Data Tables (4 major tables)                                    │
│  ├─ Staff Detail Modal                                              │
│  ├─ Dark Mode Support                                               │
│  └─ Responsive Design (Mobile/Tablet/Desktop)                       │
│                           │                                          │
│                           ↓ (API Request)                            │
│                    GET /api/admin/reports/comprehensive              │
│                    ?dateRange=month&staffId=UUID&staffRole=...      │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/JSON
                              │
┌─ BACKEND (Express.js) ──────↓───────────────────────────────────────┐
│                                                                       │
│  🔌 /api/admin/reports/comprehensive (Route Handler)                │
│  ├─ Authentication Check ✓                                          │
│  ├─ Authorization Check (admin role) ✓                              │
│  └─ Request Logging                                                 │
│                           │                                          │
│                           ↓                                          │
│  📊 adminService.getComprehensiveReport()                           │
│  ├─ Date Range Calculation                                          │
│  │  ├─ Today: Midnight to Midnight                                 │
│  │  ├─ Week: Last 7 days                                           │
│  │  ├─ Month: 1st to now                                           │
│  │  ├─ Year: Jan 1 to now                                          │
│  │  └─ Custom: User specified                                      │
│  │                                                                  │
│  ├─ Multi-Table Queries with JOINs                                  │
│  │  ├─ Sales + Users + Items                                       │
│  │  ├─ Expenses + Users                                            │
│  │  ├─ Inventory (Main Store)                                      │
│  │  └─ Inventory (Active Store)                                    │
│  │                                                                  │
│  ├─ Data Aggregation (Map-based)                                   │
│  │  ├─ Group Sales by Staff                                        │
│  │  ├─ Group Sales by Role                                         │
│  │  ├─ Group Sales by Day                                          │
│  │  ├─ Group Sales by Item                                         │
│  │  ├─ Group Expenses by Staff                                     │
│  │  ├─ Group Expenses by Type                                      │
│  │  ├─ Group Expenses by Day                                       │
│  │  ├─ Calculate Performance Metrics                               │
│  │  └─ Identify Low Stock Items                                    │
│  │                                                                  │
│  └─ Return Comprehensive Report Object                              │
│                           │                                          │
└───────────────────────────↓───────────────────────────────────────┘
                              │
┌─ DATABASE (PostgreSQL/Supabase) ──────────────────────────────────┐
│                                                                    │
│  Tables Queried:                                                  │
│  ├─ 📊 sales                                                      │
│  │   └─ Joined with: users, items                                 │
│  ├─ 💸 staff_expenses                                             │
│  │   └─ Joined with: users                                        │
│  ├─ 👥 users                                                      │
│  ├─ 📦 items                                                      │
│  ├─ 🏪 inventory_main_store                                       │
│  └─ 🏬 inventory_active_store                                     │
│                                                                    │
│  No new tables required - Uses existing schema                    │
│                                                                    │
└────────────────────────────────────────────────────────────────┘


## Data Flow Sequence

1. USER ACTION
   └─ Clicks "Reports" in admin menu
   └─ Selects filters (date range, staff, role)

2. FRONTEND
   └─ Displays loading spinner
   └─ Makes API request with filters

3. BACKEND ROUTE
   └─ Validates authentication token
   └─ Checks admin authorization
   └─ Passes to service layer

4. REPORT SERVICE
   ├─ Calculates date range from filter
   ├─ Builds database queries with JOINs
   ├─ Fetches data from 5+ tables
   ├─ Aggregates into structured format
   └─ Returns comprehensive object

5. RESPONSE
   └─ JSON sent to frontend
   └─ Frontend stores in React state

6. RENDERING
   ├─ Charts render with Recharts
   ├─ Tables populate with data
   ├─ Cards display KPIs
   └─ Loading spinner hidden

7. INTERACTIVITY
   ├─ User can switch tabs
   ├─ Change filters
   ├─ Click for details
   └─ New data automatically fetched


## Component Hierarchy

Reports Page Component
├── Filter Section
│   ├── Date Range Selector
│   ├── Staff Member Dropdown
│   ├── Staff Role Selector
│   ├── Custom Date Inputs
│   └── Export Button
│
├── Tab Navigation
│   ├── Overview Tab
│   ├── Sales Analysis Tab
│   ├── Expenses Tab
│   ├── Inventory Tab
│   └── Performance Tab
│
├── Overview Tab Content
│   ├── KPI Cards (6)
│   │   ├── Total Revenue
│   │   ├── Total Expenses
│   │   ├── Total Profit
│   │   ├── Items Sold
│   │   ├── Total Transactions
│   │   └── Avg Transaction
│   ├── Sales by Staff (BarChart)
│   ├── Sales by Role (PieChart)
│   └── Sales Trend (LineChart)
│
├── Sales Tab Content
│   ├── Top Items Table
│   └── Detailed Chart (ComposedChart)
│
├── Expenses Tab Content
│   ├── Summary Cards (3)
│   ├── Expenses by Staff (BarChart)
│   ├── Expenses by Type (PieChart)
│   └── Expenses Trend (LineChart)
│
├── Inventory Tab Content
│   ├── Summary Cards (3)
│   ├── Main Store Table
│   ├── Active Store Table
│   └── Low Stock Alert Section
│
├── Performance Tab Content
│   ├── Top Staff Chart (BarChart)
│   ├── Top Items Chart (BarChart)
│   ├── Staff Details Table
│   └── Staff Detail Modal
│
└── Global Features
    ├── Loading Spinner
    ├── Error Handling
    ├── Dark Mode Support
    └── Responsive Layout


## State Management (React Hooks)

```typescript
const [report, setReport] = useState<ComprehensiveReport | null>(null)
const [isLoading, setIsLoading] = useState(true)
const [activeTab, setActiveTab] = useState('overview')
const [filters, setFilters] = useState<ReportFilters>({
  dateRange: 'month',
  staffId?: string,
  staffRole?: string,
  customFrom?: string,
  customTo?: string
})
const [staff, setStaff] = useState<any[]>([])
const [showDetailsModal, setShowDetailsModal] = useState(false)
const [selectedStaffDetail, setSelectedStaffDetail] = useState<any>(null)
```

## API Response Structure

```json
{
  "summary": {
    "total_sales": number,
    "total_revenue": number,
    "total_expenses": number,
    "total_profit": number,
    "total_items_sold": number,
    "avg_transaction": number
  },
  "sales": {
    "by_staff": [
      {
        "staff_id": "uuid",
        "staff_name": "string",
        "total_sales": number,
        "total_amount": number,
        "items_count": number
      }
    ],
    "by_staff_role": [
      {
        "role": "string",
        "total_sales": number,
        "total_amount": number
      }
    ],
    "by_day": [
      {
        "date": "YYYY-MM-DD",
        "total_sales": number,
        "total_amount": number
      }
    ],
    "items_list": [
      {
        "item_id": "uuid",
        "item_name": "string",
        "quantity_sold": number,
        "total_revenue": number,
        "avg_price": number
      }
    ]
  },
  "expenses": {
    "total": number,
    "by_staff": [
      {
        "staff_id": "uuid",
        "staff_name": "string",
        "total_amount": number,
        "count": number
      }
    ],
    "by_type": [
      {
        "expense_type": "string",
        "total_amount": number,
        "count": number
      }
    ],
    "by_day": [
      {
        "date": "YYYY-MM-DD",
        "total_amount": number
      }
    ]
  },
  "inventory": {
    "main_store_total": number,
    "main_store_items": [{ item_data }],
    "active_store_total": number,
    "active_store_items": [{ item_data }],
    "low_stock_items": [{ item_with_reorder_level }]
  },
  "performance": {
    "top_staff": [{ staff_with_revenue }],
    "top_items": [{ item_with_revenue }],
    "staff_details": [
      {
        "staff_id": "uuid",
        "staff_name": "string",
        "role": "string",
        "total_transactions": number,
        "total_revenue": number,
        "total_expenses": number,
        "profit_loss": number
      }
    ]
  }
}
```

## Technology Stack

**Frontend:**
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React Icons

**Backend:**
- Node.js
- Express.js
- TypeScript
- Supabase Admin SDK
- PostgreSQL

**DevOps:**
- npm (package management)
- TypeScript Compiler
- Nodemon (development)

## Performance Optimization

**Database:**
- JOINs instead of multiple queries
- Single query per data type where possible
- Indexed columns for filtering

**Frontend:**
- Component memoization where needed
- Lazy loading for modals
- CSS-based dark mode toggle
- Responsive images and charts

**API:**
- Efficient data aggregation with Maps
- O(1) lookup performance
- Minimal data duplication

## Security Architecture

```
HTTP Request
    ↓
JWT Token Validation
    ↓
Role-Based Access Control (Admin check)
    ↓
Data Filtering (by staff if applicable)
    ↓
Secure Database Query
    ↓
Response with Audit Logging
```

## Monitoring & Logging

- Console logging at each service step
- Request/response logging in routes
- Error tracking with stack traces
- Admin activity audit trail
- Performance timing

## Scalability

- Handles 1000+ records efficiently
- Supports multiple concurrent users
- Can process 100+ staff members
- Multiple store locations manageable
- Extensible for future tables

