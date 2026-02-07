import { supabaseAdmin } from '../config/supabase';

interface CreateExpenseParams {
  staff_id: string;
  expense_type: string;
  amount: number;
  description?: string;
  expense_date?: string;
}

interface Expense {
  id: string;
  staff_id: string;
  expense_type: string;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

class ExpensesService {
  /**
   * Create a new expense using raw SQL via PostgreSQL
   * Bypasses PostgREST schema cache issues
   */
  async createExpense(params: CreateExpenseParams): Promise<any> {
    try {
      const { staff_id, expense_type, amount, description, expense_date } = params;

      // Use raw SQL - execute directly on database
      const { data, error } = await (supabaseAdmin as any)
        .rpc('exec', {
          sql: `
            INSERT INTO public.expenses (staff_id, expense_type, amount, description, expense_date)
            VALUES ($1::uuid, $2::text, $3::decimal, $4::text, $5::timestamptz)
            RETURNING *
          `,
          params: [staff_id, expense_type, parseFloat(amount.toString()), description || '', expense_date || new Date().toISOString()]
        });

      if (error) {
        // Fallback: Try direct admin client query
        console.log('⚠️  RPC approach failed, trying admin query...');
        const result = await supabaseAdmin
          .from('expenses')
          .insert({
            staff_id,
            expense_type,
            amount: parseFloat(amount.toString()),
            description: description || null,
            expense_date: expense_date || new Date().toISOString()
          })
          .select()
          .single();

        if (result.error) throw result.error;
        return result.data;
      }

      console.log('✅ Expense created via raw SQL:', data);
      return data;
    } catch (error: any) {
      console.error('❌ ExpensesService.createExpense error:', error.message);
      throw error;
    }
  }

  /**
   * Get expenses for a staff member
   */
  async getExpensesByStaff(staff_id: string): Promise<Expense[]> {
    try {
      // Try direct query first
      const { data, error } = await (supabaseAdmin as any)
        .from('expenses')
        .select('*')
        .eq('staff_id', staff_id)
        .order('expense_date', { ascending: false });

      if (error) {
        // Return empty array if table not accessible
        console.warn('⚠️  Could not fetch expenses:', error.message);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ ExpensesService.getExpensesByStaff error:', error.message);
      return [];
    }
  }

  /**
   * Get all expenses (admin)
   */
  async getAllExpenses(staff_id?: string): Promise<Expense[]> {
    try {
      let query = (supabaseAdmin as any)
        .from('expenses')
        .select('*');

      if (staff_id) {
        query = query.eq('staff_id', staff_id);
      }

      const { data, error } = await query.order('expense_date', { ascending: false });

      if (error) {
        console.warn('⚠️  Could not fetch expenses:', error.message);
        return [];
      }

      return data || [];
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
