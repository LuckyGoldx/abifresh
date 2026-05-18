import { supabaseAdmin } from '../config/supabase';

interface CreateExpenseParams {
  staff_id: string;
  expense_type: string;  // maps to expense_category in DB
  amount: number;        // maps to expense_amount in DB
  description?: string;
  expense_date?: string;
}

class ExpensesService {
  /**
   * Create a new expense
   * Maps frontend field names to actual database column names:
   *   expense_type → expense_category
   *   amount → expense_amount
   */
  async createExpense(params: CreateExpenseParams): Promise<any> {
    try {
      const { staff_id, expense_type, amount, description, expense_date } = params;

      const parsedAmount = parseFloat(amount.toString());
      console.log('📊 [EXPENSE SERVICE] createExpense called:');
      console.log('  Raw amount received:', amount, `(type: ${typeof amount})`);
      console.log('  Parsed amount:', parsedAmount);
      console.log('  Staff ID:', staff_id);
      console.log('  Expense type:', expense_type);
      console.log('  Expense date:', expense_date);

      // Fetch staff member name and role
      let staffName = 'Staff';
      let userRole = 'staff';
      try {
        const { data: staffMember } = await supabaseAdmin
          .from('users')
          .select('full_name, role')
          .eq('id', staff_id)
          .single();
        if (staffMember) {
          if (staffMember.full_name) staffName = staffMember.full_name;
          if (staffMember.role) userRole = staffMember.role.toLowerCase();
        }
      } catch (err: any) {
        console.error('⚠️ Could not fetch staff details:', err.message);
      }

      const isClientAdmin = userRole === 'admin' || userRole === 'superadmin';
      const defaultStatus = isClientAdmin ? 'approved' : 'pending';

      const { data, error } = await supabaseAdmin
        .from('staff_expenses')
        .insert({
          staff_id,
          expense_category: expense_type,  // DB column is expense_category
          expense_amount: parsedAmount,  // DB column is expense_amount
          description: description || null,
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          status: defaultStatus,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error.message);
        throw error;
      }

      console.log('✅ Expense inserted and returned from Supabase:', data);

      // Fetch all admins and superadmins - only if the creator is NOT an admin/superadmin!
      if (!isClientAdmin) {
        try {
          const { data: admins } = await supabaseAdmin
            .from('users')
            .select('id')
            .in('role', ['admin', 'superadmin']);

          if (admins && admins.length > 0) {
            const notifications = admins.map((admin: any) => ({
              user_id: admin.id,
              type: 'expense_request',
              title: '💸 New Expense Request (Pending)',
              message: `${staffName} submitted an expense of ₦${parsedAmount?.toLocaleString()} for ${expense_type}. (Pending)`,
              action_url: `/admin/expenses?id=${data.id}`,
              is_read: false,
            }));

            await supabaseAdmin.from('notifications').insert(notifications);
            console.log(`✅ Sent expense_request notification to ${admins.length} admins`);
          }
        } catch (err: any) {
          console.error('⚠️ Could not create admin notifications:', err.message);
        }
      }

      return data;
    } catch (error: any) {
      console.error('❌ ExpensesService.createExpense error:', error.message);
      throw error;
    }
  }

  /**
   * Get expenses for a staff member
   */
  async getExpensesByStaff(staff_id: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('staff_expenses')
        .select('*')
        .eq('staff_id', staff_id)
        .order('expense_date', { ascending: false });

      if (error) {
        console.warn('⚠️  Could not fetch expenses:', error.message);
        return [];
      }

      // Map DB column names back to frontend-friendly names and parse admin note
      return (data || []).map((exp: any) => {
        const parts = exp.description ? exp.description.split('\n\n[Admin Note]: ') : [];
        return {
          id: exp.id,
          staff_id: exp.staff_id,
          expense_type: exp.expense_category,  // Map back for frontend
          amount: exp.expense_amount,          // Map back for frontend
          description: parts[0] || '',
          admin_notes: parts[1] || '',
          expense_date: exp.expense_date,
          status: exp.status || 'pending',
          approved_by: exp.approved_by,
          approved_date: exp.approved_date,
          created_at: exp.created_at,
          updated_at: exp.updated_at,
        };
      });
    } catch (error: any) {
      console.error('❌ ExpensesService.getExpensesByStaff error:', error.message);
      return [];
    }
  }

  /**
   * Get all expenses (admin)
   */
  async getAllExpenses(staff_id?: string): Promise<any[]> {
    try {
      let query = supabaseAdmin
        .from('staff_expenses')
        .select('*');

      if (staff_id) {
        query = query.eq('staff_id', staff_id);
      }

      const { data, error } = await query.order('expense_date', { ascending: false });

      if (error) {
        console.warn('⚠️  Could not fetch expenses:', error.message);
        return [];
      }

      // Map DB column names back to frontend-friendly names and parse admin note
      return (data || []).map((exp: any) => {
        const parts = exp.description ? exp.description.split('\n\n[Admin Note]: ') : [];
        return {
          id: exp.id,
          staff_id: exp.staff_id,
          expense_type: exp.expense_category,
          amount: exp.expense_amount,
          description: parts[0] || '',
          admin_notes: parts[1] || '',
          expense_date: exp.expense_date,
          status: exp.status || 'pending',
          approved_by: exp.approved_by,
          approved_date: exp.approved_date,
          created_at: exp.created_at,
          updated_at: exp.updated_at,
        };
      });
    } catch (error: any) {
      console.error('❌ ExpensesService.getAllExpenses error:', error.message);
      return [];
    }
  }

  /**
   * Get total expenses for a staff member (only approved ones!)
   */
  async getTotalExpenses(staff_id: string): Promise<number> {
    try {
      const expenses = await this.getExpensesByStaff(staff_id);
      return expenses
        .filter(exp => exp.status === 'approved')
        .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    } catch (error: any) {
      console.error('❌ ExpensesService.getTotalExpenses error:', error.message);
      return 0;
    }
  }
}

export default new ExpensesService();

