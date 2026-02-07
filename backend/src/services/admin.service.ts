import { supabaseAdmin } from '../config/supabase';
import expensesService from './expenses.service';

export class AdminService {
  /**
   * Get all staff with activities (including admins)
   */
  async getAllStaff(): Promise<any[]> {
    // Query all users - no filtering
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*');

    if (error) {
      console.error('❌ getAllStaff query error:', error);
      throw error;
    }

    const allUsers = data || [];
    console.log(`✅ getAllStaff: Found ${allUsers.length} total users in database`);
    allUsers.forEach((u, idx) => {
      console.log(`   [${idx}] ID: ${u.id.substring(0, 8)}... | Email: ${u.email} | Username: ${u.username} | Role: "${u.role}"`);
    });

    // Enhance each user with activity data
    const enrichedStaff = await Promise.all(
      allUsers.map(async (staff) => {
        try {
          const { data: sales, error: salesError } = await supabaseAdmin
            .from('sales')
            .select('*')
            .eq('staff_id', staff.id);

          if (salesError) {
            console.log(`Sales query error for ${staff.id}:`, salesError);
          }

          const totalItems = sales?.reduce((sum, s) => sum + (s?.quantity || 0), 0) || 0;
          const totalAmount = sales?.reduce((sum, s) => sum + (s?.total_amount || 0), 0) || 0;

          return {
            ...staff,
            total_sales_items: totalItems,
            total_sales_amount: totalAmount,
          };
        } catch (err) {
          console.error(`Error processing staff ${staff.id}:`, err);
          return {
            ...staff,
            total_sales_items: 0,
            total_sales_amount: 0,
          };
        }
      })
    );

    console.log(`✅ getAllStaff: Returning ${enrichedStaff.length} enriched staff records`);
    enrichedStaff.forEach((s, idx) => {
      console.log(`   [${idx}] ${s.email} | Role: "${s.role}" | Sales: ${s.total_sales_items} items`);
    });
    return enrichedStaff;
  }

  /**
   * Get commission records
   */
  async getCommissions(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('staff_commissions')
      .select('*, users(full_name, email), items(name)');

    if (error) throw error;
    return data || [];
  }

  /**
   * Set commission for staff on item
   */
  async setCommission(staffId: string, itemId: string, commissionPercentage: number): Promise<void> {
    const { error } = await supabaseAdmin.from('staff_commissions').upsert(
      [
        {
          staff_id: staffId,
          item_id: itemId,
          commission_percentage: commissionPercentage,
        },
      ],
      { onConflict: 'staff_id,item_id' }
    );

    if (error) throw error;
  }

  /**
   * Get all pending payments for approval
   */
  async getPendingPayments(): Promise<any[]> {
    console.log('📥 getPendingPayments called');
    
    // First, fetch all pending payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('staff_payments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('❌ Error fetching pending payments from Supabase:', paymentsError);
      throw paymentsError;
    }
    
    console.log(`✅ Supabase returned ${(payments || []).length} pending payments`);
    
    if (!payments || payments.length === 0) {
      console.log('⚠️ No pending payments found in database');
      return [];
    }
    
    // Now fetch staff info for each payment
    const staffIds = [...new Set((payments || []).map(p => p.staff_id))];
    console.log(`📥 Fetching staff info for ${staffIds.length} unique staff members`);
    
