import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { salesService } from '../services/sales.service';
import { staffStoreService } from '../services/staff-store.service';
import { returnedItemsService } from '../services/returned-items.service';
import { StorageService } from '../services/storage.service';
import { supabaseAdmin } from '../config/supabase';
import expensesService from '../services/expenses.service';

const router = Router();

/**
 * Get all available items
 */
router.get('/items/available', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await salesService.getAvailableItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all unavailable items
 */
router.get('/items/unavailable', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await salesService.getUnavailableItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Record a sale
 */
router.post('/record', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity, payment_method, buyer_type, buyer_id, store_location } = req.body;

    if (!item_id || !quantity || !payment_method || !buyer_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sale = await salesService.recordSale(
      req.user!.id,
      item_id,
      quantity,
      payment_method,
      buyer_type,
      buyer_id,
      store_location || 'Jalingo'
    );

    res.status(201).json({
      sale,
      message: 'Sale recorded successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Post items to staff (batch) - NEW ENDPOINT
 */
router.post('/post-items', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { staff_id, items } = req.body;

    if (!staff_id) {
      return res.status(400).json({ error: 'staff_id is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty' });
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.item_id || !item.quantity || item.unit_price === undefined) {
        return res.status(400).json({ 
          error: 'Each item must have item_id, quantity, and unit_price' 
        });
      }
    }

    const postedItems = await staffStoreService.postItemsToStaff(
      req.user!.id,
      staff_id,
      items
    );

    res.status(201).json({
      posted_items: postedItems,
      message: `Successfully posted ${items.length} item(s) to staff`,
      count: postedItems.length,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get sales dashboard
 */
router.get('/dashboard', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const dashboard = await salesService.getSalesDashboard(req.user!.id);
    res.json(dashboard);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create sale (for make-sale page)
 */
router.post('/create', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const sales = [];
    for (const item of items) {
      const sale = await salesService.recordSale(
        req.user!.id,
        item.id,
        item.sale_quantity,
        'cash',
        'customer',
        undefined,
        'Jalingo'
      );
      sales.push(sale);
    }

    res.status(201).json({
      sales,
      message: 'Sales completed successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create sale with multiple items and quantity reduction
 */
router.post('/create-sale', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { items, total_amount, payment_method, sold_outside_jalingo } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Create sale record
    const { data: saleData, error: saleError } = await require('../config/supabase').supabaseAdmin
      .from('sales')
      .insert([
        {
          staff_id: req.user!.id,
          receipt_number: `REC-${Date.now()}`,
          total_amount,
          payment_method,
          sold_outside_jalingo,
        },
      ])
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sales_items records and reduce active_store_quantity
    for (const item of items) {
      // Insert into sales_items
      const { error: itemError } = await require('../config/supabase').supabaseAdmin
        .from('sales_items')
        .insert([
          {
            sale_id: saleData.id,
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            logistics_fee: item.logistics_fee || 0,
          },
        ]);

      if (itemError) throw itemError;

      // Reduce active_store_quantity from items table
      const { data: currentItem, error: getError } = await require('../config/supabase').supabaseAdmin
        .from('items')
        .select('active_store_quantity')
        .eq('id', item.item_id)
        .single();

      if (getError) throw getError;

      const newQuantity = Math.max(0, (currentItem?.active_store_quantity || 0) - item.quantity);
      const { error: updateError } = await require('../config/supabase').supabaseAdmin
        .from('items')
        .update({ active_store_quantity: newQuantity })
        .eq('id', item.item_id);

      if (updateError) throw updateError;
    }

    // Update daily sales summary
    const saleDate = new Date().toISOString().split('T')[0];
    const { data: existingDSS } = await require('../config/supabase').supabaseAdmin
      .from('daily_sales_summary')
      .select('id, total_items_sold, total_revenue, number_of_transactions')
      .eq('salesperson_id', req.user!.id)
      .eq('sale_date', saleDate)
      .single();

    const itemsCount = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
    if (existingDSS) {
      await require('../config/supabase').supabaseAdmin
        .from('daily_sales_summary')
        .update({
          total_items_sold: (existingDSS.total_items_sold || 0) + itemsCount,
          total_revenue: (existingDSS.total_revenue || 0) + total_amount,
          number_of_transactions: (existingDSS.number_of_transactions || 0) + 1,
        })
        .eq('id', existingDSS.id);
    } else {
      await require('../config/supabase').supabaseAdmin
        .from('daily_sales_summary')
        .insert({
          salesperson_id: req.user!.id,
          sale_date: saleDate,
          total_items_sold: itemsCount,
          total_revenue: total_amount,
          number_of_transactions: 1,
        });
    }

    res.status(201).json({
      sale_id: saleData.id,
      receipt_number: saleData.receipt_number,
      message: 'Sale completed successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get sales receipts
 */
router.get('/receipts', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await require('../config/supabase').supabaseAdmin
      .from('sales')
      .select('*, sales_items(*, items(name)), users!staff_id(full_name)')
      .eq('staff_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const receipts = data.map((sale: any) => ({
      id: sale.id,
      receipt_number: sale.receipt_number,
      total_amount: sale.total_amount,
      items: sale.sales_items,
      items_count: sale.sales_items?.length || 0,
      created_at: sale.created_at,
      staff_name: sale.users?.full_name || 'Unknown',
      payment_method: sale.payment_method,
    }));

    res.json(receipts);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all staff members (for posting items)
 */
router.get('/staff-list', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .in('role', ['commission_staff', 'non_commission_staff'])
      .order('full_name', { ascending: true });

    if (error) throw error;

    const staffList = (data || []).map((staff: any) => ({
      id: staff.id,
      name: staff.full_name,
      email: staff.email,
      role: staff.role,
      role_display: staff.role === 'commission_staff' ? 'Commission Staff' : 'Non-Commission Staff',
    }));

    res.json(staffList);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get posted items history for sales person
 */
router.get('/posted-items/history', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { data: postedItems, error } = await supabaseAdmin
      .from('posted_items')
      .select(`
        *,
        item:item_id(id, name, sku),
        staff:staff_id(id, full_name, username, role)
      `)
      .eq('poster_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Transform the data
    const activities = (postedItems || []).map((item: any) => ({
      id: item.id,
      type: 'post-items',
      title: item.status === 'accepted' ? `Items Accepted by ${item.staff?.full_name || 'Staff'}` : item.status === 'rejected' ? `Items Rejected by ${item.staff?.full_name || 'Staff'}` : `Items posted to ${item.staff?.full_name || 'Staff'}`,
      description: `${item.quantity} x ${item.item?.name || 'Unknown Item'}`,
      item_name: item.item?.name,
      quantity: item.quantity,
      staff_name: item.staff?.full_name,
      status: item.status,
      timestamp: new Date(item.updated_at || item.created_at),
      amount: item.unit_price * item.quantity,
    }));

    res.json(activities);
  } catch (error: any) {
    console.error('Error fetching posted items history:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get posted items stats - total items posted and accepted by staff
 */
router.get('/posted-items/stats', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { data: postedItems, error } = await supabaseAdmin
      .from('posted_items')
      .select('quantity, status')
      .eq('poster_id', req.user!.id);

    if (error) throw error;

    const stats = {
      total_posted_items: postedItems?.length || 0,
      total_posted_quantity: postedItems?.reduce((sum, p) => sum + p.quantity, 0) || 0,
      accepted_items: postedItems?.filter(p => p.status === 'accepted').length || 0,
      accepted_quantity: postedItems?.filter(p => p.status === 'accepted').reduce((sum, p) => sum + p.quantity, 0) || 0,
      rejected_items: postedItems?.filter(p => p.status === 'rejected').length || 0,
      rejected_quantity: postedItems?.filter(p => p.status === 'rejected').reduce((sum, p) => sum + p.quantity, 0) || 0,
      pending_items: postedItems?.filter(p => p.status === 'pending').length || 0,
      pending_quantity: postedItems?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.quantity, 0) || 0,
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching posted items stats:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get sales person's payments
 */
router.get('/payments', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
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
 * Request payment with receipt upload (for sales person)
 */
router.post('/payments/request', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
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
      const fileName = `receipt_sales_${req.user!.id}_${Date.now()}_${receiptFile.name}`;
      
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
    
    // Get all sales for this user
    const { data: allSales } = await supabaseAdmin
      .from('sales')
      .select('total_amount')
      .eq('staff_id', req.user!.id);
    
    // Get all payments (approved + pending) for this user
    const { data: allPayments } = await supabaseAdmin
      .from('staff_payments')
      .select('amount, status')
      .eq('staff_id', req.user!.id);
    
    // Calculate totals
    const totalSalesAmount = (allSales || []).reduce((sum: number, sale: any) => sum + (parseFloat(sale.total_amount) || 0), 0);
    const approvedAmount = (allPayments || [])
      .filter((p: any) => p.status === 'approved')
      .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
    const pendingAmount = (allPayments || [])
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
    
    const outstandingBalance = Math.max(0, totalSalesAmount - approvedAmount - pendingAmount);
    
    if (parsedAmount > outstandingBalance) {
      return res.status(400).json({ 
        error: `Payment amount (₦${parsedAmount.toLocaleString()}) exceeds outstanding balance (₦${outstandingBalance.toLocaleString()})`,
        details: {
          totalSales: totalSalesAmount,
          approved: approvedAmount,
          pending: pendingAmount,
          outstanding: outstandingBalance,
          requestedAmount: parsedAmount
        }
      });
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
              message: `${user?.full_name || 'Sales Staff'} has submitted a payment of ₦${parseFloat(amount).toLocaleString()} via ${payment_method}. Click to review.`,
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
    console.error('Error creating payment request:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get sales person's sales history (for payments page)
 */
router.get('/my-sales-history', authMiddleware, roleMiddleware('sales', 'sales_staff', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log(`👤 User ID: ${userId}`);
    
    // First get all sales by this staff member
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id, receipt_number, total_amount, created_at')
      .eq('staff_id', userId)
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    if (!salesData || salesData.length === 0) {
      console.log(`📊 No sales found for user ${userId}`);
      return res.json({ allItems: [], stats: { totalQuantity: 0, outstandingQuantity: 0, totalSales: 0, outstandingAmount: 0, paidQuantity: 0 } });
    }

    console.log(`📊 Found ${salesData.length} sales for user ${userId}, Sales IDs:`, salesData.map(s => s.id));

    // Get all sale IDs
    const saleIds = salesData.map((sale: any) => sale.id);

    // Fetch sales_items for these sales with item details
    const { data: salesItemsData, error: itemsError } = await supabaseAdmin
      .from('sales_items')
      .select(`
        id,
        sale_id,
        item_id,
        quantity,
        unit_price,
        logistics_fee,
        created_at,
        items:item_id (
          id,
          name,
          unit_price
        )
      `)
      .in('sale_id', saleIds)
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error('❌ Error fetching sales items:', itemsError);
      throw itemsError;
    }

    console.log(`📦 Found ${salesItemsData?.length || 0} sales items`);

    // Fetch payments (all statuses) to know which items are in any payment state
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, items_paid_for, status, created_at')
      .eq('staff_id', req.user!.id);

    if (paymentsError) {
      console.error('⚠️ Error fetching payments:', paymentsError);
    }

    // Build sets of sale IDs in approved/pending payments.
    // Handle both {sale_ids:[...]} array format and legacy {sale_id:'...'} singular format.
    const approvedSaleIds = new Set<string>();
    const pendingSaleIds = new Set<string>();
    const rejectedSaleIds = new Set<string>();

    // Count amounts from ALL payments by status — do NOT require items_paid_for to be present.
    let approvedPaymentAmount = 0;
    let pendingPaymentAmount = 0;

    if (paymentsData) {
      paymentsData.forEach((payment: any) => {
        // Amount totals
        if (payment.status === 'approved') approvedPaymentAmount += payment.amount || 0;
        else if (payment.status === 'pending') pendingPaymentAmount += payment.amount || 0;

        // Sale-level filtering
        if (payment.items_paid_for && Array.isArray(payment.items_paid_for)) {
          payment.items_paid_for.forEach((paidItem: any) => {
            // Support both {sale_ids:[...]} and legacy {sale_id:'...'}
            const saleIds: string[] = Array.isArray(paidItem.sale_ids)
              ? paidItem.sale_ids
              : paidItem.sale_id
              ? [paidItem.sale_id]
              : [];
            saleIds.forEach((saleId: string) => {
              if (!saleId) return;
              if (payment.status === 'approved') approvedSaleIds.add(saleId);
              else if (payment.status === 'pending') pendingSaleIds.add(saleId);
              else if (payment.status === 'rejected') rejectedSaleIds.add(saleId);
            });
          });
        }
      });
    }

    console.log(`💰 Approved Sales: ${approvedSaleIds.size}, Pending Sales: ${pendingSaleIds.size}, Rejected Sales: ${rejectedSaleIds.size}`);

    // Map sales items to the expected format
    const allSales = (salesItemsData || []).map((item: any) => {
      const quantity = parseInt(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      // Calculate total_amount from quantity and unit_price
      const totalAmount = quantity * unitPrice;
      const isApproved = approvedSaleIds.has(item.id);
      const isPending = pendingSaleIds.has(item.id);
      const isRejected = rejectedSaleIds.has(item.id);
      
      return {
        id: item.id,
        item_id: item.item_id,
        item_name: item.items?.name || 'Unknown Item',
        quantity: quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        sale_date: item.created_at,
        isApproved: isApproved,
        isPending: isPending,
        isRejected: isRejected,
      };
    });

    // Calculate stats
    // Display items = items that are NOT approved and NOT pending (only truly unpaid)
    const displayItems = allSales.filter(item => !item.isApproved && !item.isPending);
    const totalQuantity = displayItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalSalesAmount = displayItems.reduce((sum, item) => sum + item.total_amount, 0);
    
    // For all-time totals
    const allTimeQuantity = allSales.reduce((sum, item) => sum + item.quantity, 0);
    const allTimeTotalSales = allSales.reduce((sum, item) => sum + item.total_amount, 0);
    const paidQuantity = allSales.filter(item => item.isApproved).reduce((sum, item) => sum + item.quantity, 0);
    
    // Today's sales calculation
    const today = new Date().toISOString().split('T')[0];
    const todaysSales = allSales.filter(item => item.sale_date.startsWith(today));
    const todaysTotalQuantity = todaysSales.reduce((sum, item) => sum + item.quantity, 0);
    const todaysTotalAmount = todaysSales.reduce((sum, item) => sum + item.total_amount, 0);
    
    // Outstanding amount calculation
    const outstandingAmount = Math.max(0, allTimeTotalSales - approvedPaymentAmount - pendingPaymentAmount);

    console.log(`✅ ALL-TIME CALCULATION FOR USER: ${userId}`);
    console.log(`   - Total Sales Items: ${allSales.length}`);
    console.log(`   - All-Time Quantity: ${allTimeQuantity} units`);
    console.log(`   - All-Time Total Sales: ₦${allTimeTotalSales}`);
    console.log(`   - Approved Amount: ₦${approvedPaymentAmount}`);
    console.log(`   - Pending Amount: ₦${pendingPaymentAmount}`);
    console.log(`   - Outstanding: ₦${outstandingAmount}`);
    
    res.json({
      allItems: displayItems, // Only show items NOT in pending or approved state
      stats: {
        // Today's sales
        todaysTotalQuantity: todaysTotalQuantity,
        todaysTotalAmount: todaysTotalAmount,
        
        // All-time totals
        allTimeQuantity: allTimeQuantity,
        allTimeTotalAmount: allTimeTotalSales,
        paidQuantity: paidQuantity,
        
        // Currently unpaid/displayable
        totalQuantity: totalQuantity,
        totalItems: displayItems.length,
        totalSalesAmount: totalSalesAmount,
        
        // Outstanding calculation
        outstandingAmount: outstandingAmount,
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching sales history:', error);
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
 * Get all returned items for sales staff
 * GET /api/sales/returned-items
 */
router.get('/returned-items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const returns = await returnedItemsService.getReturnsForReceiver(req.user!.id);
    res.json(returns);
  } catch (error: any) {
    console.error('Error fetching returned items:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Accept returned items
 * POST /api/sales/returned-items/:id/accept
 */
router.post('/returned-items/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await returnedItemsService.acceptReturnedItems(req.user!.id, [id]);

    res.json({
      returned_items: result,
      message: 'Returned items accepted successfully',
    });
  } catch (error: any) {
    console.error('Error accepting returned items:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject returned items
 * POST /api/sales/returned-items/:id/reject
 */
router.post('/returned-items/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reject_reason } = req.body;

    if (!reject_reason) {
      return res.status(400).json({ error: 'reject_reason is required' });
    }

    const result = await returnedItemsService.rejectReturnedItems(req.user!.id, [id], reject_reason);

    res.json({
      returned_items: result,
      message: 'Returned items rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting returned items:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
