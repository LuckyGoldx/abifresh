// =====================
// Frontend Shared Types
// =====================
// Centralized type definitions for all duplicated interfaces across
// admin/sales/staff/superadmin role pages.
//
// Usage: import { Staff, Receipt, Payment, ... } from '@/types';

import type React from 'react';

// =====================
// 1. User / Auth
// =====================

export type UserRole =
  | 'admin'
  | 'superadmin'
  | 'sales'
  | 'sales_staff'
  | 'staff_commission'
  | 'commission_staff'
  | 'staff_non_commission'
  | 'non_commission_staff';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  username: string;
  phone_number?: string;
  role: UserRole;
  is_active: boolean;
  store_location: string;
  created_at: string;
  updated_at?: string;
}

/** Full staff record (used in admin/superadmin staff management pages) */
export interface Staff {
  id: string;
  email: string;
  full_name: string;
  username: string;
  phone_number?: string;
  role: string;
  store_location?: string;
  is_active?: boolean;
  created_at?: string;
}

/** Lightweight staff reference (used in dashboards, receipts, etc.) */
export interface StaffInfo {
  id: string;
  full_name: string;
  username: string;
  role: string;
  email?: string;
  phone_number?: string;
  is_active?: boolean;
}

export interface StaffStats {
  total: number;
  sales_staff?: number;
  commission_staff?: number;
  non_commission_staff?: number;
  admin?: number;
  superadmin?: number;
}

/** Staff member returned by GET /api/sales/staff-list (uses `name` + `role_display`) */
export interface SalesStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  role_display: string;
}

// =====================
// 2. Items / Inventory
// =====================

export interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand?: string;
  package_type?: string;
  price_jalingo: number;
  price_outside?: number;
  unit_price: number;
  commission: number;
  image_url?: string;
  active_store_quantity: number;
  main_store_quantity: number;
  quantity: number; // used in staff make-sale
  location?: string; // used in staff make-sale
  is_available?: boolean;
  created_at?: string;
}

/** Cart item for sales flows (make-sale, sales dashboard) */
export interface SaleCartItem extends Item {
  sale_quantity: number;
  payment_method?: 'cash' | 'pos' | 'transfer';
  sold_outside_jalingo?: boolean;
}

/** Cart item for post-items flows */
export interface PostCartItem extends Item {
  post_quantity: number;
}

// =====================
// 3. Receipts
// =====================

export interface ReceiptItem {
  id?: string;
  item_id: string | { name: string; price_jalingo?: number; price_outside?: number };
  item_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  total_amount: number;
  payment_method: 'cash' | 'pos' | 'transfer' | string;
  items_count?: number;
  created_at: string;
  staff_id?: string;
  staff_name?: string;
  sold_outside_jalingo?: boolean;
  receipt_items?: ReceiptItem[];
  items?: any[];
  date?: Date | string;
  logistics_fee?: number;
}

// =====================
// 4. Payments
// =====================

export interface PaymentItem {
  item_id: string;
  item_name: string;
  quantity: number;
  amount: number;
}

export interface Payment {
  id: string;
  staff_id?: string;
  staff_name: string;
  staff_email?: string;
  staff_role?: string;
  staff_phone?: string;
  amount: number;
  payment_type: string;
  payment_method?: string;
  status: string;
  notes?: string;
  reference_number?: string;
  items_paid_for?: PaymentItem[] | any[];
  receipt_url?: string;
  requested_date?: string;
  approved_date?: string;
  created_at: string;
  rejection_reason?: string;
  approved_by_name?: string;
  approved_amount?: number;
}

export interface StaffSummaryRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  total_qty: number;
  total_sales_amount: number;
  pending_amount: number;
  approved_amount: number;
  outstanding_amount: number;
}

// =====================
// 5. Dashboard Stats (role-specific)
// =====================

export interface AdminDashboardStats {
  today_sales: number;
  today_amount: number;
  today_items?: number;
  total_sales: number;
  total_amount: number;
  total_items: number;
  total_staff: number;
  pending_approvals: number;
  pending_amount: number;
}

export interface SuperAdminDashboardStats extends AdminDashboardStats {
  active_users: number;
  inactive_users: number;
}

export interface SalesDashboardStats {
  today_items_sold: number;
  today_amount_sold: number;
  all_time_items_sold: number;
  all_time_amount_sold: number;
  available_items_count: number;
}

export interface StaffDashboardData {
  total_items_sold: number;
  total_amount_sold: number;
  total_posted_items: number;
  pending_payment_count: number;
  pending_posted_items: number;
  pending_payment_amount: number;
  approved_amount: number;
  total_expenses: number;
  unread_notifications: number;
  total_commission: number;
  paid_commission: number;
  is_commission_staff: boolean;
}

// =====================
// 6. Sales
// =====================

export interface Sale {
  id: string;
  item_id: string;
  item_name?: string;
  items?: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unit_price?: number;
  price_jalingo: number;
  total_amount: number;
  payment_method: string;
  sale_date: string;
  receipt_number?: string;
  sold_outside_jalingo?: boolean;
  sale_ids?: string[]; // multiple transaction UUIDs when grouped
}

// =====================
// 7. Expenses
// =====================

/** Simple expense (used in admin/my-expenses, sales/expenses, staff/expenses) */
export interface Expense {
  id: string;
  amount: number;
  category?: string;
  expense_type?: string;
  description?: string;
  admin_notes?: string;
  status?: string; // 'pending' | 'approved' | 'disapproved'
  expense_date: string;
  created_at: string;
}

