import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { staffStoreService } from '../services/staff-store.service';
import { returnedItemsService } from '../services/returned-items.service';
import { StorageService } from '../services/storage.service';
import expensesService from '../services/expenses.service';
import { validatePostItem, validateAcceptPostedItem, validateRejectPostedItem } from '../middleware/validation';

const router = Router();

/**
 * Get staff's own sales (items they've sold)
 */
router.get('/my-sales', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select(`
        *,
        item:item_id(id, name, unit_price)
      `)
      .eq('sales_person_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const sales = (data || []).map((sale: any) => ({
      id: sale.id,
      item_id: sale.item_id,
      item_name: sale.item?.name || 'Unknown',
      quantity: sale.quantity,
      unit_price: sale.item?.unit_price || 0,
      total_amount: sale.total_amount,
      sale_date: sale.created_at,
    }));

    res.json(sales);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get staff's posted items
 */
router.get('/posted-items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('posted_items')
      .select(`
        *,
        items:item_id(id, name, unit_price, commission),
        posted_by:poster_id(id, full_name, email)
      `)
      .eq('staff_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const postedItems = (data || []).map((item: any) => {
      const commission = item.items?.commission || 0;
      const totalCommission = commission * item.quantity;
      
      return {
        id: item.id,
        item_id: item.item_id,
        item_name: item.items?.name || 'Unknown',
        quantity: item.quantity,
        status: item.status,
        posted_at: item.created_at,
        posted_by: item.posted_by?.full_name || 'Unknown',
        staff_comment: item.staff_comment,
        notes: item.notes,
        unit_price: item.unit_price,
        commission_per_unit: commission,
        total_commission_if_sold: totalCommission,
      };
    });

    res.json(postedItems);
  } catch (error: any) {
    console.error('Error fetching posted items:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get count of pending posted items for current staff
 */
router.get('/posted-items/pending-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { count, error } = await supabaseAdmin
      .from('posted_items')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', req.user!.id)
      .eq('status', 'pending');

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (error: any) {
    console.error('Error fetching pending posted items count:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Post an item (for sales staff)
 */
router.post('/post-item', authMiddleware, validatePostItem, async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity } = req.body;

    const { data, error } = await supabaseAdmin
      .from('posted_items')
      .insert([
        {
          sales_person_id: req.user!.id,
          receiver_staff_id: req.user!.id,
          item_id,
          quantity,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      posted_item: data,
      message: 'Item posted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Accept posted items with optional comment
 */
router.post('/posted-items/:id/accept', authMiddleware, validateAcceptPostedItem, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    console.log(`\n✅ POST /api/staff/posted-items/${id}/accept called`);
    console.log(`   Staff ID: ${req.user!.id}`);

    // Get the posted item details
    const { data: postedItem, error: fetchError } = await supabaseAdmin
      .from('posted_items')
      .select('*, items:item_id(*)')
      .eq('id', id)
      .eq('staff_id', req.user!.id)
      .single();

    if (fetchError) {
      console.error(`   ❌ Error fetching posted item: ${fetchError.message}`);
      throw fetchError;
    }
    if (!postedItem) {
      console.error(`   ❌ Posted item not found`);
      throw new Error('Posted item not found');
    }

    console.log(`   📦 Posted item found: ${postedItem.items?.name || 'Unknown'}, Qty: ${postedItem.quantity}`);

    // Use staff store service to accept items
    await staffStoreService.acceptPostedItems(req.user!.id, [id]);

    console.log(`   ✅ Item accepted and added to staff store`);
    res.json({ message: 'Posted items accepted successfully' });
  } catch (error: any) {
    console.error('❌ Error accepting posted items:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject posted items
 */
router.post('/posted-items/:id/reject', authMiddleware, validateRejectPostedItem, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    console.log(`\n❌ POST /api/staff/posted-items/${id}/reject called`);
    console.log(`   Staff ID: ${req.user!.id}`);

    // Use staff store service to reject items
    await staffStoreService.rejectPostedItems(req.user!.id, [id], comment);

    console.log(`   ✅ Item rejected and returned to active store`);
    res.json({ message: 'Posted items rejected' });
  } catch (error: any) {
    console.error(`❌ Error rejecting posted items: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Make payment for posted items
 */
router.post('/payments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { posted_item_id, amount_paid, payment_method, receipt_reference } = req.body;

    if (!posted_item_id || !amount_paid || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabaseAdmin
      .from('staff_payments')
      .insert([
        {
          staff_id: req.user!.id,
          posted_item_id,
          amount_paid,
          payment_method,
          receipt_reference,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      payment: data,
      message: 'Payment recorded successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all payments/payment requests
 */
router.get('/payments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('staff_payments')
      .select('*')
      .eq('staff_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const payments = (data || []).map((payment: any) => {
      // Extract payment method from notes field
      let payment_method = 'unknown';
      if (payment.notes && payment.notes.includes('Method: ')) {
        const methodStart = payment.notes.indexOf('Method: ') + 8;
        const methodEnd = payment.notes.indexOf(' |', methodStart);
        payment_method = methodEnd > methodStart ? payment.notes.substring(methodStart, methodEnd) : payment.notes.substring(methodStart, methodStart + 20).split(' ')[0];
      }
      
      return {
        id: payment.id,
        staff_id: payment.staff_id,
        amount: payment.amount,
        payment_method: payment_method,
        payment_type: payment.payment_type,
        status: payment.status,
        notes: payment.notes,
        requested_date: payment.requested_date,
        approved_date: payment.approved_date,
        created_at: payment.created_at,
        items_paid_for: payment.items_paid_for || [],
      };
    });

    res.json(payments);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Request payment with receipt upload
 */
router.post('/payments/request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, items_paid_for, reference_number, payment_method, notes } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    if (!payment_method || !['cash', 'online', 'bank_deposit', 'pos'].includes(payment_method)) {
      return res.status(400).json({ error: 'Valid payment method (cash/online/bank_deposit/pos) is required' });
    }

    let receipt_url = null;
    
    // Handle file upload if present
    if (req.files && 'receipt' in req.files) {
      const receiptFile = req.files.receipt as any;
      const fileName = `receipt_${req.user!.id}_${Date.now()}_${receiptFile.name}`;
      
      // Use tempFilePath if available (when useTempFiles is enabled), otherwise use data buffer
      const fileSource = receiptFile.tempFilePath || receiptFile.data;
      console.log(`📤 File upload: name=${receiptFile.name}, size=${receiptFile.size}, tempPath=${receiptFile.tempFilePath || 'none'}`);
      
      receipt_url = await StorageService.uploadReceipt(
        fileSource,
        fileName
      );
      console.log(`📤 Receipt URL: ${receipt_url}`);
    }

    // Get user info for enhanced payment details
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('full_name, email, phone')
      .eq('id', req.user!.id)
      .single();

    // Parse items_paid_for if it's a string
    let parsedItems = [];
    try {
      if (typeof items_paid_for === 'string') {
        parsedItems = JSON.parse(items_paid_for);
      } else if (Array.isArray(items_paid_for)) {
        parsedItems = items_paid_for;
      }
    } catch (e) {
      parsedItems = [];
    }

    // Validate payment amount doesn't exceed outstanding balance
    const parsedAmount = parseFloat(amount);
    
    // Get sales history (which includes outstanding balance calculation)
    // This matches what the frontend dashboard displays
    try {
      const salesHistory = await staffStoreService.getStaffSalesHistory(req.user!.id, 1000);
      const outstandingBalance = salesHistory.stats?.outstandingAmount || 0;
      
      console.log(`💰 Payment validation for staff ${req.user!.id}:`);
      console.log(`   Requested: ₦${parsedAmount.toLocaleString()}`);
      console.log(`   Outstanding: ₦${outstandingBalance.toLocaleString()}`);
      
      if (parsedAmount > outstandingBalance) {
        return res.status(400).json({ 
          error: `Payment amount (₦${parsedAmount.toLocaleString()}) exceeds outstanding balance (₦${outstandingBalance.toLocaleString()})`,
          details: {
            totalSales: salesHistory.stats?.allTimeTotalAmount || 0,
            approvedPayments: 0,
            pendingPayments: 0,
            outstanding: outstandingBalance,
            requestedAmount: parsedAmount
          }
        });
      }
    } catch (error: any) {
      console.error('❌ Error validating payment balance:', error);
      return res.status(500).json({ error: 'Failed to validate payment amount' });
    }

    const { data, error } = await supabaseAdmin
      .from('staff_payments')
      .insert([
        {
          staff_id: req.user!.id,
          staff_name: user?.full_name,
          staff_email: user?.email,
          staff_phone: user?.phone,
          amount: parseFloat(amount),
          payment_type: 'other',
          payment_method: payment_method,
          status: 'pending',
          reference_number: reference_number || null,
          receipt_url: receipt_url,
          items_paid_for: parsedItems.length > 0 ? parsedItems : null,
          notes: notes || null,
          requested_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Payment request created:', {
      id: data.id,
      amount: data.amount,
      staff: user?.full_name,
      method: payment_method,
      items: parsedItems.length,
      receipt_url: receipt_url || 'No receipt uploaded'
    });

    // Get user info for notification
    const userInfo = user || { full_name: 'Staff Member' };

    // Create notification for admin
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      await Promise.all(admins.map(admin => 
        supabaseAdmin
          .from('notifications')
          .insert([
            {
              user_id: admin.id,
              type: 'payment_request',
              title: '📋 New Payment Request',
              message: `${userInfo?.full_name || 'Staff'} has submitted a payment of ₦${parseFloat(amount).toLocaleString()} via ${payment_method}. Click to review.`,
              related_id: data.id,
              is_read: false,
            },
          ])
      ));
    }

    res.status(201).json({
      payment: data,
      message: 'Payment request submitted successfully. Awaiting admin approval.',
    });
  } catch (error: any) {
    console.error('Error submitting payment request:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Add expense
 */
router.post('/expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { expense_type, amount, description, expense_date } = req.body;

    if (!expense_type || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const expense = await expensesService.createExpense({
      staff_id: req.user!.id,
      expense_type,
      amount: parseFloat(amount),
      description,
      expense_date,
    });

    res.status(201).json(expense);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all expenses
 */
router.get('/expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await expensesService.getExpensesByStaff(req.user!.id);

    const formatted = expenses.map((expense: any) => ({
      id: expense.id,
      amount: expense.amount,
      category: expense.expense_type,
      description: expense.description,
      expense_date: expense.expense_date,
      created_at: expense.created_at,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create expense
 */
router.post('/expenses/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, category, description, expense_date } = req.body;

    if (!amount || !category) {
      return res.status(400).json({ error: 'Amount and category are required' });
    }

    const expense = await expensesService.createExpense({
      staff_id: req.user!.id,
      expense_type: category,
      amount: parseFloat(amount),
      description,
      expense_date,
    });

    res.status(201).json({
      expense,
      message: 'Expense recorded successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get staff dashboard data
 */
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Get all posted items for this staff member
    const { data: postedItems } = await supabaseAdmin
      .from('posted_items')
      .select('quantity, status')
      .eq('staff_id', req.user!.id);

    // Get all sales made by staff - join items to get commission rate
    // NOTE: commission is calculated from items.commission, NOT staff_sales.commission
    // because PostgREST schema cache doesn't see the staff_sales.commission column
    const { data: sales } = await supabaseAdmin
      .from('staff_sales')
      .select('quantity, total_amount, items:item_id(commission)')
      .eq('staff_id', req.user!.id);

    // Get pending payments
    const { data: pendingPayments } = await supabaseAdmin
      .from('staff_payments')
      .select('amount')
      .eq('staff_id', req.user!.id)
      .eq('status', 'pending');

    // Get approved payments (regular payments from /staff/payments, not commission)
    // Only include payments where payment_type is 'other' (regular staff payment requests)
    const { data: approvedPayments } = await supabaseAdmin
      .from('staff_payments')
      .select('amount, approved_amount')
      .eq('staff_id', req.user!.id)
      .eq('status', 'approved')
      .eq('payment_type', 'other');

    // Get paid commission (commission payments that have been approved)
    const { data: commissionPayments } = await supabaseAdmin
      .from('staff_payments')
      .select('amount')
      .eq('staff_id', req.user!.id)
      .eq('payment_type', 'commission')
      .eq('status', 'approved');

    // Get total expenses from ExpensesService
    const totalExpenses = await expensesService.getTotalExpenses(req.user!.id);

    // Count unread notifications - fetch and count to ensure accuracy
    const { data: unreadNotificationsData, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', req.user!.id)
      .eq('is_read', false);
    
    const unreadNotifications = notifError ? 0 : (unreadNotificationsData?.length || 0);

    // Check if user is commission staff
    const isCommissionStaff = ['commission_staff', 'staff_commission'].includes(req.user!.role || '');
    
    // Calculate total commission for commission staff (from items.commission × quantity)
    const totalCommission = isCommissionStaff 
      ? (sales?.reduce((sum, s) => sum + (parseFloat((s as any).items?.commission || 0) * (s.quantity || 0)), 0) || 0)
      : 0;

    // Calculate paid commission (commission payments that have been approved)
    const paidCommission = isCommissionStaff
      ? (commissionPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0)
      : 0;

    const dashboard = {
      total_items_sold: sales?.reduce((sum, s) => sum + s.quantity, 0) || 0,
      total_amount_sold: sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
      total_posted_items: postedItems?.filter(p => p.status === 'accepted').length || 0,
      pending_payment_count: pendingPayments?.length || 0,
      pending_posted_items: postedItems?.filter((p) => p.status === 'pending').length || 0,
      pending_payment_amount: pendingPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
      approved_amount: approvedPayments?.reduce((sum, p) => sum + parseFloat(p.approved_amount || p.amount || 0), 0) || 0,
      total_expenses: totalExpenses,
      unread_notifications: unreadNotifications || 0,
      total_commission: totalCommission,
      paid_commission: paidCommission,
      is_commission_staff: isCommissionStaff,
    };

    res.json(dashboard);
  } catch (error: any) {
    console.error('Error fetching dashboard:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get notifications
 */
router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Mark notification as read
 */
router.post('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Post items to staff (from sales)
 */
router.post('/post-items-to-staff', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { staff_id, item_id, quantity, notes } = req.body;

    if (!staff_id || !item_id || !quantity) {
      return res.status(400).json({ error: 'staff_id, item_id, and quantity are required' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Check if item exists and has enough stock
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', item_id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.quantity < quantity) {
      return res.status(400).json({ error: `Not enough stock. Available: ${item.quantity}` });
    }

    // Create posted item record
    const { data, error } = await supabaseAdmin
      .from('posted_items')
      .insert([
        {
          sales_person_id: req.user!.id,
          receiver_staff_id: staff_id,
          item_id,
          quantity,
          status: 'pending',
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Create notification for staff
    await supabaseAdmin
      .from('notifications')
      .insert([
        {
          user_id: staff_id,
          title: 'New Items Posted',
          message: `${item.name} (Qty: ${quantity}) has been posted to you. Review and accept in your Posted Items.`,
          type: 'info',
          is_read: false,
        },
      ]);

    res.status(201).json({
      message: 'Items posted to staff successfully',
      data,
    });
  } catch (error: any) {
    console.error('Error posting items:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get available items for staff to sell (accepted posted items)
 */
router.get('/available-items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('posted_items')
      .select(`
        *,
        item:item_id(id, name, unit_price, category),
        posted_by:sales_person_id(id, full_name, email)
      `)
      .eq('receiver_staff_id', req.user!.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const availableItems = (data || []).map((item: any) => ({
      id: item.id,
      posted_item_id: item.id,
      item_id: item.item_id,
      item_name: item.item?.name || 'Unknown',
      unit_price: item.item?.unit_price || 0,
      category: item.item?.category || 'General',
      available_quantity: item.quantity,
      posted_at: item.created_at,
      posted_by: item.posted_by?.full_name || 'Unknown',
    }));

    res.json(availableItems);
  } catch (error: any) {
    console.error('Error fetching available items:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Make a sale using accepted posted items
 */
router.post('/make-sale-from-posted', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { posted_item_id, quantity, payment_method, buyer_type, buyer_id } = req.body;

    if (!posted_item_id || !quantity || !payment_method || !buyer_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the posted item
    const { data: postedItem, error: postedError } = await supabaseAdmin
      .from('posted_items')
      .select('*')
      .eq('id', posted_item_id)
      .eq('receiver_staff_id', req.user!.id)
      .eq('status', 'accepted')
      .single();

    if (postedError || !postedItem) {
      return res.status(404).json({ error: 'Posted item not found or not accepted' });
    }

    if (postedItem.quantity < quantity) {
      return res.status(400).json({ 
        error: `Not enough items available. Available: ${postedItem.quantity}` 
      });
    }

    // Get item details
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', postedItem.item_id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const total_amount = item.unit_price * quantity;

    // Record the sale
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert([
        {
          sales_person_id: req.user!.id,
          item_id: postedItem.item_id,
          quantity,
          unit_price: item.unit_price,
          total_amount,
          payment_method,
          buyer_type,
          buyer_id: buyer_id || null,
          store_location: 'Jalingo',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (saleError) throw saleError;

    // Update posted item quantity
    const remaining_quantity = postedItem.quantity - quantity;
    
    if (remaining_quantity > 0) {
      // Update the posted item with new quantity
      await supabaseAdmin
        .from('posted_items')
        .update({ quantity: remaining_quantity })
        .eq('id', posted_item_id);
    } else {
      // Mark as fully sold if no items left
      await supabaseAdmin
        .from('posted_items')
        .update({ status: 'sold' })
        .eq('id', posted_item_id);
    }

    res.status(201).json({
      message: 'Sale recorded successfully',
      sale,
    });
  } catch (error: any) {
    console.error('Error making sale:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * ============================================================================
 * STAFF STORE ENDPOINTS
 * ============================================================================
 */

/**
 * Get staff's store inventory
 */
router.get('/store', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log(`\n🎯 GET /api/staff/store for staff: ${req.user!.id}`);
    const storeItems = await staffStoreService.getStaffStore(req.user!.id);
    console.log(`✅ Returning ${storeItems.length} items from staff store`);
    res.json(storeItems);
  } catch (error: any) {
    console.error(`❌ Error in /api/staff/store:`, error.message);
    console.error(`   Full error:`, error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get staff's store summary
 */
router.get('/store/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: storeItems } = await supabaseAdmin
      .from('staff_store')
      .select('quantity, quantity_sold, quantity_available')
      .eq('staff_id', req.user!.id);

    const summary = {
      total_items: storeItems?.length || 0,
      total_quantity: storeItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      total_sold: storeItems?.reduce((sum, item) => sum + (item.quantity_sold || 0), 0) || 0,
      total_available: storeItems?.reduce((sum, item) => sum + (item.quantity_available || 0), 0) || 0,
    };

    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Accept posted items (batch)
 */
router.post('/store/accept-items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { posted_item_ids } = req.body;

    if (!posted_item_ids || !Array.isArray(posted_item_ids) || posted_item_ids.length === 0) {
      return res.status(400).json({ error: 'posted_item_ids array is required' });
    }

    const storeItems = await staffStoreService.acceptPostedItems(req.user!.id, posted_item_ids);

    res.json({
      message: `Successfully accepted ${posted_item_ids.length} item(s)`,
      items: storeItems,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject posted items (batch)
 */
router.post('/store/reject-items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { posted_item_ids, comment } = req.body;

    if (!posted_item_ids || !Array.isArray(posted_item_ids) || posted_item_ids.length === 0) {
      return res.status(400).json({ error: 'posted_item_ids array is required' });
    }

    const rejectedItems = await staffStoreService.rejectPostedItems(
      req.user!.id,
      posted_item_ids,
      comment
    );

    res.json({
      message: `Successfully rejected ${posted_item_ids.length} item(s)`,
      items: rejectedItems,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Record a sale from staff store
 */
router.post('/store/make-sale', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity, payment_method } = req.body;

    if (!item_id || !quantity) {
      return res.status(400).json({ error: 'item_id and quantity are required' });
    }

    const sale = await staffStoreService.recordStaffSale(
      req.user!.id,
      item_id,
      quantity,
      payment_method || 'cash'
    );

    res.status(201).json({
      message: 'Sale recorded successfully',
      sale,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Record multiple sales from staff store
 */
router.post('/store/make-sales', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const sales = [];
    for (const item of items) {
      // Compute the effective unit price: the actual price the item was sold for.
      // Frontend sends unit_price = price_jalingo OR price_outside (from items table),
      // plus logistics_fee per unit when sold outside Jalingo.
      // items.unit_price is the PURCHASE cost — it is never used here.
      const sentUnitPrice = item.unit_price !== undefined ? parseFloat(item.unit_price) : undefined;
      const logisticsFee = item.logistics_fee !== undefined ? parseFloat(item.logistics_fee) : 0;
      const soldOutsideJalingo: boolean = item.sold_outside_jalingo === true;
      const effectiveUnitPrice =
        sentUnitPrice !== undefined && sentUnitPrice > 0
          ? sentUnitPrice + logisticsFee
          : undefined;

      const sale = await staffStoreService.recordStaffSale(
        req.user!.id,
        item.item_id,
        item.quantity,
        item.payment_method || 'cash',
        effectiveUnitPrice,
        soldOutsideJalingo
      );
      sales.push(sale);
    }

    res.status(201).json({
      message: `Successfully recorded ${sales.length} sale(s)`,
      sales,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get staff's sales history
 */
router.get('/store/sales-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { limit } = req.query;
    const sales = await staffStoreService.getStaffSalesHistory(
      req.user!.id,
      limit ? parseInt(limit as string) : 50
    );
    res.json(sales);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get comprehensive commission data for commission staff
 */
router.get('/commissions/details', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is commission staff
    const isCommissionStaff = ['commission_staff', 'staff_commission'].includes(req.user!.role || '');
    
    if (!isCommissionStaff) {
      return res.status(403).json({ error: 'Not a commission staff member' });
    }

    // Get all sales with commission details
    const { data: sales } = await supabaseAdmin
      .from('staff_sales')
      .select('*, items:item_id(name, sku, commission)')
      .eq('staff_id', req.user!.id)
      .order('sale_date', { ascending: false });

    // Get total and paid commission from payments
    const { data: commissionPayments } = await supabaseAdmin
      .from('staff_payments')
      .select('amount, approved_date')
      .eq('staff_id', req.user!.id)
      .eq('payment_type', 'commission')
      .eq('status', 'approved');

    // Calculate totals - commission is calculated from items.commission * quantity
    const totalCommissionGenerated = sales?.reduce((sum, s) => {
      const commission = parseFloat((s as any).items?.commission || 0) * (s.quantity || 0);
      return sum + commission;
    }, 0) || 0;
    const totalCommissionPaid = commissionPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
    const totalItemsSold = sales?.length || 0;
    const totalUnitsCommissioned = sales?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
    const pendingCommission = totalCommissionGenerated - totalCommissionPaid;

    // Top performing items - calculate commission from items.commission * quantity
    const itemPerformance = sales?.reduce((acc: any, sale: any) => {
      const itemName = sale.items?.name || 'Unknown';
      const commissionAmount = parseFloat(sale.items?.commission || 0) * (sale.quantity || 0);
      const existing = acc.find((i: any) => i.name === itemName);
      if (existing) {
        existing.quantity += sale.quantity || 0;
        existing.commission += commissionAmount;
        existing.sales += 1;
      } else {
        acc.push({
          name: itemName,
          sku: sale.items?.sku,
          quantity: sale.quantity || 0,
          commission: commissionAmount,
          sales: 1,
          rate: sale.items?.commission || 0,
        });
      }
      return acc;
    }, [])?.sort((a: any, b: any) => b.commission - a.commission) || [];

    // Commission by month (last 12 months) - calculate commission from items.commission * quantity
    const currentDate = new Date();
    const monthlyCommission: any = {};
    
    sales?.forEach((sale: any) => {
      const saleDate = new Date(sale.sale_date);
      const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
      const commissionAmount = parseFloat(sale.items?.commission || 0) * (sale.quantity || 0);
      monthlyCommission[monthKey] = (monthlyCommission[monthKey] || 0) + commissionAmount;
    });

    res.json({
      summary: {
        total_commission_generated: totalCommissionGenerated,
        total_commission_paid: totalCommissionPaid,
        pending_commission: pendingCommission,
        total_items_sold: totalItemsSold,
        total_units_commissioned: totalUnitsCommissioned,
      },
      commissions: commissionPayments?.map((p: any) => ({
        amount: p.amount,
        approved_date: p.approved_date,
      })) || [],
      sales: sales?.map((sale: any) => ({
        ...sale,
        item_name: sale.items?.name,
        item_sku: sale.items?.sku,
        commission_amount: parseFloat(sale.items?.commission || 0) * (sale.quantity || 0),
      })) || [],
      top_items: itemPerformance,
      monthly_commission: monthlyCommission,
    });
  } catch (error: any) {
    console.error('Error fetching commission details:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create a return request
 * POST /api/staff/returns
 */
router.post('/returns', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { receiver_staff_id, items } = req.body;

    if (!receiver_staff_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Receiver staff ID and items are required' });
    }

    const result = await returnedItemsService.createReturnRequest(
      req.user!.id,
      receiver_staff_id,
      items
    );

    res.status(201).json({
      returned_items: result,
      message: 'Return request created successfully',
    });
  } catch (error: any) {
    console.error('Error creating return request:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all return requests made by the staff
 * GET /api/staff/returns
 */
router.get('/returns', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const returns = await returnedItemsService.getReturnsByRequester(req.user!.id);
    res.json(returns);
  } catch (error: any) {
    console.error('Error fetching returns:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get stats for return requests
 * GET /api/staff/returns/stats
 */
router.get('/returns/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await returnedItemsService.getReturnStatsForRequester(req.user!.id);
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching return stats:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get available items in staff store for return
 * GET /api/staff/available-items-for-return
 */
router.get('/available-items-for-return', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await returnedItemsService.getAvailableItemsForReturn(req.user!.id);
    res.json(items);
  } catch (error: any) {
    console.error('Error fetching available items for return:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all sales staff (for dropdown in return requests)
 * GET /api/staff/sales-staff
 */
router.get('/sales-staff', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔍 [/api/staff/sales-staff] Fetching sales staff...');
    console.log(`   User making request: ${req.user?.email} (${req.user?.role})`);
    
    // First, get all unique roles to debug
    const { data: allUsers, error: allError } = await supabaseAdmin
      .from('users')
      .select('role');

    if (allError) {
      console.error('❌ [/api/staff/sales-staff] Error getting all users:', allError);
    } else {
      const uniqueRoles = Array.from(new Set(allUsers?.map((u: any) => u.role) || []));
      console.log(`   Available roles in system: ${JSON.stringify(uniqueRoles)}`);
    }

    // Query for sales staff using multiple role variations
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .in('role', ['sales', 'sales_staff']);

    if (error) {
      console.error('❌ [/api/staff/sales-staff] Supabase query error:', error);
      throw error;
    }

    console.log(`✅ [/api/staff/sales-staff] Query returned ${data?.length || 0} sales staff`);
    (data || []).forEach((staff: any) => {
      console.log(`   ✓ ${staff.email} | Role: "${staff.role}" | Name: ${staff.full_name}`);
    });

    // Map to response format
    const salesStaff = (data || []).map((staff: any) => ({
      id: staff.id,
      full_name: staff.full_name,
      email: staff.email,
      role: staff.role,
    }));

    console.log(`📤 [/api/staff/sales-staff] Returning ${salesStaff.length} staff members`);
    res.json(salesStaff);
  } catch (error: any) {
    console.error('❌ [/api/staff/sales-staff] Caught error:', error.message || error);
    res.status(400).json({ 
      error: error.message,
      details: error.details || 'See server logs'
    });
  }
});

export default router;
