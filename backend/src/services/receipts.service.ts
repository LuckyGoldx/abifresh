import { supabaseAdmin } from '../config/supabase';

interface ReceiptItemData {
  item_id: string;
  quantity: number;
  unit_price: number;
  name: string;
  total_price: number;
}

interface CreateReceiptData {
  receipt_number: string;
  staff_id: string;
  items: ReceiptItemData[];
  total_amount: number;
  payment_method: 'cash' | 'pos' | 'transfer';
  sold_outside_jalingo: boolean;
}

export class ReceiptsService {
  /**
   * Create a new receipt and store all items
   */
  async createReceipt(data: CreateReceiptData) {
    try {
      // Create the main receipt record
      const { data: receipt, error: receiptError } = await supabaseAdmin
        .from('receipts')
        .insert({
          receipt_number: data.receipt_number,
          staff_id: data.staff_id,
          total_amount: data.total_amount,
          payment_method: data.payment_method,
          sold_outside_jalingo: data.sold_outside_jalingo,
          items_count: data.items.length,
        })
        .select()
        .single();

      if (receiptError || !receipt) {
        throw new Error(`Failed to create receipt: ${receiptError?.message}`);
      }

      // Create receipt items
      const itemsToInsert = data.items.map(item => ({
        receipt_id: receipt.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('receipt_items')
        .insert(itemsToInsert);

      if (itemsError) {
        throw new Error(`Failed to store receipt items: ${itemsError.message}`);
      }

      return receipt;
    } catch (error: any) {
      throw new Error(`Receipt creation error: ${error.message}`);
    }
  }

  /**
   * Get all receipts for a staff member
   */
  async getStaffReceipts(staffId: string, limit: number = 50, offset: number = 0) {
    try {
      const { data, error } = await supabaseAdmin
        .from('receipts')
        .select(`
          id, receipt_number, total_amount, payment_method, sold_outside_jalingo,
          items_count, created_at,
          receipt_items(id, item_id, quantity, unit_price, total_price)
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch receipts: ${error.message}`);
    }
  }

  /**
   * Get all receipts (for admin)
   */
  async getAllReceipts(limit: number = 1000, offset: number = 0) {
    try {
      const { data, error } = await supabaseAdmin
        .from('receipts')
        .select(`
          id, receipt_number, total_amount, payment_method, sold_outside_jalingo,
          items_count, created_at,
          staff_id,
          receipt_items(id, item_id, quantity, unit_price, total_price, item_id(name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('📊 getAllReceipts returned:', data?.length, 'receipts');
      console.log('📊 Sample receipt:', data?.[0]);
      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch receipts: ${error.message}`);
    }
  }

  /**
   * Get a single receipt with all its items
   */
  async getReceiptById(receiptId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('receipts')
        .select(`
          id, receipt_number, total_amount, payment_method, sold_outside_jalingo,
          items_count, created_at, updated_at,
          staff_id,
          receipt_items(id, item_id, quantity, unit_price, total_price, item_id(name))
        `)
        .eq('id', receiptId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch receipt: ${error.message}`);
    }
  }

  /**
   * Search receipts by receipt number or date range
   */
  async searchReceipts(
    searchQuery: string,
    staffId?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      let query = supabaseAdmin
        .from('receipts')
        .select(`
          id, receipt_number, total_amount, payment_method, sold_outside_jalingo,
          items_count, created_at,
          staff_id
        `);

      // Filter by staff if provided
      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      // Filter by date range if provided
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Search by receipt number (ilike for case-insensitive)
      if (searchQuery) {
        query = query.ilike('receipt_number', `%${searchQuery}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to search receipts: ${error.message}`);
    }
  }

  /**
   * Get receipt statistics for a staff member
   */
  async getStaffReceiptStats(staffId: string, startDate?: string, endDate?: string) {
    try {
      let query = supabaseAdmin
        .from('receipts')
        .select('total_amount, payment_method, items_count', { count: 'exact' })
        .eq('staff_id', staffId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Calculate statistics
      const totalAmount = (data || []).reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const avgAmount = (data || []).length > 0 ? totalAmount / (data || []).length : 0;
      const paymentMethodBreakdown = (data || []).reduce((acc: any, r) => {
        acc[r.payment_method] = (acc[r.payment_method] || 0) + 1;
        return acc;
      }, {});

      return {
        total_receipts: count || 0,
        total_amount: totalAmount,
        average_amount: avgAmount,
        payment_methods: paymentMethodBreakdown,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch receipt stats: ${error.message}`);
    }
  }

  /**
   * Delete a receipt (soft delete or hard delete)
   */
  async deleteReceipt(receiptId: string) {
    try {
      // Delete associated items first (cascade should handle this, but explicit is safer)
      const { error: itemsError } = await supabaseAdmin
        .from('receipt_items')
        .delete()
        .eq('receipt_id', receiptId);

      if (itemsError) throw itemsError;

      // Delete the receipt
      const { error: receiptError } = await supabaseAdmin
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (receiptError) throw receiptError;

      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to delete receipt: ${error.message}`);
    }
  }
}

export const receiptsService = new ReceiptsService();