/** Full expense record with staff info (used in admin/expenses) */
export interface ExpenseItem extends Expense {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  staff_role: string;
  staff_phone?: string;
  updated_at?: string;
}

// =====================
// 8. Returned Items
// =====================

export interface ReturnedItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  location?: string;
  requester_name: string;
  receiver_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  reject_reason?: string;
  created_at: string;
  updated_at: string;
}

// =====================
// 9. Commissions
// =====================

export interface CommissionReceiptItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_per_unit: number;
  total_commission: number;
}

export interface CommissionReceipt {
  id: string;
  receipt_number: string;
  total_amount: number;
  payment_method: string;
  sold_outside_jalingo: boolean;
  created_at: string;
  commission: number;
  items: CommissionReceiptItem[];
}

export interface CommissionByItem {
  item_id: string;
  item_name: string;
  category: string;
  quantity_sold: number;
  total_sales: number;
  commission_per_unit: number;
  total_commission: number;
}

export interface StaffCommissionDetails {
  staff: StaffInfo;
  total_commission: number;
  total_sales: number;
  total_items_sold: number;
  receipts: CommissionReceipt[];
  commission_by_item: CommissionByItem[];
}

export interface StaffCommission {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  staff_username: string;
  total_commission_generated: number;
  total_commission_paid: number;
  commission_pending: number;
  total_sales: number;
  items_sold: number;
}

export interface CommissionOverview {
  total_commission_generated: number;
  total_commission_paid: number;
  total_commission_pending: number;
  commission_staff_count: number;
  staff_commissions: StaffCommission[];
}

export interface CommissionPayment {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_email: string;
  amount: number;
  status: string;
  notes: string;
  created_at: string;
  approved_date: string;
}

export interface TopPerformer {
  staff_id: string;
  staff_name: string;
  total_commission: number;
  total_sales: number;
  items_sold: number;
}

export interface CommissionTrend {
  date: string;
  commission: number;
}

export interface TopCommissionItem {
  item_id: string;
  item_name: string;
  category: string;
  commission_per_unit: number;
  quantity_sold: number;
  total_commission: number;
}

export interface CommissionAnalytics {
  top_performers: TopPerformer[];
  commission_trends: CommissionTrend[];
  items_with_highest_commission: TopCommissionItem[];
}

// =====================
// 10. Staff Store
// =====================

export interface StaffStoreItem {
  id: string;
  staff_id: string;
  item_id: string;
  quantity: number;
  quantity_sold: number;
  quantity_available: number;
  posted_date: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  items?: {
    id: string;
    name: string;
    sku: string;
    category: string;
    unit_price: number;
  };
}

export interface StaffStoreStats {
  staff_id: string;
  staff_name: string;
  staff_role: string;
  total_items: number;
  total_quantity: number;
  total_sold: number;
  available: number;
  total_amount_sold: number;
  sell_through_rate: string;
}

// =====================
// 11. Posted Items
// =====================

export interface PostedItem {
  id: string;
  item_id?: string;
  item_name: string;
  items?: {
    name: string;
    sku: string;
    category?: string;
  };
  staff_id?: string;
  staff_name?: string;
  users?: {
    full_name: string;
    email?: string;
    role?: string;
    username?: string;
  };
  quantity: number;
  unit_price?: number;
  status: string;
  posted_date?: string;
  posted_at: string;
  posted_by: string;
  staff_comment: string | null;
  notes: string | null;
  location?: string;
  created_at?: string;
  updated_at?: string;
  is_delivered?: boolean;
}

// =====================
// 12. Sidebar / Navigation
// =====================

export interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode | string;
  badge?: number;
}

export interface MenuItemWithBadge extends MenuItem {
  badgeLabel?: string;
}

// =====================
// 13. Toast / Notifications
// =====================

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// =====================
// 14. Activity Log
// =====================

export interface Activity {
  id: string;
  type?: 'sale' | 'post-items' | 'receipt';
  action?: string;
  title?: string;
  description?: string;
  amount?: number;
  itemCount?: number;
  timestamp?: Date;
  staffName?: string;
  staff_name?: string;
  creditor_name?: string;
  details?: any;
  created_at?: string;
}

// =====================
// 15. Reports
// =====================

export interface ReportFilters {
  staffId?: string;
  staffRole?: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
  customFrom?: string;
  customTo?: string;
}

export interface ComprehensiveReport {
  summary: {
    total_transactions: number;
    total_sales: number;
    total_expenses: number;
    total_profit: number;
    total_items_sold: number;
    avg_transaction: number;
    total_cost_price_sold: number;
    total_commission_generated: number;
    total_commission_paid: number;
    total_credits_paid: number;
    total_credits_amount: number;
    total_creditors: number;
  };
  sales: {
    by_staff: Array<any>;
    by_staff_role: Array<any>;
    by_day: Array<any>;
    by_hour?: Array<any>;
    items_list: Array<any>;
  };
  expenses: {
    total: number;
    by_staff: Array<any>;
    by_type: Array<any>;
    by_day: Array<any>;
  };
  inventory: {
    main_store_total: number;
    main_store_total_quantity: number;
    main_store_items: Array<any>;
    active_store_total: number;
    active_store_total_quantity: number;
    active_store_items: Array<any>;
    staff_store_total: number;
    staff_store_total_quantity: number;
    staff_store_items: Array<any>;
    low_stock_total: number;
    low_stock_total_quantity: number;
    low_stock_items: Array<any>;
  };
  performance: {
    top_staff: Array<any>;
    top_items: Array<any>;
    staff_details: Array<any>;
  };
}

// =====================
// 16. Pagination
// =====================

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}