    const { data: staffMembers, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .in('id', staffIds);
    
    if (staffError) {
      console.error('❌ Error fetching staff info:', staffError);
      // Continue anyway, just won't have staff names
    }
    
    // Create a map of staff by ID for quick lookup
    const staffMap: Record<string, any> = {};
    (staffMembers || []).forEach(staff => {
      staffMap[staff.id] = staff;
    });
    
    // Map the payments and include staff info
    const mappedPayments = (payments || []).map((payment: any) => {
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
    
    console.log(`✅ First pending payment:`, JSON.stringify(mappedPayments[0], null, 2));
    console.log(`✅ Returning ${mappedPayments.length} mapped pending payments`);
    return mappedPayments;
  }

  /**
   * Approve payment
   */
  async approvePayment(paymentId: string): Promise<void> {
    const { error: updateError } = await supabaseAdmin
      .from('staff_payments')
      .update({ status: 'approved', approved_date: new Date().toISOString() })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    // Get payment and staff info to create notification
    const { data: payment } = await supabaseAdmin
      .from('staff_payments')
      .select('staff_id, staff_name, amount')
      .eq('id', paymentId)
      .single();

    if (payment) {
      console.log('✅ Sending approval notification to:', payment.staff_id);
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: payment.staff_id,
          type: 'payment_approved',
          title: '✅ Payment Approved',
          message: `Your payment of ₦${payment.amount?.toLocaleString() || '0'} has been approved by admin. Check your account.`,
          related_id: paymentId,
          read: false,
        },
      ]);
    }
  }

  /**
   * Reject payment
   */
  async rejectPayment(paymentId: string, reason?: string): Promise<void> {
    const { error: updateError } = await supabaseAdmin
      .from('staff_payments')
      .update({ 
        status: 'rejected', 
        rejection_reason: reason || 'No reason provided',
        notes: `REJECTED - ${reason || 'No reason provided'}`
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    // Get payment and staff info to create notification
    const { data: payment } = await supabaseAdmin
      .from('staff_payments')
      .select('staff_id, staff_name, amount')
      .eq('id', paymentId)
      .single();

    if (payment) {
      console.log('❌ Sending rejection notification to:', payment.staff_id);
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: payment.staff_id,
          type: 'payment_rejected',
          title: '❌ Payment Rejected',
          message: `Your payment of ₦${payment.amount?.toLocaleString() || '0'} was rejected. Reason: ${reason || 'Please contact admin for details'}`,
          related_id: paymentId,
          read: false,
        },
      ]);
    }
  }

  /**
   * Get sales reports
   */
  async getSalesReport(staffId?: string): Promise<any> {
    let query = supabaseAdmin.from('sales').select('*');

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    const { data: sales, error } = await query;

    if (error) throw error;

    const summary = {
      total_sales: sales?.length || 0,
      total_amount: sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
      total_items: sales?.reduce((sum, s) => sum + s.quantity, 0) || 0,
      by_category: {} as any,
      by_payment_method: {} as any,
    };

    // Group by category
    sales?.forEach((sale) => {
      const category = sale.items.category;
      if (!summary.by_category[category]) {
        summary.by_category[category] = { count: 0, amount: 0 };
      }
      summary.by_category[category].count++;
      summary.by_category[category].amount += sale.total_amount;
    });

    // Group by payment method
    sales?.forEach((sale) => {
      const method = sale.payment_method;
      if (!summary.by_payment_method[method]) {
        summary.by_payment_method[method] = { count: 0, amount: 0 };
      }
      summary.by_payment_method[method].count++;
      summary.by_payment_method[method].amount += sale.total_amount;
    });

    return summary;
  }

  /**
   * Get staff expenses
   */
  async getStaffExpenses(staffId?: string): Promise<any[]> {
    return await expensesService.getAllExpenses(staffId);
  }

  /**
   * Sync database users to Supabase Auth
   * Creates Auth accounts for all users in the database that don't have Auth accounts yet
   */
  async syncUsersToAuth(): Promise<{
    total: number;
    created: number;
    skipped: number;
    errors: Array<{ email: string; reason: string }>;
  }> {
    // Get all users from database
    const { data: dbUsers, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email, password, full_name');

    if (dbError) throw dbError;

    const users = dbUsers || [];
    let created = 0;
    let skipped = 0;
    const errors: Array<{ email: string; reason: string }> = [];

    console.log(`🔄 Starting sync of ${users.length} users to Auth...`);

    // For each user, try to create an Auth account
    for (const user of users) {
      try {
        // Check if user already exists in Auth
        const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(user.id);

        if (existingAuth?.user) {
          console.log(`⏭️ Skipping ${user.email} - already exists in Auth`);
          skipped++;
          continue;
        }
      } catch (err) {
        // User doesn't exist, which is what we expect
      }

      try {
        // Validate and prepare password
        let password = 'DefaultPass123!'; // Fallback secure password
        
        // Check if password exists and is not a hash or placeholder
        if (user.password && user.password.length > 0) {
          // If it looks like a bcrypt hash, don't use it
          if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$') || 
              user.password === '$2b$10$YourHashedPasswordHere' ||
              user.password.includes('YourHashedPasswordHere')) {
            password = 'DefaultPass123!'; // Use default for hashed/placeholder passwords
          } else if (user.password.length >= 6) {
            // Use the stored password if it looks valid
            password = user.password;
          }
        }

        console.log(`Creating Auth account for ${user.email}...`);

        const { error: authError } = await supabaseAdmin.auth.admin.createUser({
          id: user.id,
          email: user.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
          },
        });

        if (authError) {
          // Check if it's an "already exists" error - that's not really an error
          if (authError.message && authError.message.includes('already been registered')) {
            console.log(`⏭️ ${user.email} already exists in Auth (previous sync)`);
            skipped++;
          } else {
            console.error(`❌ Error creating Auth for ${user.email}:`, authError.message);
            errors.push({ email: user.email, reason: authError.message });
          }
        } else {
          console.log(`✅ Created Auth account for ${user.email}`);
          created++;
        }
      } catch (err: any) {
        console.error(`❌ Exception creating Auth for ${user.email}:`, err.message);
        errors.push({ email: user.email, reason: err.message });
      }
    }

    console.log(`✅ Sync complete: ${created} created, ${skipped} skipped, ${errors.length} errors`);

    return {
      total: users.length,
      created,
      skipped,
      errors,
    };
  }
}

export const adminService = new AdminService();
