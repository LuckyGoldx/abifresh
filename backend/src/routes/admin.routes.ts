import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { adminService } from '../services/admin.service';
import { authService } from '../services/auth.service';
import { staffStoreService } from '../services/staff-store.service';
import { supabaseAdmin } from '../config/supabase';
import { StorageService } from '../services/storage.service';

const router = Router();

/**
 * Debug endpoint: List files in storage bucket
 */
router.get('/storage/list', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const files = await StorageService.listFiles();
    res.json({ files, count: files.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all staff
 */
router.get('/staff', authMiddleware, roleMiddleware('admin', 'sales', 'sales_staff'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📥 GET /api/admin/staff - Request from user:', req.user?.email);
    console.log('📥 User role:', req.user?.role);
    const staff = await adminService.getAllStaff();
    console.log(`✅ /api/admin/staff route returning ${staff.length} staff members`);
    res.json(staff);
  } catch (error: any) {
    console.error('❌ /api/admin/staff error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create new staff
 */
router.post('/staff/create', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, full_name, username, role, store_location } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await authService.registerUser(
      email,
      password,
      full_name,
      role,
      store_location || 'Jalingo',
      username
    );

    res.status(201).json({
      user,
      message: 'Staff created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get commissions
 */
router.get('/commissions', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const commissions = await adminService.getCommissions();
    res.json(commissions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Set commission for staff
 */
router.post('/commissions/set', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { staff_id, item_id, commission_percentage } = req.body;

    if (!staff_id || !item_id || commission_percentage === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await adminService.setCommission(staff_id, item_id, commission_percentage);
    res.json({ message: 'Commission set successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get pending payments
 */
router.get('/payments/pending', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📍 GET /api/admin/payments/pending - Fetching pending payments from admin');
    const payments = await adminService.getPendingPayments();
    console.log(`✅ Retrieved ${payments.length} pending payments`);
    console.log('Payments data:', JSON.stringify(payments, null, 2));
    res.json(payments);
  } catch (error: any) {
    console.error('❌ Error fetching pending payments:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all payments (pending, approved, rejected, etc)
 */
router.get('/payments/all', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📍 GET /api/admin/payments/all - Fetching all payments');
    
    // Fetch all payments
    const { data: payments, error } = await supabaseAdmin
      .from('staff_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!payments || payments.length === 0) {
      console.log('⚠️ No payments found');
      return res.json([]);
    }

    // Fetch staff info for all unique staff_ids
    const staffIds = [...new Set(payments.map(p => p.staff_id))];
    const { data: staffMembers, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .in('id', staffIds);

    if (staffError) {
      console.error('❌ Error fetching staff info:', staffError);
    }

    // Create a map of staff by ID
    const staffMap: Record<string, any> = {};
    (staffMembers || []).forEach(staff => {
      staffMap[staff.id] = staff;
    });

    // Map payments with staff info
    const mappedPayments = payments.map((payment: any) => {
      const staff = staffMap[payment.staff_id];
      return {
        id: payment.id,
        staff_id: payment.staff_id,
        staff_name: staff?.full_name || 'Unknown',
        staff_email: staff?.email,
        staff_role: staff?.role,
        staff_phone: payment.staff_phone,
        amount: payment.amount,
        payment_type: payment.payment_type,
        payment_method: payment.payment_method,
        reference_number: payment.reference_number,
        status: payment.status,
        notes: payment.notes,
        items_paid_for: payment.items_paid_for,
        receipt_url: payment.receipt_url,
        requested_date: payment.requested_date,
        approved_date: payment.approved_date,
        created_at: payment.created_at,
        rejection_reason: payment.rejection_reason,
      };
    });

    console.log(`✅ Retrieved ${mappedPayments.length} total payments`);
    if (mappedPayments.length > 0) {
      console.log('First payment:', JSON.stringify(mappedPayments[0], null, 2));
    }
    res.json(mappedPayments);
  } catch (error: any) {
    console.error('❌ Error fetching all payments:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Approve payment
 */
router.post('/payments/:id/approve', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await adminService.approvePayment(id);
    res.json({ message: 'Payment approved' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject payment
 */
router.post('/payments/:id/reject', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await adminService.rejectPayment(id, reason);
    res.json({ message: 'Payment rejected' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get sales report
 */
router.get('/reports/sales', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const staffId = req.query.staff_id as string | undefined;
    const report = await adminService.getSalesReport(staffId);
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update staff - can edit name, username, email, phone, role, location, and password
 */
router.put('/staff/:id', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, username, email, phone_number, role, store_location, password } = req.body;

    console.log(`Updating staff ${id} with data:`, { full_name, username, email, phone_number, role, store_location });

    // Verify user exists before updating
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      console.error(`User not found: ${id}`, fetchError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile in database
    const updateData: any = {};
    if (full_name) updateData.full_name = full_name;
    if (username) updateData.username = username.toLowerCase(); // Store username as lowercase
    if (email) updateData.email = email;
    if (phone_number) updateData.phone_number = phone_number;
    if (role) updateData.role = role;
    if (store_location) updateData.store_location = store_location;

    console.log(`Update data for ${id}:`, updateData);

    const { data: updated, error: profileError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (profileError) {
      console.error(`Profile update error for ${id}:`, profileError);
      throw profileError;
    }

    console.log(`Updated user ${id}:`, updated);

    // Update password in Supabase Auth if provided (non-blocking - don't fail if user not in Auth)
    if (password) {
      console.log(`Updating password for user ${id}`);
      try {
        await supabaseAdmin.auth.admin.updateUserById(id, {
          password,
        });
        console.log(`✅ Password updated for user ${id}`);
      } catch (authError: any) {
        // Don't fail the whole request if auth password update fails
        // This can happen if user wasn't created in Supabase Auth
        console.warn(`⚠️ Could not update Auth password for ${id} (user may not exist in Auth):`, authError.message);
      }
    }

    res.json({ message: 'Staff updated successfully' });
  } catch (error: any) {
    console.error(`PUT /staff/:id error:`, error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Deactivate staff
 */
router.put('/staff/:id/deactivate', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`Deactivating staff ${id}`);

    // Verify user exists
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      console.error(`User not found for deactivate: ${id}`, fetchError);
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Staff deactivated successfully' });
  } catch (error: any) {
    console.error(`Deactivate error:`, error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Activate staff
 */
router.put('/staff/:id/activate', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`Activating staff ${id}`);

    // Verify user exists
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      console.error(`User not found for activate: ${id}`, fetchError);
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Staff activated successfully' });
  } catch (error: any) {
    console.error(`Activate error:`, error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get expenses
 */
router.get('/expenses', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const staffId = req.query.staff_id as string | undefined;
    const expenses = await adminService.getStaffExpenses(staffId);
    res.json(expenses);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all posted items to staff (admin view)
 */
router.get('/posted-items', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('posted_items')
      .select(`
        *,
        item:item_id(id, name, sku),
        posted_by:poster_id(id, full_name, email),
        posted_to:staff_id(id, full_name, email, role)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const postedItems = (data || []).map((item: any) => ({
      id: item.id,
      item_name: item.item?.name || 'Unknown',
      item_sku: item.item?.sku,
      quantity: item.quantity,
      status: item.status,
      posted_by: item.posted_by?.full_name || 'Unknown',
      posted_to: item.posted_to?.full_name || 'Unknown',
      staff_role: item.posted_to?.role,
      staff_comment: item.staff_comment,
      notes: item.notes,
      posted_date: item.created_at,
      completion_date: item.completion_date,
    }));

    res.json(postedItems);
  } catch (error: any) {
    console.error('Error fetching posted items:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all staff payments (for admin approval)
 */
router.get('/staff-payments', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    
    let query = supabaseAdmin
      .from('staff_payments')
      .select(`
        *,
        staff:staff_id(id, full_name, email, role)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    const payments = (data || []).map((payment: any) => ({
      id: payment.id,
      staff_name: payment.staff?.full_name || 'Unknown',
      staff_email: payment.staff?.email,
      staff_role: payment.staff?.role,
      amount: payment.amount,
      items_paid_for: payment.items_paid_for,
      reference_number: payment.reference_number,
      payment_method: (() => {
        let method = 'unknown';
        if (payment.notes && payment.notes.includes('Method: ')) {
          const methodStart = payment.notes.indexOf('Method: ') + 8;
          const methodEnd = payment.notes.indexOf(' |', methodStart);
          method = methodEnd > methodStart ? payment.notes.substring(methodStart, methodEnd) : payment.notes.substring(methodStart, methodStart + 20).split(' ')[0];
        }
        return method;
      })(),
      payment_type: payment.payment_type,
      status: payment.status,
      notes: payment.notes,
      created_at: payment.created_at,
      approved_date: payment.approved_date,
    }));

    res.json(payments);
  } catch (error: any) {
    console.error('Error fetching staff payments:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Approve staff payment
 */
router.post('/staff-payments/:id/approve', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approved_amount, notes } = req.body;

    // Get payment details for notification
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('staff_payments')
      .select('*, staff:staff_id(id, full_name)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update payment status
    const { error: updateError } = await supabaseAdmin
      .from('staff_payments')
      .update({
        status: 'approved',
        approved_amount: approved_amount || payment.amount,
        approved_by: req.user!.id,
        approved_date: new Date().toISOString(),
        notes: notes || payment.notes,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Create notification for staff
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: payment.staff_id,
        message: `Your payment request of ₦${payment.amount.toLocaleString()} has been approved by admin${approved_amount && approved_amount !== payment.amount ? ` (Approved amount: ₦${approved_amount.toLocaleString()})` : ''}`,
        notification_type: 'payment_approved',
        is_read: false,
      });

    res.json({ message: 'Payment approved successfully' });
  } catch (error: any) {
    console.error('Error approving payment:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject staff payment
 */
router.post('/staff-payments/:id/reject', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    // Get payment details for notification
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('staff_payments')
      .select('*, staff:staff_id(id, full_name)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update payment status
    const { error: updateError } = await supabaseAdmin
      .from('staff_payments')
      .update({
        status: 'rejected',
        approved_by: req.user!.id,
        approved_date: new Date().toISOString(),
        notes: rejection_reason || 'Payment rejected by admin',
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Create notification for staff
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: payment.staff_id,
        message: `Your payment request of ₦${payment.amount.toLocaleString()} has been rejected. ${rejection_reason ? 'Reason: ' + rejection_reason : ''}`,
        notification_type: 'payment_rejected',
        is_read: false,
      });

    res.json({ message: 'Payment rejected successfully' });
  } catch (error: any) {
    console.error('Error rejecting payment:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Sync all database users to Supabase Auth
 * Creates Auth accounts for users that don't have them yet
 * This allows password updates to work properly
 */
router.post('/sync-auth-users', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔄 Starting user sync to Auth...');
    const result = await adminService.syncUsersToAuth();
    console.log('✅ Sync complete:', result);
    res.json({
      message: 'User sync to Auth completed',
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * ============================================================================
 * STAFF STORE ADMIN ENDPOINTS
 * ============================================================================
 */

/**
 * Get all staff stores summary
 */
router.get('/staff-stores', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const storesSummary = await staffStoreService.getAllStaffStoresSummary();
    res.json(storesSummary);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get specific staff store details
 */
router.get('/staff-stores/:staffId', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    console.log(`📋 Fetching staff-stores details for: ${staffId}`);
    
    // Get raw staff store items with relationships - try simpler select first
    const { data: storeItems, error } = await supabaseAdmin
      .from('staff_store')
      .select(`*`)
      .eq('staff_id', staffId)
      .order('posted_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching staff store:', error);
      throw error;
    }

    console.log(`📦 Found ${storeItems?.length || 0} items for staff ${staffId}`);
    if (storeItems && storeItems.length > 0) {
      console.log('🔍 First item:', storeItems[0]);
    }

    // Now fetch related items and users
    const itemIds = [...new Set((storeItems || []).map(s => s.item_id).filter(Boolean))];
    const userIds = [...new Set((storeItems || []).map(s => s.staff_id).filter(Boolean))];

    let itemsMap: any = {};
    let usersMap: any = {};

    if (itemIds.length > 0) {
      const { data: items, error: itemError } = await supabaseAdmin
        .from('items')
        .select('*')
        .in('id', itemIds);
      if (itemError) console.error('❌ Error fetching items:', itemError);
      if (items) {
        items.forEach(item => {
          itemsMap[item.id] = item;
        });
      }
    }

    if (userIds.length > 0) {
      const { data: users, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('id', userIds);
      if (userError) console.error('❌ Error fetching users:', userError);
      if (users) {
        users.forEach(user => {
          usersMap[user.id] = user;
        });
      }
    }

    // Enrich store items with related data
    const enrichedItems = (storeItems || []).map(item => ({
      ...item,
      items: itemsMap[item.item_id] || null,
      users: usersMap[item.staff_id] || null,
    }));

    // Calculate amount sold for each item
    const itemsWithAmount = enrichedItems.map(item => ({
      ...item,
      amount_sold: ((item.quantity_sold || 0) * (item.items?.unit_price || item.items?.base_price || 0)),
    }));

    // Calculate summary
    const summary = {
      staff_id: staffId,
      total_items: itemsWithAmount.length,
      total_quantity: itemsWithAmount.reduce((sum, item) => sum + (item.quantity || 0), 0),
      total_sold: itemsWithAmount.reduce((sum, item) => sum + (item.quantity_sold || 0), 0),
      total_available: itemsWithAmount.reduce((sum, item) => sum + (item.quantity_available || 0), 0),
      total_amount_sold: itemsWithAmount.reduce((sum, item) => sum + (item.amount_sold || 0), 0),
      items: itemsWithAmount,
    };

    console.log(`✅ Summary: items=${summary.total_items}, qty=${summary.total_quantity}, sold=${summary.total_sold}, available=${summary.total_available}, amount_sold=${summary.total_amount_sold}`);

    res.json(summary);
  } catch (error: any) {
    console.error('❌ Error in staff-stores/:staffId:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get staff store statistics
 */
router.get('/staff-stores-stats', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 Fetching staff-stores-stats...');
    const { data: stores, error } = await supabaseAdmin
      .from('staff_store')
      .select('id, staff_id, item_id, quantity, quantity_sold');

    if (error) {
      console.error('❌ Error fetching stores:', error);
      throw error;
    }

    console.log(`📦 Found ${stores?.length || 0} store records`);

    // Get user info
    const staffIds = [...new Set((stores || []).map(s => s.staff_id))];
    const itemIds = [...new Set((stores || []).map(s => s.item_id))];
    
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role')
      .in('id', staffIds);

    const { data: items } = await supabaseAdmin
      .from('items')
      .select('id, unit_price, base_price')
      .in('id', itemIds);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);
    const itemMap = new Map(items?.map(i => [i.id, { unit_price: i.unit_price || i.base_price || 0 }]) || []);

    const staffStats = (stores || []).reduce((acc: any, store: any) => {
      const staffId = store.staff_id;
      const user = userMap.get(staffId);
      const item = itemMap.get(store.item_id);
      const unitPrice = item?.unit_price || 0;
      const amountSold = (store.quantity_sold || 0) * unitPrice;
      
      if (!acc[staffId]) {
        acc[staffId] = {
          staff_id: staffId,
          staff_name: user?.full_name || 'Unknown',
          staff_role: user?.role || 'Unknown',
          total_items: 0,
          total_quantity: 0,
          total_sold: 0,
          total_amount_sold: 0,
        };
      }
      acc[staffId].total_items += 1;
      acc[staffId].total_quantity += store.quantity || 0;
      acc[staffId].total_sold += store.quantity_sold || 0;
      acc[staffId].total_amount_sold += amountSold;
      return acc;
    }, {});

    const stats = Object.values(staffStats).map((stat: any) => ({
      ...stat,
      available: (stat.total_quantity || 0) - (stat.total_sold || 0),
      sell_through_rate: stat.total_quantity > 0 
        ? ((stat.total_sold / stat.total_quantity) * 100).toFixed(2)
        : '0',
    }));

    console.log(`✅ Returning ${stats.length} staff stats`);
    if (stats.length > 0) {
      console.log('📊 First stat:', stats[0]);
    }

    res.json(stats);
  } catch (error: any) {
    console.error('❌ Error in staff-stores-stats:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
