export interface User {
  id: string;
  email: string;
  full_name?: string;
  username: string;
  phone_number?: string;
  role: 'admin' | 'superadmin' | 'sales' | 'sales_staff' | 'staff_commission' | 'commission_staff' | 'staff_non_commission' | 'non_commission_staff';
  is_active: boolean;
  store_location: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  base_price: number;
  commission_amount: number;
  quantity: number; // Total: active_store_quantity + main_store_quantity
  active_store_quantity: number;
  main_store_quantity: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  sales_person_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'cash' | 'pos' | 'transfer';
  buyer_type: 'customer' | 'staff';
  buyer_id?: string;
  store_location: string;
  receipt_reference?: string;
  is_printed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostedItem {
  id: string;
  poster_id: string;
  staff_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface StaffPayment {
  id: string;
  staff_id: string;
  posted_item_id: string;
  amount_paid: number;
  payment_method: 'cash' | 'pos' | 'transfer';
  receipt_reference?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  staff_id: string;
  expense_type: string;
  amount: number;
  description?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'posted_item' | 'payment_approved' | 'payment_rejected' | 'item_request' | 'returned_items' | 'return_request_sent' | 'return_accepted' | 'return_rejected';
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface ReturnedItem {
  id: string;
  item_id: string;
  requester_staff_id: string;
  receiver_staff_id: string;
  quantity: number;
  unit_price: number;
  status: 'pending' | 'accepted' | 'rejected';
  reject_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
