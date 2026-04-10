import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { adminService } from '../services/admin.service';
import { authService } from '../services/auth.service';
import { staffStoreService } from '../services/staff-store.service';
import { supabaseAdmin } from '../config/supabase';
import { StorageService } from '../services/storage.service';
import expensesService from '../services/expenses.service';
import { validateCreateStaff, validateSetCommission, validateApproveRejectPayment, validateRejectPaymentWithReason, validateUpdateStaff } from '../middleware/validation';
import logger, { logSecurity } from '../config/logger';
import { logStreamService } from '../services/log-stream.service';
import jwt from 'jsonwebtoken';

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
router.post('/staff/create', authMiddleware, roleMiddleware('admin'), validateCreateStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, full_name, username, phone_number, role, store_location } = req.body;

    const user = await authService.registerUser(
      email,
      password,
      full_name,
      role,
      store_location || 'Jalingo',
      username || undefined,
      phone_number || undefined
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
router.post('/commissions/set', authMiddleware, roleMiddleware('admin'), validateSetCommission, async (req: AuthRequest, res: Response) => {
  try {
    const { staff_id, item_id, commission_percentage } = req.body;

    await adminService.setCommission(staff_id, item_id, commission_percentage);
    res.json({ message: 'Commission set successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get pending payments count (lightweight)
 */
router.get('/payments/pending-count', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 Fetching pending payments count for admin...');
    
    // Fetch all pending payments
    const { data: pendingPayments, error } = await supabaseAdmin
      .from('staff_payments')
      .select('id')
      .eq('status', 'pending');

    if (error) throw error;
    
    const count = (pendingPayments || []).length;
    console.log(`✅ Pending payments count: ${count}`);
    res.json({ count });
  } catch (error: any) {
    console.error('❌ Error fetching pending count:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get total outstanding amount across all staff
 * Outstanding = (total staff_sales amount + total sales amount) − approved payments − pending payments
 * - Non-commission & commission staff → sales recorded in `staff_sales` table
 * - Sales staff → sales recorded in `sales` table
 */
router.get('/payments/outstanding-summary', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📍 GET /api/admin/payments/outstanding-summary - Calculating total outstanding');

    // 1. Total from staff_sales (non-commission & commission staff)
    const { data: staffSalesData, error: staffSalesError } = await supabaseAdmin
      .from('staff_sales')
      .select('total_amount');

    if (staffSalesError) throw staffSalesError;

    const staffSalesTotal = (staffSalesData || []).reduce((sum: number, s: any) => {
      return sum + (parseFloat(s.total_amount) || 0);
    }, 0);

    // 2. Total from sales table (sales staff — role: sales / sales_staff)
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('total_amount');

    if (salesError) throw salesError;

    const salesStaffTotal = (salesData || []).reduce((sum: number, s: any) => {
      return sum + (parseFloat(s.total_amount) || 0);
    }, 0);

    const totalSalesAmount = staffSalesTotal + salesStaffTotal;

    // 3. Total approved and pending payments across ALL staff
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('staff_payments')
      .select('amount, status')
      .in('status', ['approved', 'pending']);

    if (paymentsError) throw paymentsError;

    let approvedAmount = 0;
    let pendingAmount = 0;
    (paymentsData || []).forEach((p: any) => {
      const amt = parseFloat(p.amount) || 0;
      if (p.status === 'approved') approvedAmount += amt;
      else if (p.status === 'pending') pendingAmount += amt;
    });

    const outstandingTotal = Math.max(0, totalSalesAmount - approvedAmount - pendingAmount);

    console.log(`✅ Outstanding summary:`);
    console.log(`   staff_sales total: ₦${staffSalesTotal}`);
    console.log(`   sales table total: ₦${salesStaffTotal}`);
    console.log(`   Combined sales:    ₦${totalSalesAmount}`);
    console.log(`   Approved payments: ₦${approvedAmount}`);
    console.log(`   Pending payments:  ₦${pendingAmount}`);
    console.log(`   Outstanding total: ₦${outstandingTotal}`);

    res.json({
      staffSalesTotal,
      salesStaffTotal,
      totalSalesAmount,
      approvedAmount,
      pendingAmount,
      outstandingTotal,
    });
  } catch (error: any) {
    console.error('❌ Error calculating outstanding summary:', error);
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
router.post('/payments/:id/approve', authMiddleware, roleMiddleware('admin'), validateApproveRejectPayment, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await adminService.approvePayment(id);
    logSecurity('Payment approved', { paymentId: id, adminId: req.user?.id });
    res.json({ message: 'Payment approved' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject payment
 */
router.post('/payments/:id/reject', authMiddleware, roleMiddleware('admin'), validateRejectPaymentWithReason, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await adminService.rejectPayment(id, reason);
    logSecurity('Payment rejected', { paymentId: id, reason, adminId: req.user?.id });
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
 * Get comprehensive reports with all data
 */
router.get('/reports/comprehensive', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const dateRange = (req.query.dateRange as string || 'month') as any;
    const customFrom = req.query.customFrom as string | undefined;
    const customTo = req.query.customTo as string | undefined;
    const staffId = req.query.staffId as string | undefined;
    const staffRole = req.query.staffRole as string | undefined;

    console.log(`📥 GET /api/admin/reports/comprehensive - Query params:`, {
      dateRange,
      customFrom,
      customTo,
      staffId,
      staffRole,
    });

    const report = await adminService.getComprehensiveReport(dateRange, customFrom, customTo, staffId, staffRole);
    res.json(report);
  } catch (error: any) {
    console.error('❌ Comprehensive reports error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update staff - can edit name, username, email, phone, role, location, and password
 */
router.put('/staff/:id', authMiddleware, roleMiddleware('admin'), validateUpdateStaff, async (req: AuthRequest, res: Response) => {
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

    // Update password in Supabase Auth if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      console.log(`🔐 Updating password for user ${id} (email: ${existingUser.email})`);
      let passwordUpdated = false;

      // Step 1: Try to find the auth user by email (most reliable method)
      let authUserId: string | null = null;
      try {
        const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (!listError && authUsers) {
          const found = authUsers.find((u: any) => u.email === existingUser.email);
          if (found) {
            authUserId = found.id;
            console.log(`✅ Found auth user by email: ${authUserId}`);
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ Could not list auth users: ${err.message}`);
      }

      // Step 2: If found by email, update their password
      if (authUserId) {
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
        if (updateErr) {
          console.error(`❌ Password update failed for auth user ${authUserId}: ${updateErr.message}`);
          return res.status(400).json({
            error: `Profile updated but password change failed: ${updateErr.message}`
          });
        }
        passwordUpdated = true;
        console.log(`✅ Password updated for auth user ${authUserId}`);
      }

      // Step 3: If no auth user found by email, create one
      if (!passwordUpdated) {
        console.log(`⚠️ No auth user found for email ${existingUser.email}. Creating auth user...`);
        const { data: newAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: existingUser.email,
          password,
          email_confirm: true,
        });
        if (createErr) {
          console.error(`❌ Failed to create auth user: ${createErr.message}`);
          return res.status(400).json({
            error: `Profile updated but password change failed: ${createErr.message}`
          });
        }
        passwordUpdated = true;
        console.log(`✅ Created auth user ${newAuth.user.id} for ${existingUser.email}`);
      }
    }

    res.json({ message: password ? 'Staff updated and password changed successfully' : 'Staff updated successfully' });
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
 * Delete staff member
 * Cleans up all related records across tables before deleting the user
 */
router.delete('/staff/:id', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`Deleting staff ${id}`);

    // Verify user exists
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      console.error(`User not found for delete: ${id}`, fetchError);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🧹 Cleaning up related records for staff: ${user.full_name} (${id})...`);

    // Helper: safely delete rows referencing this user (Supabase returns {error}, doesn't throw)
    const safeDelete = async (table: string, column: string) => {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, id);
      if (error) console.warn(`⚠️ Cleanup ${table}.${column}: ${error.message}`);
    };

    // Helper: safely delete rows matching OR conditions
    const safeDeleteOr = async (table: string, conditions: string) => {
      const { error } = await supabaseAdmin.from(table).delete().or(conditions);
      if (error) console.warn(`⚠️ Cleanup ${table}: ${error.message}`);
    };

    // Helper: safely set column to null for rows referencing this user
    const safeNullify = async (table: string, column: string) => {
      const { error } = await supabaseAdmin.from(table).update({ [column]: null }).eq(column, id);
      if (error) console.warn(`⚠️ Nullify ${table}.${column}: ${error.message}`);
    };

    // --- Step 1: Clean up system/operational tables ---
    await safeDelete('notifications', 'user_id');
    await safeDelete('activity_logs', 'user_id');

    // --- Step 2: Clean up financial/reporting tables ---
    await safeDelete('daily_sales_summary', 'salesperson_id');

    // --- Step 3: Clean up receipts (receipt_items depends on receipts) ---
    const { data: userReceipts } = await supabaseAdmin
      .from('receipts')
      .select('id')
      .eq('staff_id', id);
    if (userReceipts && userReceipts.length > 0) {
      const receiptIds = userReceipts.map((r: any) => r.id);
      await supabaseAdmin.from('receipt_items').delete().in('receipt_id', receiptIds);
    }
    await safeDelete('receipts', 'staff_id');

    // --- Step 4: Clean up commissions ---
    await safeDelete('staff_commissions', 'staff_id');
    await safeNullify('staff_commissions', 'created_by');

    // --- Step 5: Clean up payments (nullify admin refs first, then delete staff's own) ---
    await safeNullify('staff_payments', 'approved_by');
    await safeNullify('staff_payments', 'paid_by');
    await safeDelete('staff_payments', 'staff_id');

    // --- Step 6: Clean up expenses ---
    await safeNullify('staff_expenses', 'approved_by');
    await safeDelete('staff_expenses', 'staff_id');

    // --- Step 7: Clean up posted_items (posted_items_mapping depends on posted_items) ---
    const { data: userPostedItems } = await supabaseAdmin
      .from('posted_items')
      .select('id')
      .or(`posted_by_id.eq.${id},posted_to_id.eq.${id},staff_id.eq.${id}`);
    if (userPostedItems && userPostedItems.length > 0) {
      const postedItemIds = userPostedItems.map((p: any) => p.id);
      await supabaseAdmin.from('posted_items_mapping').delete().in('posted_item_id', postedItemIds);
    }
    await safeDeleteOr('posted_items', `posted_by_id.eq.${id},posted_to_id.eq.${id},staff_id.eq.${id}`);

    // --- Step 8: Clean up staff_store and staff_sales ---
    await safeNullify('staff_store', 'posted_from_id');
    await safeDelete('staff_store', 'staff_id');
    await safeNullify('staff_sales', 'buyer_id');
    await safeDelete('staff_sales', 'staff_id');

    // --- Step 9: Clean up sales records ---
    await safeDelete('sales', 'salesperson_id');

    // --- Step 10: Nullify references in shared tables ---
    await safeNullify('items', 'created_by');

    // --- Step 11: Clean up misc tables ---
    await safeDelete('inventory_transfers', 'transferred_by');
    await safeNullify('damage_loss_reports', 'investigated_by');
    await safeDelete('damage_loss_reports', 'reported_by');
    await safeDeleteOr('returned_items', `requester_staff_id.eq.${id},receiver_staff_id.eq.${id}`);
    await safeDelete('restock_orders', 'created_by');
    await safeNullify('system_settings', 'updated_by');
    await safeNullify('backup_history', 'triggered_by');

    console.log(`✅ Related records cleaned up for ${id}`);

    // --- Step 12: Delete the user record ---
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // --- Step 13: Delete from Supabase Auth ---
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.warn(`⚠️ Warning deleting auth user: ${authDeleteError.message}`);
    } else {
      console.log(`✅ Deleted auth user for ${id}`);
    }

    console.log(`✅ Staff deleted successfully: ${user.full_name} (${user.email})`);
    res.json({ message: 'Staff deleted successfully' });
  } catch (error: any) {
    console.error(`Delete error:`, error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create admin's own expense
 */
router.post('/expenses/create', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { amount, category, description, expense_date } = req.body;

    if (!amount || !category) {
      return res.status(400).json({ error: 'Amount and category are required' });
    }

    // DEBUG LOGGING
    console.log('🔍 [ADMIN EXPENSE CREATE] Received request:');
    console.log('  Raw amount:', amount, `(type: ${typeof amount})`);
    console.log('  Parsed amount:', parseFloat(amount), `(type: ${typeof parseFloat(amount)})`);
    console.log('  Amount string:', amount.toString());
    console.log('  Category:', category);
    console.log('  Expense date:', expense_date);

    const parsedAmount = parseFloat(amount);
    console.log('  Final parsed amount before service:', parsedAmount);

    const expense = await expensesService.createExpense({
      staff_id: req.user!.id,
      expense_type: category,
      amount: parsedAmount,
      description,
      expense_date,
    });

    console.log('  ✅ Expense created with amount:', expense.expense_amount);

    res.status(201).json({
      expense,
      message: 'Expense recorded successfully',
    });
  } catch (error: any) {
    console.error('  ❌ Error creating expense:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get admin's own expenses
 */
router.get('/my-expenses', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
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
 * Debug: Check raw expenses data
 */
router.get('/expenses/debug/raw', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔍 DEBUG: Fetching raw expenses...');
    
    // Get raw expenses
    const { data: expenses, error: expError } = await supabaseAdmin
      .from('staff_expenses')
      .select('*')
      .limit(5);
    
    console.log(`Raw expenses:`, expenses);
    if (expError) console.error('Error:', expError);
    
    // Get raw users
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .limit(5);
    
    console.log(`Raw users:`, users);
    if (userError) console.error('Error:', userError);
    
    res.json({
      expenses: expenses || [],
      users: users || [],
      errors: {
        expenses: expError?.message,
        users: userError?.message,
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get expenses
 */
router.get('/expenses', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📨 GET /api/admin/expenses request received');
    const staffId = req.query.staff_id as string | undefined;
    const expenses = await adminService.getStaffExpenses(staffId);
    
    console.log(`📤 Returning ${expenses.length} expenses`);
    if (expenses.length > 0) {
      console.log(`📤 First expense:`, JSON.stringify(expenses[0]).substring(0, 200));
    }
    
    res.json(expenses);
  } catch (error: any) {
    console.error('❌ Error fetching expenses:', error);
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

    // Note: notification is NOT created here because adminService.approvePayment() already handles it
    // This route is the legacy staff-payments path

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
        type: 'payment_rejected',
        title: '❌ Payment Rejected',
        message: `Your payment request of ₦${payment.amount.toLocaleString()} has been rejected. ${rejection_reason ? 'Reason: ' + rejection_reason : ''}`,
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

    // Calculate amount sold for each item using actual selling prices
    const itemsWithAmount = enrichedItems.map(item => ({
      ...item,
      amount_sold: ((item.quantity_sold || 0) * (item.items?.price_jalingo || 0)),
    }));

    // Fetch receipts for this staff to get actual amount sold
    // Use receipts.total_amount - same method as the staff-stores-stats endpoint (table)
    const { data: receipts, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .select('id, staff_id, total_amount, created_at')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    if (receiptError) {
      console.error('⚠️  Error fetching receipts:', receiptError);
    }

    // Sum total_amount from all receipts (same calculation as staff-stores-stats table)
    const totalAmountSold = (receipts || []).reduce((sum: number, receipt: any) => {
      return sum + parseFloat(receipt.total_amount || 0);
    }, 0);

    console.log(`💵 Staff ${staffId} total amount sold from receipts.total_amount: ₦${totalAmountSold}`);

    // Calculate commission from items in store
    let totalCommissionEarned = 0;
    if (enrichedItems.length > 0) {
      totalCommissionEarned = itemsWithAmount.reduce((sum, item) => {
        const commissionPerUnit = item.items?.commission || 0;
        const commissionFromItem = commissionPerUnit * (item.quantity_sold || 0);
        return sum + commissionFromItem;
      }, 0);
      
      console.log(`💰 Staff ${staffId} total commission earned: ₦${totalCommissionEarned}`);
    }

    // Calculate summary
    const summary = {
      staff_id: staffId,
      total_items: itemsWithAmount.length,
      total_quantity: itemsWithAmount.reduce((sum, item) => sum + (item.quantity || 0), 0),
      total_sold: itemsWithAmount.reduce((sum, item) => sum + (item.quantity_sold || 0), 0),
      total_available: itemsWithAmount.reduce((sum, item) => sum + (item.quantity_available || 0), 0),
      total_amount_sold: totalAmountSold, // Sum of (quantity_sold × price_jalingo) for all items
      total_commission_earned: totalCommissionEarned,
      receipts_count: receipts?.length || 0,
      items: itemsWithAmount,
    };

    console.log(`✅ Summary: items=${summary.total_items}, qty=${summary.total_quantity}, sold=${summary.total_sold}, available=${summary.total_available}, amount_sold=${summary.total_amount_sold}, commission_earned=${summary.total_commission_earned}`);

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
    
    // Get store inventory data
    const { data: stores, error: storeError } = await supabaseAdmin
      .from('staff_store')
      .select('id, staff_id, item_id, quantity, quantity_sold');

    if (storeError) {
      console.error('❌ Error fetching stores:', storeError);
      throw storeError;
    }

    // Get receipts data for amount sold
    const { data: receipts, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .select('staff_id, total_amount');

    if (receiptError) {
      console.error('❌ Error fetching receipts:', receiptError);
      throw receiptError;
    }

    console.log(`📦 Found ${stores?.length || 0} store records and ${receipts?.length || 0} receipts`);

    // Get user info
    const staffIds = [...new Set([
      ...(stores || []).map(s => s.staff_id),
      ...(receipts || []).map(r => r.staff_id)
    ])];
    
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role')
      .in('id', staffIds);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    // Calculate receipts totals per staff
    const receiptTotals = (receipts || []).reduce((acc: any, receipt: any) => {
      const staffId = receipt.staff_id;
      if (!acc[staffId]) {
        acc[staffId] = 0;
      }
      acc[staffId] += parseFloat(receipt.total_amount || 0);
      return acc;
    }, {});

    // Calculate store inventory stats
    const staffStats = (stores || []).reduce((acc: any, store: any) => {
      const staffId = store.staff_id;
      const user = userMap.get(staffId);
      
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
      return acc;
    }, {});

    // Add receipt totals to staff stats
    Object.values(staffStats).forEach((stat: any) => {
      stat.total_amount_sold = receiptTotals[stat.staff_id] || 0;
    });

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

/**
 * ===========================================================================
 * COMMISSION TRACKING ENDPOINTS
 * ===========================================================================
 */

/**
 * Get commission overview - Summary of all commissions
 */
router.get('/commissions/overview', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 GET /api/admin/commissions/overview - Fetching commission overview');

    // Get all commission staff (check both role variations)
    const { data: commissionStaff, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, username, role')
      .or('role.eq.staff_commission,role.eq.commission_staff');

    if (staffError) throw staffError;

    if (!commissionStaff || commissionStaff.length === 0) {
      console.log('⚠️ No commission staff found');
      return res.json({
        total_commission_generated: 0,
        total_commission_paid: 0,
        total_commission_pending: 0,
        commission_staff_count: 0,
        staff_commissions: [],
      });
    }

    console.log(`✅ Found ${commissionStaff.length} commission staff`);

    // Calculate commissions for each staff using staff_sales table (primary source of truth)
    const staffCommissions = await Promise.all(
      commissionStaff.map(async (staff) => {
        let totalCommission = 0;
        let totalSales = 0;
        let itemsSold = 0;

        // Primary: Use staff_sales table (matches staff dashboard data source)
        const { data: sales, error: salesError } = await supabaseAdmin
          .from('staff_sales')
          .select('quantity, total_amount, items:item_id(commission)')
          .eq('staff_id', staff.id);

        if (!salesError && sales && sales.length > 0) {
          sales.forEach((sale: any) => {
            const quantity = sale.quantity || 0;
            const commissionPerUnit = sale.items?.commission || 0;
            
            totalSales += sale.total_amount || 0;
            itemsSold += quantity;
            totalCommission += commissionPerUnit * quantity;
          });
        }

        // Fallback to staff_store table if no sales in staff_sales
        if (itemsSold === 0) {
          const { data: staffStore, error: storeError } = await supabaseAdmin
            .from('staff_store')
            .select('item_id, quantity_sold, items(commission, unit_price)')
            .eq('staff_id', staff.id);

          if (!storeError && staffStore) {
            staffStore.forEach((store: any) => {
              if (store.items && store.quantity_sold) {
                const commissionPerUnit = store.items.commission || 0;
                const unitPrice = store.items.unit_price || 0;
                
                totalCommission += commissionPerUnit * store.quantity_sold;
                totalSales += unitPrice * store.quantity_sold;
                itemsSold += store.quantity_sold;
              }
            });
          }
        }

        // Get commission payments made
        const { data: payments, error: paymentsError } = await supabaseAdmin
          .from('staff_payments')
          .select('amount, status')
          .eq('staff_id', staff.id)
          .eq('payment_type', 'commission')
          .in('status', ['approved', 'paid']);

        const totalPaid = !paymentsError && payments 
          ? payments.reduce((sum, p) => sum + (p.amount || 0), 0)
          : 0;

        console.log(`   ${staff.full_name}: Commission=₦${totalCommission}, Sales=₦${totalSales}, Items=${itemsSold}, Paid=₦${totalPaid}`);

        return {
          staff_id: staff.id,
          staff_name: staff.full_name,
          staff_email: staff.email,
          staff_username: staff.username,
          total_commission_generated: totalCommission,
          total_commission_paid: totalPaid,
          commission_pending: totalCommission - totalPaid,
          total_sales: totalSales,
          items_sold: itemsSold,
        };
      })
    );

    const validStaffCommissions = staffCommissions;

    const overview = {
      total_commission_generated: validStaffCommissions.reduce((sum, sc) => sum + sc.total_commission_generated, 0),
      total_commission_paid: validStaffCommissions.reduce((sum, sc) => sum + sc.total_commission_paid, 0),
      total_commission_pending: validStaffCommissions.reduce((sum, sc) => sum + sc.commission_pending, 0),
      commission_staff_count: validStaffCommissions.length,
      staff_commissions: validStaffCommissions,
    };

    console.log('✅ Commission overview:', overview);
    res.json(overview);
  } catch (error: any) {
    console.error('❌ Error fetching commission overview:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get detailed commission breakdown for a specific staff member
 */
router.get('/commissions/staff/:staffId', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`📊 GET /api/admin/commissions/staff/${staffId} - Fetching detailed breakdown`);

    // Get staff info
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, username, role')
      .eq('id', staffId)
      .single();

    if (staffError || !staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Build query for staff_sales (primary source - matches staff dashboard)
    let salesQuery = supabaseAdmin
      .from('staff_sales')
      .select('*, items:item_id(id, name, commission, category)')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    if (startDate) {
      salesQuery = salesQuery.gte('created_at', startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte('created_at', endDate);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) throw salesError;

    if (!sales || sales.length === 0) {
      return res.json({
        staff,
        total_commission: 0,
        total_sales: 0,
        total_items_sold: 0,
        receipts: [],
        commission_by_item: [],
      });
    }

    // Transform staff_sales data to match the receipts format expected by frontend
    const receiptsWithCommission = sales.map((sale: any) => {
      const item = sale.items || {};
      const commissionPerUnit = item.commission || 0;
      const totalCommission = commissionPerUnit * sale.quantity;

      return {
        id: sale.id,
        receipt_number: sale.receipt_number,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        created_at: sale.created_at,
        commission: totalCommission,
        items: [
          {
            item_id: sale.item_id,
            item_name: item.name || 'Unknown',
            quantity: sale.quantity,
            unit_price: sale.unit_price,
            total_price: sale.total_amount,
            commission_per_unit: commissionPerUnit,
            total_commission: totalCommission,
          },
        ],
      };
    });

    // Calculate commission by item
    const commissionByItem: Record<string, any> = {};
    sales.forEach((sale: any) => {
      const item = sale.items || {};
      const commissionPerUnit = item.commission || 0;
      const totalCommission = commissionPerUnit * sale.quantity;

      if (!commissionByItem[sale.item_id]) {
        commissionByItem[sale.item_id] = {
          item_id: sale.item_id,
          item_name: item.name || 'Unknown',
          category: item.category || 'Uncategorized',
          quantity_sold: 0,
          total_sales: 0,
          commission_per_unit: commissionPerUnit,
          total_commission: 0,
        };
      }

      commissionByItem[sale.item_id].quantity_sold += sale.quantity;
      commissionByItem[sale.item_id].total_sales += sale.total_amount;
      commissionByItem[sale.item_id].total_commission += totalCommission;
    });

    const totalCommission = receiptsWithCommission.reduce((sum, r) => sum + r.commission, 0);
    const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalItemsSold = sales.reduce((sum, s) => sum + s.quantity, 0);

    res.json({
      staff,
      total_commission: totalCommission,
      total_sales: totalSales,
      total_items_sold: totalItemsSold,
      receipts: receiptsWithCommission,
      commission_by_item: Object.values(commissionByItem),
    });
  } catch (error: any) {
    console.error('❌ Error fetching staff commission details:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get commission payment history
 */
router.get('/commissions/payments', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 GET /api/admin/commissions/payments - Fetching commission payment history');

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('staff_payments')
      .select('*')
      .eq('payment_type', 'commission')
      .order('created_at', { ascending: false });

    if (paymentsError) throw paymentsError;

    if (!payments || payments.length === 0) {
      return res.json([]);
    }

    // Get staff details
    const staffIds = [...new Set(payments.map(p => p.staff_id))];
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .in('id', staffIds);

    if (staffError) throw staffError;

    const staffMap: Record<string, any> = {};
    staff?.forEach(s => {
      staffMap[s.id] = s;
    });

    const paymentsWithStaff = payments.map(p => ({
      ...p,
      staff_name: staffMap[p.staff_id]?.full_name || 'Unknown',
      staff_email: staffMap[p.staff_id]?.email || 'Unknown',
    }));

    res.json(paymentsWithStaff);
  } catch (error: any) {
    console.error('❌ Error fetching commission payments:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create commission payment
 */
router.post('/commissions/pay', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { staff_id, amount, notes } = req.body;

    if (!staff_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields: staff_id, amount' });
    }

    console.log(`💰 Creating commission payment for staff ${staff_id}: ₦${amount}`);

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('staff_payments')
      .insert([
        {
          staff_id,
          amount,
          payment_type: 'commission',
          status: 'approved',
          notes: notes || 'Commission payment',
          approved_by: req.user?.id,
          approved_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (paymentError) throw paymentError;

    console.log('✅ Commission payment created:', payment.id);
    res.json({ message: 'Commission payment created successfully', payment });
  } catch (error: any) {
    console.error('❌ Error creating commission payment:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get commission analytics - trends, top performers, etc.
 */
router.get('/commissions/analytics', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30', startDate, endDate } = req.query;
    
    // Determine date range - use explicit dates if provided, otherwise calculate from period
    let dateStart = new Date();
    let dateEnd = new Date();
    
    if (startDate && endDate) {
      dateStart = new Date(startDate as string);
      dateEnd = new Date(endDate as string);
      console.log(`📊 GET /api/admin/commissions/analytics - Period: ${startDate} to ${endDate}`);
    } else {
      dateStart.setDate(dateStart.getDate() - parseInt(period as string));
      console.log(`📊 GET /api/admin/commissions/analytics - Period: ${period} days`);
    }

    // Get commission staff (both role variations)
    const { data: commissionStaff, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .or('role.eq.staff_commission,role.eq.commission_staff');

    if (staffError) throw staffError;

    if (!commissionStaff || commissionStaff.length === 0) {
      return res.json({
        top_performers: [],
        commission_trends: [],
        items_with_highest_commission: [],
        period_days: parseInt(period as string),
      });
    }

    const staffIds = commissionStaff.map(s => s.id);

    // Get staff_sales for the period (matches staff dashboard data source)
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('staff_sales')
      .select('*, items:item_id(id, name, commission, category)')
      .in('staff_id', staffIds)
      .gte('created_at', dateStart.toISOString())
      .lte('created_at', dateEnd.toISOString())
      .order('created_at', { ascending: true });

    if (salesError) throw salesError;

    if (!sales || sales.length === 0) {
      return res.json({
        top_performers: [],
        commission_trends: [],
        items_with_highest_commission: [],
        period_days: parseInt(period as string),
      });
    }

    // Calculate top performers
    const performerStats: Record<string, any> = {};
    commissionStaff.forEach(staff => {
      performerStats[staff.id] = {
        staff_id: staff.id,
        staff_name: staff.full_name,
        total_commission: 0,
        total_sales: 0,
        items_sold: 0,
      };
    });

    sales.forEach((sale: any) => {
      if (sale.items && performerStats[sale.staff_id]) {
        const commission = (sale.items.commission || 0) * sale.quantity;
        performerStats[sale.staff_id].total_commission += commission;
        performerStats[sale.staff_id].total_sales += sale.total_amount;
        performerStats[sale.staff_id].items_sold += sale.quantity;
      }
    });

    const topPerformers = Object.values(performerStats)
      .sort((a: any, b: any) => b.total_commission - a.total_commission)
      .slice(0, 10);

    // Calculate commission trends (daily)
    const trendMap: Record<string, number> = {};
    sales.forEach((sale: any) => {
      if (sale.items) {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        const commission = (sale.items.commission || 0) * sale.quantity;
        trendMap[date] = (trendMap[date] || 0) + commission;
      }
    });

    const commissionTrends = Object.entries(trendMap)
      .map(([date, commission]) => ({ date, commission }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate items with highest commission
    const itemCommissionMap: Record<string, any> = {};
    sales.forEach((sale: any) => {
      if (sale.items) {
        const itemId = sale.items.id;
        const commission = (sale.items.commission || 0) * sale.quantity;

        if (!itemCommissionMap[itemId]) {
          itemCommissionMap[itemId] = {
            item_id: itemId,
            item_name: sale.items.name,
            category: sale.items.category,
            commission_per_unit: sale.items.commission || 0,
            quantity_sold: 0,
            total_commission: 0,
          };
        }

        itemCommissionMap[itemId].quantity_sold += sale.quantity;
        itemCommissionMap[itemId].total_commission += commission;
      }
    });

    const itemsWithHighestCommission = Object.values(itemCommissionMap)
      .sort((a: any, b: any) => b.total_commission - a.total_commission)
      .slice(0, 10);

    res.json({
      top_performers: topPerformers,
      commission_trends: commissionTrends,
      items_with_highest_commission: itemsWithHighestCommission,
      period_days: parseInt(period as string),
    });
  } catch (error: any) {
    console.error('❌ Error fetching commission analytics:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// RESTOCK ORDERS
// ============================================================

/**
 * GET /restock-orders - Get all restock orders with their items
 */
router.get('/restock-orders', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from('restock_orders')
      .select(`
        *,
        restock_order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (orders || []).map((order: any) => ({
      id: order.id,
      orderNumber: order.order_number,
      date: order.created_at,
      items: (order.restock_order_items || []).map((item: any) => ({
        id: item.item_id,
        name: item.item_name,
        sku: item.sku || '',
        category: item.category || '',
        currentStock: item.current_stock,
        orderQuantity: item.order_quantity,
        unitPrice: parseFloat(item.unit_price),
        brand: item.brand || '',
        package_type: item.package_type || '',
      })),
      totalItems: order.total_items,
      totalQuantity: order.total_quantity,
      totalCost: parseFloat(order.total_cost),
      note: order.note || '',
      status: order.status,
      showItemName: order.show_item_name !== false,
      showSku: order.show_sku === true,
      showCategory: order.show_category === true,
      showBrandName: order.show_brand_name !== false,
      showPackageType: order.show_package_type !== false,
      showCurrentStock: order.show_current_stock === true,
      showOrderQuantity: order.show_order_quantity !== false,
      showUnitPrice: order.show_unit_price,
      showSubtotal: order.show_subtotal,
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('❌ Error fetching restock orders:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /restock-orders - Create a new restock order
 */
router.post('/restock-orders', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { orderNumber, items, totalItems, totalQuantity, totalCost, note, showItemName, showSku, showCategory, showBrandName, showPackageType, showCurrentStock, showOrderQuantity, showUnitPrice, showSubtotal } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'Order must have at least one item' });

    // Insert the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('restock_orders')
      .insert({
        order_number: orderNumber,
        created_by: userId,
        total_items: totalItems,
        total_quantity: totalQuantity,
        total_cost: totalCost,
        note: note || '',
        status: 'pending',
        show_item_name: showItemName !== false,
        show_sku: showSku === true,
        show_category: showCategory === true,
        show_brand_name: showBrandName !== false,
        show_package_type: showPackageType !== false,
        show_current_stock: showCurrentStock === true,
        show_order_quantity: showOrderQuantity !== false,
        show_unit_price: showUnitPrice !== false,
        show_subtotal: showSubtotal !== false,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      item_id: item.id,
      item_name: item.name,
      sku: item.sku || '',
      category: item.category || '',
      brand: item.brand || '',
      package_type: item.package_type || '',
      current_stock: item.currentStock,
      order_quantity: item.orderQuantity,
      unit_price: item.unitPrice,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('restock_order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    res.json({
      id: order.id,
      orderNumber: order.order_number,
      date: order.created_at,
      items: items,
      totalItems: order.total_items,
      totalQuantity: order.total_quantity,
      totalCost: parseFloat(order.total_cost),
      note: order.note,
      status: order.status,
      showItemName: order.show_item_name,
      showSku: order.show_sku,
      showCategory: order.show_category,
      showBrandName: order.show_brand_name,
      showPackageType: order.show_package_type,
      showCurrentStock: order.show_current_stock,
      showOrderQuantity: order.show_order_quantity,
      showUnitPrice: order.show_unit_price,
      showSubtotal: order.show_subtotal,
    });
  } catch (error: any) {
    console.error('❌ Error creating restock order:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /restock-orders/:id/status - Update order status
 */
router.patch('/restock-orders/:id/status', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabaseAdmin
      .from('restock_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ id: data.id, status: data.status });
  } catch (error: any) {
    console.error('❌ Error updating restock order status:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /restock-orders/:id - Delete a restock order
 */
router.delete('/restock-orders/:id', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Items are cascade-deleted
    const { error } = await supabaseAdmin
      .from('restock_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting restock order:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get server logs (superadmin only)
 * Query params: type=app|error|security, lines=number, date=YYYY-MM-DD
 */
router.get('/logs', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {

    const fs = require('fs');
    const pathModule = require('path');
    const logDir = process.env.LOG_DIR || pathModule.join(__dirname, '..', '..', 'logs');
    const type = (req.query.type as string) || 'app';
    const maxLines = Math.min(parseInt(req.query.lines as string) || 200, 1000);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Validate type to prevent path traversal
    const allowedTypes = ['app', 'error', 'security'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid log type' });
    }

    const filename = `${type}-${date}.log`;
    const filepath = pathModule.join(logDir, filename);

    // List available log files
    let availableFiles: string[] = [];
    try {
      const files = fs.readdirSync(logDir);
      availableFiles = files
        .filter((f: string) => f.endsWith('.log'))
        .sort()
        .reverse();
    } catch {
      availableFiles = [];
    }

    // Read log file
    let entries: any[] = [];
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      // Take last N lines
      const recentLines = lines.slice(-maxLines);
      entries = recentLines.map((line: string) => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, level: 'info', timestamp: '' };
        }
      }).reverse(); // newest first
    } catch {
      // File may not exist for this date
    }

    res.json({
      type,
      date,
      filename,
      entries,
      totalEntries: entries.length,
      availableFiles,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Stream server logs in real-time via SSE (superadmin only)
 * Query params: type=app|error|security (comma-separated for multiple)
 */
/**
 * Real-time server logs streaming (superadmin only)
 * Uses EventSource for SSE streaming
 * Query params: type=app|error|security, token=JWT
 */
router.get('/logs/stream', async (req: Request, res: Response) => {
  console.log('[SSE] 🟢 /logs/stream endpoint called');
  console.log('[SSE] Query params:', req.query);
  
  try {
    // Extract and verify JWT token from query params
    const token = req.query.token as string;
    
    console.log('[SSE] Token present:', !!token);
    
    if (!token) {
      console.log('[SSE] ❌ No token provided');
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
      // Verify token
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded: any = jwt.verify(token, secret);
      
      console.log('[SSE] ✅ Token verified, role:', decoded.role);

      // Only superadmin can use logs streaming
      if (decoded.role !== 'superadmin') {
        console.log('[SSE] ❌ User is not superadmin');
        return res.status(403).json({ error: 'Forbidden: Superadmin access required' });
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');

      const types = (req.query.type as string || 'app,error,security')
        .split(',')
        .map(t => t.trim())
        .filter(t => ['app', 'error', 'security'].includes(t)) as ('app' | 'error' | 'security')[];

      console.log('[SSE] Log types requested:', types);

      if (types.length === 0) {
        console.log('[SSE] ❌ No valid log types');
        return res.status(400).json({ error: 'Invalid log types' });
      }

      // Register SSE client and start streaming
      console.log('[SSE] 📡 Registering SSE client');
      logStreamService.registerSSEClient(res, types);
      // Service handles keep-alive and cleanup
      
      console.log('[SSE] ✅ SSE Stream initialized');
    } catch (error: any) {
      console.log('[SSE] ❌ Token verification failed:', error.message);
      logger.error('Token verification failed for logs stream', { error: error.message });
      return res.status(401).json({ error: `Unauthorized: ${error.message}` });
    }
  } catch (error: any) {
    console.error('[SSE] ❌ Stream error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
