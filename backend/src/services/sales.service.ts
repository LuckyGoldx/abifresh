import { supabaseAdmin } from '../config/supabase';
import { User, Item, Sale } from '../types';

export class SalesService {
  /**
   * Get all available items from active store
   */
  async getAvailableItems(): Promise<Item[]> {
    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('*')
      .gt('active_store_quantity', 0);

    if (error) throw error;

    return items || [];
  }

  /**
   * Get all unavailable items
   */
  async getUnavailableItems(): Promise<Item[]> {
    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('active_store_quantity', 0);

    if (error) throw error;

    return items || [];
  }

  /**
   * Record a sale transaction
   */
  async recordSale(
    salesPersonId: string,
    itemId: string,
    quantity: number,
    paymentMethod: 'cash' | 'pos' | 'transfer',
    buyerType: 'customer' | 'staff',
    buyerId?: string,
    storeLocation: string = 'Jalingo'
  ): Promise<Sale> {
    // Get item details
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError) throw new Error('Item not found');

    let unitPrice = item.base_price;

    // Add logistics fare if not Jalingo
    if (storeLocation !== 'Jalingo') {
      unitPrice += 500; // Example logistics fare
    }

    const totalAmount = unitPrice * quantity;

    // Create sale record
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert([
        {
          sales_person_id: salesPersonId,
          item_id: itemId,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          buyer_type: buyerType,
          buyer_id: buyerId,
          store_location: storeLocation,
        },
      ])
      .select()
      .single();

    if (saleError) throw saleError;

    // Deduct from active store inventory
    await this.deductInventory(itemId, quantity);

    // Update daily sales summary
    await this.updateDailySalesSummary(salesPersonId, quantity, totalAmount);

    // Log activity
    await this.logActivity(salesPersonId, 'SALE_CREATED', 'sale', sale.id, {
      item_id: itemId,
      quantity,
      amount: totalAmount,
    });

    return sale;
  }

  /**
   * Deduct inventory from active store
   * Now uses the new inventory system that tracks active_store_quantity and main_store_quantity
   */
  private async deductInventory(itemId: string, quantity: number): Promise<void> {
    // Get current item with store quantities
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('items')
      .select('id, active_store_quantity, quantity')
      .eq('id', itemId)
      .single();

    if (fetchError) throw new Error(`Item not found: ${fetchError.message}`);
    if (!item) throw new Error('Item not found');

    // Validate sufficient quantity in active store
    if (item.active_store_quantity < quantity) {
      throw new Error(
        `Insufficient quantity in active store. Available: ${item.active_store_quantity}, Requested: ${quantity}`
      );
    }

    // Calculate new quantities
    const newActiveStoreQuantity = Math.max(0, item.active_store_quantity - quantity);
    const newTotalQuantity = Math.max(0, item.quantity - quantity);

    // Update both active_store_quantity and total quantity
    const { error: updateError } = await supabaseAdmin
      .from('items')
      .update({
        active_store_quantity: newActiveStoreQuantity,
        quantity: newTotalQuantity,
      })
      .eq('id', itemId);

    if (updateError) throw new Error(`Failed to deduct inventory: ${updateError.message}`);
  }

  /**
   * Update daily sales summary
   */
  private async updateDailySalesSummary(
    salesPersonId: string,
    quantity: number,
    amount: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Upsert: correct column names are salesperson_id, sale_date, total_revenue
    await supabaseAdmin
      .from('daily_sales_summary')
      .upsert(
        {
          salesperson_id: salesPersonId,
          sale_date: today,
          total_items_sold: quantity,
          total_revenue: amount,
          number_of_transactions: 1,
        },
        { onConflict: 'salesperson_id,sale_date', ignoreDuplicates: false }
      );
  }

  /**
   * Post items to staff for sales
   */
  async postItemsToStaff(
    salesPersonId: string,
    staffId: string,
    itemId: string,
    quantity: number
  ): Promise<any> {
    // Get item price
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('base_price')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    // Create posted item record
    const { data: postedItem, error: postError } = await supabaseAdmin
      .from('posted_items')
      .insert([
        {
          sales_person_id: salesPersonId,
          receiver_staff_id: staffId,
          item_id: itemId,
          quantity,
          unit_price: item.base_price,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (postError) throw postError;

    // Create notification for staff
    await this.createNotification(
      staffId,
      'posted_item',
      'New Items Posted',
      `You have received new items for sale`,
      postedItem.id
    );

    // Log activity
    await this.logActivity(salesPersonId, 'ITEMS_POSTED', 'posted_item', postedItem.id, {
      staff_id: staffId,
      item_id: itemId,
      quantity,
    });

    return postedItem;
  }

  /**
   * Get sales dashboard data
   */
  async getSalesDashboard(salesPersonId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];

    // Total items and amount for the day
    const { data: dailySalesData } = await supabaseAdmin
      .from('daily_sales_summary')
      .select('*')
      .eq('sales_person_id', salesPersonId)
      .eq('sales_date', today)
      .single();

    // All time totals
    const { data: allSales } = await supabaseAdmin
      .from('sales')
      .select('quantity, total_amount')
      .eq('sales_person_id', salesPersonId);

    const allTimeTotals = allSales?.reduce(
      (acc, sale) => ({
        total_items: acc.total_items + sale.quantity,
        total_amount: acc.total_amount + sale.total_amount,
      }),
      { total_items: 0, total_amount: 0 }
    ) || { total_items: 0, total_amount: 0 };

    // Available items count
    const availableItems = await this.getAvailableItems();

    return {
      today: {
        total_items_sold: dailySalesData?.total_items_sold || 0,
        total_amount_sold: dailySalesData?.total_amount_sold || 0,
      },
      all_time: allTimeTotals,
      available_items_count: availableItems.length,
    };
  }

  /**
   * Create notification
   */
  private async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    relatedId?: string
  ): Promise<void> {
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: userId,
        type,
        title,
        message,
        is_read: false,
      },
    ]);
  }

  /**
   * Log activity
   */
  private async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: any
  ): Promise<void> {
    await supabaseAdmin.from('activity_logs').insert([
      {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      },
    ]);
  }
}

export const salesService = new SalesService();
