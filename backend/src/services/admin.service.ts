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
   * Get staff expenses with enriched staff information
   */
  async getStaffExpenses(staffId?: string): Promise<any[]> {
    try {
      console.log(`\n🚀 === Starting getStaffExpenses, staffId filter: ${staffId || 'none'} ===`);
      
      // Try fetching with JOIN using Supabase
      console.log('📝 Attempting to fetch expenses with staff JOIN...');
      
      let query = supabaseAdmin
        .from('staff_expenses')
        .select(`
          id,
          staff_id,
          expense_category,
          expense_amount,
          description,
          expense_date,
          status,
          created_at,
          updated_at,
          users:staff_id (
            id,
            full_name,
            email,
            role
          )
        `);

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data: joinedExpenses, error: joinError } = await query.order('expense_date', { ascending: false });

      if (!joinError && joinedExpenses && joinedExpenses.length > 0) {
        console.log(`✅ JOIN query successful! Got ${joinedExpenses.length} expenses`);
        
        // Map the joined data
        const mappedExpenses = joinedExpenses.map((exp: any) => {
          const user = exp.users;
          console.log(`🔍 Expense staff info:`, { staff_id: exp.staff_id, user_name: user?.full_name });
          
          return {
            id: exp.id,
            staff_id: exp.staff_id,
            expense_type: exp.expense_category,
            amount: exp.expense_amount,
            description: exp.description,
            expense_date: exp.expense_date,
            status: exp.status,
            created_at: exp.created_at,
            updated_at: exp.updated_at,
            staff_name: user?.full_name || 'Unknown Staff',
            staff_email: user?.email || 'N/A',
            staff_role: user?.role || 'Unknown Role',
            staff_phone: null,  // Phone field not available in users table
          };
        });
        
        console.log(`✅ Mapped ${mappedExpenses.length} expenses with staff info`);
        if (mappedExpenses.length > 0) {
          console.log(`📤 Sample: ${mappedExpenses[0].staff_name} - ${mappedExpenses[0].expense_type}`);
        }
        return mappedExpenses;
      }

      // Fallback to manual enrichment if JOIN fails
      console.log(`⚠️ JOIN query failed or returned no data: ${joinError?.message || 'unknown error'}`);
      console.log('📝 Falling back to manual enrichment method...');
      
      const expenses = await expensesService.getAllExpenses(staffId);
      
      console.log(`📊 Raw expenses count: ${expenses.length}`);
      if (expenses.length > 0) {
        console.log(`📊 First expense staff_id: ${expenses[0].staff_id}`);
      }
      
      if (!expenses || expenses.length === 0) {
        console.log('📭 No expenses found');
        return [];
      }

      // Get unique staff IDs from expenses - filter out null/undefined
      const staffIds = [...new Set(expenses.map(e => e.staff_id).filter(Boolean))];
      console.log(`📥 Unique staff IDs to fetch: ${staffIds.length}`, staffIds);

      if (staffIds.length === 0) {
        console.warn('⚠️ No valid staff IDs found in expenses');
        return expenses;
      }

      // Fetch staff information
      const { data: staffMembers, error: staffError } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email, role')
        .in('id', staffIds);

      if (staffError) {
        console.error('❌ Error fetching staff info:', staffError);
        return expenses;
      }

      console.log(`📥 Fetched ${(staffMembers || []).length} staff members from database`);
      if ((staffMembers || []).length > 0) {
        console.log(`📥 First staff member:`, staffMembers?.[0]);
      }

      // Create a map of staff by ID for quick lookup
      const staffMap: Record<string, any> = {};
      (staffMembers || []).forEach(staff => {
        staffMap[staff.id] = staff;
        console.log(`✅ Mapped staff ${staff.id} -> ${staff.full_name}`);
      });

      // Enrich expenses with staff information
      const enrichedExpenses = expenses.map((expense: any) => {
        const staff = staffMap[expense.staff_id];
        if (!staff) {
          console.log(`⚠️ No staff found for staff_id="${expense.staff_id}"`);
        }
        
        return {
          ...expense,
          staff_name: staff?.full_name || 'Unknown Staff',
          staff_email: staff?.email || 'N/A',
          staff_role: staff?.role || 'Unknown Role',
          staff_phone: null,  // Phone field not available in users table
        };
      });

      console.log(`✅ Enriched ${enrichedExpenses.length} expenses with staff information\n`);
      return enrichedExpenses;
    } catch (error: any) {
      console.error('❌ Error enriching expenses with staff info:', error.message);
      console.error('❌ Stack:', error.stack);
      // Fall back to basic expenses without staff enrichment
      console.log('⚠️ Returning raw expenses due to error');
      return await expensesService.getAllExpenses(staffId);
    }
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

  /**
   * Get comprehensive reports with all data aggregations
   */
  async getComprehensiveReport(
    dateRange: 'today' | 'week' | 'month' | 'year' | 'custom',
    customFrom?: string,
    customTo?: string,
    staffId?: string,
    staffRole?: string
  ): Promise<any> {
    try {
      console.log(`\n🚀 === Generating Comprehensive Report ===`);
      console.log(`   Date Range: ${dateRange}, Staff ID: ${staffId}, Staff Role: ${staffRole}`);

      // Calculate date range
      const now = new Date();
      let from = new Date();
      let to = new Date();

      switch (dateRange) {
        case 'today':
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'week':
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          from = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          if (customFrom) from = new Date(customFrom);
          if (customTo) to = new Date(customTo);
          break;
      }

      const fromISO = from.toISOString();
      const toISO = to.toISOString();
      console.log(`   Date filters: ${fromISO} to ${toISO}`);

      // Fetch receipts data (actual sales records)
      let receiptsQuery = supabaseAdmin
        .from('receipts')
        .select('*')
        .gte('created_at', fromISO)
        .lte('created_at', toISO);

      if (staffId) receiptsQuery = receiptsQuery.eq('staff_id', staffId);

      const { data: receiptsRaw, error: receiptsError } = await receiptsQuery;
      if (receiptsError) {
        console.error('Receipts fetch error:', receiptsError);
        throw receiptsError;
      }

      console.log(`✅ Fetched ${receiptsRaw?.length || 0} receipts records`);

      // Enrich receipts with user data
      const receiptStaffIds = new Set((receiptsRaw || []).map(r => r.staff_id));
      let receiptUsersMap = new Map<string, any>();
      
      if (receiptStaffIds.size > 0) {
        const { data: receiptStaffData } = await supabaseAdmin
          .from('users')
          .select('id, full_name, email, role')
          .in('id', Array.from(receiptStaffIds));
        
        if (receiptStaffData) {
          receiptStaffData.forEach(u => receiptUsersMap.set(u.id, u));
        }
      }

      // Merge user data into receipts
      const receipts = (receiptsRaw || []).map(r => ({
        ...r,
        users: receiptUsersMap.get(r.staff_id) || { full_name: null, email: null, role: null }
      }));

      // Fetch receipt items to get item details
      const { data: receiptItems, error: itemsError } = await supabaseAdmin
        .from('receipt_items')
        .select('*, items(id, name, category)')
        .in('receipt_id', (receipts || []).map(r => r.id));

      if (itemsError) {
        console.error('Receipt items fetch error:', itemsError);
        throw itemsError;
      }

      console.log(`✅ Fetched ${receiptItems?.length || 0} receipt item records`);

      // Fetch expenses data
      // Get expenses without join first, then enrich with user data
      let expensesQuery = supabaseAdmin
        .from('staff_expenses')
        .select('*')
        .gte('expense_date', from.toISOString().split('T')[0])
        .lte('expense_date', to.toISOString().split('T')[0]);

      if (staffId) expensesQuery = expensesQuery.eq('staff_id', staffId);

      const { data: expensesRaw, error: expensesError } = await expensesQuery;
      if (expensesError) {
        console.error('Expenses fetch error:', expensesError);
        throw expensesError;
      }

      console.log(`✅ Fetched ${expensesRaw?.length || 0} expense records`);

      // Enrich expenses with user data
      const staffIds = new Set((expensesRaw || []).map(e => e.staff_id));
      let usersData = new Map<string, any>();
      
      if (staffIds.size > 0) {
        const { data: staffData, error: staffError } = await supabaseAdmin
          .from('users')
          .select('id, full_name, email, role')
          .in('id', Array.from(staffIds));
        
        if (!staffError && staffData) {
          staffData.forEach(u => usersData.set(u.id, u));
        }
      }

      // Merge user data into expenses
      const expenses = (expensesRaw || []).map(e => ({
        ...e,
        users: usersData.get(e.staff_id) || { full_name: null, email: null, role: null }
      }));

      console.log(`✅ Fetched ${expenses?.length || 0} expense records`);

      // Fetch inventory data WITHOUT JOINs (relationships not set up in Supabase)
      // Will enrich manually with item data below
      const { data: mainStoreRaw, error: mainStoreError } = await supabaseAdmin
        .from('inventory_main_store')
        .select('*');

      if (mainStoreError) console.error('Main store inventory error:', mainStoreError);

      const { data: activeStoreRaw, error: activeStoreError } = await supabaseAdmin
        .from('inventory_active_store')
        .select('*');

      if (activeStoreError) console.error('Active store inventory error:', activeStoreError);

      const { data: staffStoreRaw, error: staffStoreError } = await supabaseAdmin
        .from('staff_store')
        .select('*');

      if (staffStoreError) console.error('Staff store inventory error:', staffStoreError);

      console.log(`✅ Fetched ${mainStoreRaw?.length || 0} main store items, ${activeStoreRaw?.length || 0} active store items, and ${staffStoreRaw?.length || 0} staff store items`);

      // Get all item IDs and fetch items data to enrich inventory
      const allItemIds = new Set<string>();
      (mainStoreRaw || []).forEach((inv: any) => allItemIds.add(inv.item_id));
      (activeStoreRaw || []).forEach((inv: any) => allItemIds.add(inv.item_id));
      (staffStoreRaw || []).forEach((inv: any) => allItemIds.add(inv.item_id));

      // Fetch items data for enrichment
      let itemsDataMap = new Map<string, any>();
      if (allItemIds.size > 0) {
        const { data: itemsData, error: itemsDataError } = await supabaseAdmin
          .from('items')
          .select('id, name, unit_price')
          .in('id', Array.from(allItemIds));

        if (!itemsDataError && itemsData) {
          itemsData.forEach((item: any) => {
            itemsDataMap.set(item.id, item);
          });
        }
      }

      console.log(`✅ Fetched ${itemsDataMap.size} items for enrichment`);

      // Enrich inventory data with friendly field names AND item data
      const mainStoreArray = (mainStoreRaw || []).map((inv: any) => {
        const itemData = itemsDataMap.get(inv.item_id);
        return {
          id: inv.id,
          item_id: inv.item_id,
          item_name: itemData?.name || `Item ${inv.item_id}`,
          quantity: inv.quantity_in_stock || 0,
          unit_price: itemData?.unit_price || 0,
          reorder_level: inv.reorder_level || 10,
          last_restocked: inv.last_restocked,
          notes: inv.notes,
        };
      });

      const activeStoreArray = (activeStoreRaw || []).map((inv: any) => {
        const itemData = itemsDataMap.get(inv.item_id);
        return {
          id: inv.id,
          item_id: inv.item_id,
          item_name: itemData?.name || `Item ${inv.item_id}`,
          quantity: inv.quantity_available || 0,
          quantity_sold: inv.quantity_sold || 0,
          unit_price: itemData?.unit_price || 0,
          last_updated: inv.last_updated,
        };
      });

      const staffStoreArray = (staffStoreRaw || []).map((inv: any) => {
        const itemData = itemsDataMap.get(inv.item_id);
        return {
          id: inv.id,
          staff_id: inv.staff_id,
          item_id: inv.item_id,
          item_name: itemData?.name || `Item ${inv.item_id}`,
          quantity: inv.quantity || 0,
          quantity_available: inv.quantity_available || 0,
          quantity_sold: inv.quantity_sold || 0,
          unit_price: itemData?.unit_price || 0,
          posted_date: inv.posted_date,
        };
      });

      // Calculate summaries
      const salesArray = receipts || [];
      const expensesArray = expenses || [];

      const totalRevenue = salesArray.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const totalExpenses = expensesArray.reduce((sum, e) => sum + (e.expense_amount || 0), 0);
      const totalProfit = totalRevenue - totalExpenses;
      const totalItemsSold = (receiptItems || []).reduce((sum, ri) => sum + (ri.quantity || 0), 0);
      const avgTransaction = salesArray.length > 0 ? totalRevenue / salesArray.length : 0;

      // Create mapping of receipt items by receipt_id for easier lookup
      const itemsByReceiptId = new Map<string, any[]>();
      (receiptItems || []).forEach((item) => {
        if (!itemsByReceiptId.has(item.receipt_id)) {
          itemsByReceiptId.set(item.receipt_id, []);
        }
        itemsByReceiptId.get(item.receipt_id)!.push(item);
      });

      // Group sales by staff
      const salesByStaff = new Map<string, any>();
      salesArray.forEach((receipt) => {
        const staffName = receipt.users?.full_name || `Staff ${receipt.staff_id}`;
        const key = receipt.staff_id;
        if (!salesByStaff.has(key)) {
          salesByStaff.set(key, {
            staff_id: receipt.staff_id,
            staff_name: staffName,
            total_sales: 0,
            total_amount: 0,
            items_count: 0,
          });
        }
        const current = salesByStaff.get(key);
        current.total_sales += 1;
        current.total_amount += receipt.total_amount || 0;
        const receiptItemsForThisReceipt = itemsByReceiptId.get(receipt.id) || [];
        current.items_count += receiptItemsForThisReceipt.reduce((sum, item) => sum + (item.quantity || 0), 0);
      });

      // Group sales by staff role
      const salesByRole = new Map<string, any>();
      salesArray.forEach((receipt) => {
        const role = receipt.users?.role || 'unknown';
        if (!salesByRole.has(role)) {
          salesByRole.set(role, {
            role: role,
            total_sales: 0,
            total_amount: 0,
          });
        }
        const current = salesByRole.get(role);
        current.total_sales += 1;
        current.total_amount += receipt.total_amount || 0;
      });

      // Group sales by day
      const salesByDay = new Map<string, any>();
      salesArray.forEach((receipt) => {
        const date = new Date(receipt.created_at).toISOString().split('T')[0];
        if (!salesByDay.has(date)) {
          salesByDay.set(date, {
            date: date,
            total_sales: 0,
            total_amount: 0,
          });
        }
        const current = salesByDay.get(date);
        current.total_sales += 1;
        current.total_amount += receipt.total_amount || 0;
      });

      // Group items sold
      const itemsSold = new Map<string, any>();
      (receiptItems || []).forEach((receiptItem) => {
        const itemName = receiptItem.items?.name || `Item ${receiptItem.item_id}`;
        if (!itemsSold.has(receiptItem.item_id)) {
          itemsSold.set(receiptItem.item_id, {
            item_id: receiptItem.item_id,
            item_name: itemName,
            quantity_sold: 0,
            total_revenue: 0,
          });
        }
        const current = itemsSold.get(receiptItem.item_id);
        current.quantity_sold += receiptItem.quantity || 0;
        current.total_revenue += receiptItem.total_price || 0;
      });

      // Calculate average price per item
      itemsSold.forEach((item) => {
        item.avg_price = item.quantity_sold > 0 ? item.total_revenue / item.quantity_sold : 0;
      });

      // Group expenses by staff
      const expensesByStaff = new Map<string, any>();
      expensesArray.forEach((expense) => {
        const staffName = expense.users?.full_name || `Staff ${expense.staff_id}`;
        if (!expensesByStaff.has(expense.staff_id)) {
          expensesByStaff.set(expense.staff_id, {
            staff_id: expense.staff_id,
            staff_name: staffName,
            total_amount: 0,
            count: 0,
          });
        }
        const current = expensesByStaff.get(expense.staff_id);
        current.total_amount += expense.expense_amount || 0;
        current.count += 1;
      });

      // Group expenses by type
      const expensesByType = new Map<string, any>();
      expensesArray.forEach((expense) => {
        const type = expense.expense_category || 'other';
        if (!expensesByType.has(type)) {
          expensesByType.set(type, {
            expense_type: type,
            total_amount: 0,
            count: 0,
          });
        }
        const current = expensesByType.get(type);
        current.total_amount += expense.expense_amount || 0;
        current.count += 1;
      });

      // Group expenses by day
      const expensesByDay = new Map<string, any>();
      expensesArray.forEach((expense) => {
        const date = new Date(expense.created_at).toISOString().split('T')[0];
        if (!expensesByDay.has(date)) {
          expensesByDay.set(date, {
            date: date,
            total_amount: 0,
          });
        }
        const current = expensesByDay.get(date);
        current.total_amount += expense.expense_amount || 0;
      });

      // Calculate inventory totals and find low stock
      const mainStoreTotal = mainStoreArray.length;
      const mainStoreTotalQuantity = mainStoreArray.reduce((sum, item: any) => sum + (item.quantity || 0), 0);
      
      const activeStoreTotal = activeStoreArray.length;
      const activeStoreTotalQuantity = activeStoreArray.reduce((sum, item: any) => sum + (item.quantity || 0), 0);
      
      const staffStoreTotal = staffStoreArray.length;
      const staffStoreTotalQuantity = staffStoreArray.reduce((sum, item: any) => sum + (item.quantity || 0), 0);
      
      // Calculate combined quantities per item across all stores
      const itemQuantitiesMap = new Map<string, any>();
      
      // Add from main store
      mainStoreArray.forEach((item: any) => {
        if (!itemQuantitiesMap.has(item.item_id)) {
          itemQuantitiesMap.set(item.item_id, {
            item_id: item.item_id,
            item_name: item.item_name,
            total_quantity: 0,
            stores: [],
            reorder_level: item.reorder_level || 10,
          });
        }
        const combined = itemQuantitiesMap.get(item.item_id);
        combined.total_quantity += item.quantity || 0;
        combined.stores.push({ store: 'Main', quantity: item.quantity });
      });
      
      // Add from active store
      activeStoreArray.forEach((item: any) => {
        if (!itemQuantitiesMap.has(item.item_id)) {
          itemQuantitiesMap.set(item.item_id, {
            item_id: item.item_id,
            item_name: item.item_name,
            total_quantity: 0,
            stores: [],
            reorder_level: 10,
          });
        }
        const combined = itemQuantitiesMap.get(item.item_id);
        combined.total_quantity += item.quantity || 0;
        combined.stores.push({ store: 'Active', quantity: item.quantity });
      });
      
      // Add from staff store
      staffStoreArray.forEach((item: any) => {
        if (!itemQuantitiesMap.has(item.item_id)) {
          itemQuantitiesMap.set(item.item_id, {
            item_id: item.item_id,
            item_name: item.item_name,
            total_quantity: 0,
            stores: [],
            reorder_level: 10,
          });
        }
        const combined = itemQuantitiesMap.get(item.item_id);
        combined.total_quantity += item.quantity || 0;
        combined.stores.push({ store: 'Staff', quantity: item.quantity });
      });
      
      // Low stock: items with combined quantity < 100
      const lowStockItems = Array.from(itemQuantitiesMap.values())
        .filter((item: any) => item.total_quantity < 100)
        .map((item: any) => ({
          ...item,
          status: item.total_quantity >= 50 ? 'Low' : item.total_quantity >= 20 ? 'Critical' : 'Urgent'
        }));
      
      const lowStockTotal = lowStockItems.length;
      const lowStockTotalQuantity = lowStockItems.reduce((sum, item: any) => sum + (item.total_quantity || 0), 0);

      // Top performers
      const topStaff = Array.from(salesByStaff.values())
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 5);

      const topItems = Array.from(itemsSold.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      // Staff performance details
      const staffPerformanceMap = new Map<string, any>();

      // Add sales data
      Array.from(salesByStaff.values()).forEach((sale) => {
        if (!staffPerformanceMap.has(sale.staff_id)) {
          staffPerformanceMap.set(sale.staff_id, {
            staff_id: sale.staff_id,
            staff_name: sale.staff_name,
            role: 'unknown',
            total_transactions: 0,
            total_revenue: 0,
            total_expenses: 0,
            profit_loss: 0,
          });
        }
        const current = staffPerformanceMap.get(sale.staff_id);
        current.total_transactions = sale.total_sales;
        current.total_revenue = sale.total_amount;
      });

      // Add expense data and role info
      expensesArray.forEach((expense) => {
        if (!staffPerformanceMap.has(expense.staff_id)) {
          staffPerformanceMap.set(expense.staff_id, {
            staff_id: expense.staff_id,
            staff_name: expense.users?.full_name || `Staff ${expense.staff_id}`,
            role: expense.users?.role || 'unknown',
            total_transactions: 0,
            total_revenue: 0,
            total_expenses: 0,
            profit_loss: 0,
          });
        }
        const current = staffPerformanceMap.get(expense.staff_id);
        current.total_expenses += expense.expense_amount || 0;
        current.role = expense.users?.role || current.role;
      });

      // Calculate profit/loss
      staffPerformanceMap.forEach((staff) => {
        staff.profit_loss = staff.total_revenue - staff.total_expenses;
      });

      console.log(`✅ Report generation complete`);

      return {
        summary: {
          total_sales: salesArray.length,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          total_profit: totalProfit,
          total_items_sold: totalItemsSold,
          avg_transaction: avgTransaction,
        },
        sales: {
          by_staff: Array.from(salesByStaff.values()),
          by_staff_role: Array.from(salesByRole.values()),
          by_day: Array.from(salesByDay.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
          items_list: Array.from(itemsSold.values()).sort((a, b) => b.total_revenue - a.total_revenue),
        },
        expenses: {
          total: totalExpenses,
          by_staff: Array.from(expensesByStaff.values()),
          by_type: Array.from(expensesByType.values()),
          by_day: Array.from(expensesByDay.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        },
        inventory: {
          main_store_total: mainStoreTotal,
          main_store_total_quantity: mainStoreTotalQuantity,
          main_store_items: mainStoreArray,
          active_store_total: activeStoreTotal,
          active_store_total_quantity: activeStoreTotalQuantity,
          active_store_items: activeStoreArray,
          staff_store_total: staffStoreTotal,
          staff_store_total_quantity: staffStoreTotalQuantity,
          staff_store_items: staffStoreArray,
          low_stock_total: lowStockTotal,
          low_stock_total_quantity: lowStockTotalQuantity,
          low_stock_items: lowStockItems,
        },
        performance: {
          top_staff: topStaff,
          top_items: topItems,
          staff_details: Array.from(staffPerformanceMap.values()),
        },
      };
    } catch (error: any) {
      console.error('❌ Error generating comprehensive report:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
