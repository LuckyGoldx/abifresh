import { supabaseAdmin } from '../config/supabase';

interface CreateExpenseParams {
  staff_id: string;
  expense_type: string;  // maps to expense_category in DB
  amount: number;        // maps to expense_amount in DB
  description?: string;
  expense_date?: string;
}

interface Expense {
  id: string;
  staff_id: string;
  expense_category: string;
  expense_amount: number;
  description: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
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

      const { data, error } = await supabaseAdmin
        .from('staff_expenses')
        .insert({
          staff_id,
          expense_category: expense_type,  // DB column is expense_category
          expense_amount: parsedAmount,  // DB column is expense_amount
          description: description || null,
          expense_date: expense_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error.message);
        throw error;
      }

      console.log('✅ Expense inserted and returned from Supabase:');
      console.log('  Data:', data);
      console.log('  expense_amount:', data.expense_amount, `(type: ${typeof data.expense_amount})`);
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

      // Map DB column names back to frontend-friendly names
      return (data || []).map((exp: any) => ({
        id: exp.id,
        staff_id: exp.staff_id,
        expense_type: exp.expense_category,  // Map back for frontend
        amount: exp.expense_amount,          // Map back for frontend
        description: exp.description,
        expense_date: exp.expense_date,
        status: exp.status,
        created_at: exp.created_at,
        updated_at: exp.updated_at,
      }));
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

      // Map DB column names back to frontend-friendly names
      return (data || []).map((exp: any) => ({
        id: exp.id,
        staff_id: exp.staff_id,
        expense_type: exp.expense_category,
        amount: exp.expense_amount,
        description: exp.description,
        expense_date: exp.expense_date,
        status: exp.status,
        created_at: exp.created_at,
        updated_at: exp.updated_at,
      }));
    } catch (error: any) {
      console.error('❌ ExpensesService.getAllExpenses error:', error.message);
      return [];
    }
  }

  /**
   * Get total expenses for a staff member
   */
  async getTotalExpenses(staff_id: string): Promise<number> {
    try {
      const expenses = await this.getExpensesByStaff(staff_id);
      return expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    } catch (error: any) {
      console.error('❌ ExpensesService.getTotalExpenses error:', error.message);
      return 0;
    }
  }
}

export default new ExpensesService();
