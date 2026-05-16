import { supabaseAdmin } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Credit Management Service
 * Handles all credit-related operations including creditor management,
 * credit sales, payments, and credit store management
 */
export class CreditService {
  /**
   * Generate unique creditor code
   * Format: CRED-XXXX where XXXX is a random 4-digit number
   */
  async generateUniqueCreditorCode(): Promise<string> {
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      code = `CRED-${randomNum}`;

      const { data: existing } = await supabaseAdmin
        .from('creditors')
        .select('id')
        .eq('unique_code', code)
        .single();

      isUnique = !existing;
    }

    return code!;
  }

  /**
   * Add a new creditor
   */
  async addCreditor(
    fullName: string,
    phoneNumber: string,
    email: string,
    address: string,
    addedBy: string
  ): Promise<any> {
    const uniqueCode = await this.generateUniqueCreditorCode();

    const { data, error } = await supabaseAdmin
      .from('creditors')
      .insert([
        {
          unique_code: uniqueCode,
          full_name: fullName,
          phone_number: phoneNumber,
          email,
          address,
          added_by: addedBy,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await this.logActivity(addedBy, null, null, null, 'CREDITOR_ADDED', {
      creditor_id: data.id,
      creditor_name: fullName,
    });

    return data;
  }

  /**
   * Get all active creditors
   */
  async getAllCreditors(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('creditors')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get creditor details with payment history
   */
  async getCreditorDetails(creditorId: string): Promise<any> {
    const { data: creditor, error: creditorError } = await supabaseAdmin
      .from('creditors')
      .select('*')
      .eq('id', creditorId)
      .single();

    if (creditorError) throw creditorError;

    // Get credit sales
    const { data: creditSales } = await supabaseAdmin
      .from('credit_sales')
      .select('*, credit_sale_items(*)')
      .eq('creditor_id', creditorId);

    // Get payments
    const { data: payments } = await supabaseAdmin
      .from('credit_payments')
      .select('*, credit_payment_items(*)')
      .eq('creditor_id', creditorId)
      .order('created_at', { ascending: false });

    // Calculate totals
    const totalAmount = creditSales?.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0) || 0;
    const totalPaid = payments
      ?.filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
    const outstandingAmount = totalAmount - totalPaid;

    // Get total quantity
    const totalQuantity = creditSales?.reduce((sum, sale) => sum + parseFloat(sale.total_quantity), 0) || 0;

    return {
      ...creditor,
      creditSales,
      payments,
      totalAmount,
      totalPaid,
      outstandingAmount,
      totalQuantity,
    };
  }

  /**
   * Create a credit sale
   */
  async createCreditSale(
    creditorId: string,
    staffId: string,
    items: Array<{
      itemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
    }>,
    notes?: string
  ): Promise<any> {
    // Generate receipt number
    const receiptNumber = `CREDIT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Calculate totals
    let totalAmount = 0;
    let totalQuantity = 0;

    items.forEach((item) => {
      const itemTotal = parseFloat(item.unitPrice.toString()) * parseFloat(item.quantity.toString());
      totalAmount += itemTotal;
      totalQuantity += parseFloat(item.quantity.toString());
    });

    // Create credit sale
    const { data: creditSale, error: saleError } = await supabaseAdmin
      .from('credit_sales')
      .insert([
        {
          creditor_id: creditorId,
          staff_id: staffId,
          receipt_number: receiptNumber,
          total_amount: totalAmount,
          total_quantity: totalQuantity,
          status: 'active',
          notes,
        },
      ])
      .select()
      .single();

    if (saleError) throw saleError;

    // Add credit sale items
    const creditSaleItems: any[] = [];
    for (const item of items) {
      const { data: itemData } = await supabaseAdmin
        .from('items')
        .select('id')
        .eq('id', item.itemId)
        .single();

      if (!itemData) throw new Error(`Item not found: ${item.itemId}`);

      const itemTotal = parseFloat(item.unitPrice.toString()) * parseFloat(item.quantity.toString());

      const { data: creditSaleItem, error: itemError } = await supabaseAdmin
        .from('credit_sale_items')
        .insert([
          {
            credit_sale_id: creditSale.id,
            item_id: item.itemId,
            item_name: item.itemName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: itemTotal,
            quantity_paid: 0,
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      creditSaleItems.push(creditSaleItem);

      // Add to credit store
      const { error: storeError } = await supabaseAdmin
        .from('credit_store')
        .insert([
          {
            credit_sale_id: creditSale.id,
            credit_sale_item_id: creditSaleItem.id,
            creditor_id: creditorId,
            item_id: item.itemId,
            item_name: item.itemName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            status: 'active',
          },
        ]);

      if (storeError) throw storeError;

      // Deduct from active store inventory
      await this.deductInventory(item.itemId, parseFloat(item.quantity.toString()));
    }

    // Log activity
    await this.logActivity(staffId, creditorId, creditSale.id, null, 'CREDIT_SALE_CREATED', {
      receipt_number: receiptNumber,
      total_amount: totalAmount,
      total_quantity: totalQuantity,
      items_count: items.length,
    });

    return {
      ...creditSale,
      items: creditSaleItems,
    };
  }

  /**
   * Deduct inventory from active store
   */
  private async deductInventory(itemId: string, quantity: number): Promise<void> {
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('items')
      .select('id, active_store_quantity, quantity')
      .eq('id', itemId)
      .single();

    if (fetchError) throw new Error(`Item not found: ${fetchError.message}`);
    if (!item) throw new Error('Item not found');

    if (item.active_store_quantity < quantity) {
      throw new Error(
        `Insufficient quantity in active store. Available: ${item.active_store_quantity}, Requested: ${quantity}`
      );
    }

    const newActiveStoreQuantity = Math.max(0, item.active_store_quantity - quantity);
    const newTotalQuantity = Math.max(0, item.quantity - quantity);

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
   * Get credit overview stats
   */
  async getCreditOverviewStats(): Promise<any> {
    // Total credits amount
    const { data: creditSales } = await supabaseAdmin
      .from('credit_sales')
      .select('total_amount, total_quantity')
      .neq('status', 'cancelled');

    const totalCreditsAmount = creditSales?.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0) || 0;

    // Total quantity
    const totalQuantity = creditSales?.reduce((sum, sale) => sum + parseFloat(sale.total_quantity || 0), 0) || 0;

    // Total creditors (active only)
    const { data: creditors } = await supabaseAdmin
      .from('creditors')
      .select('id')
      .eq('is_active', true);

    const totalCreditors = creditors?.length || 0;

    // Total amount paid
    const { data: approvedPayments } = await supabaseAdmin
      .from('credit_payments')
      .select('amount')
      .eq('status', 'approved');

    const totalAmountPaid = approvedPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    return {
      totalCreditsAmount,
      totalQuantity,
      totalCreditors,
      totalAmountPaid,
      outstandingAmount: totalCreditsAmount - totalAmountPaid,
    };
  }

  /**
   * Get credit activities
   */
  async getCreditActivities(limit: number = 50): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('credit_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get credit store items
   */
  async getCreditStoreItems(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('credit_store')
      .select('*, creditors(full_name, unique_code)')
      .neq('status', 'paid')
      .neq('status', 'returned')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Record credit payment
   */
  async recordCreditPayment(
    creditorId: string,
    creditSaleId: string,
    staffId: string,
    amount: number,
    paymentMethod: 'cash' | 'pos' | 'online_transfer',
    selectedItems: Array<{
      creditSaleItemId: string;
      itemId: string;
      quantity: number;
      amount: number;
    }>,
    referenceNumber?: string,
    receiptUrl?: string,
    notes?: string
  ): Promise<any> {
    // Generate reference number for cash payments
    const finalReferenceNumber = paymentMethod === 'cash' 
      ? `CASH-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`
      : referenceNumber;

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('credit_payments')
      .insert([
        {
          creditor_id: creditorId,
          credit_sale_id: creditSaleId,
          staff_id: staffId,
          amount,
          payment_method: paymentMethod,
          reference_number: finalReferenceNumber,
          receipt_url: receiptUrl,
          notes,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Add payment items
    for (const item of selectedItems) {
      const { error: itemError } = await supabaseAdmin
        .from('credit_payment_items')
        .insert([
          {
            credit_payment_id: payment.id,
            credit_sale_item_id: item.creditSaleItemId,
            item_id: item.itemId,
            quantity: item.quantity,
            amount: item.amount,
          },
        ]);

      if (itemError) throw itemError;
    }

    // Log activity
    await this.logActivity(staffId, creditorId, creditSaleId, payment.id, 'CREDIT_PAYMENT_RECORDED', {
      amount,
      payment_method: paymentMethod,
      items_count: selectedItems.length,
    });

    return payment;
  }

  /**
   * Approve credit payment by admin
   */
  async approveCreditPayment(paymentId: string, approvedBy: string): Promise<any> {
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('credit_payments')
      .select('*, credit_payment_items(*)')
      .eq('id', paymentId)
      .single();

    if (fetchError) throw fetchError;

    // Update payment status
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('credit_payments')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_date: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update credit sale items - mark quantity as paid
    for (const item of payment.credit_payment_items) {
      const { data: creditSaleItem } = await supabaseAdmin
        .from('credit_sale_items')
        .select('quantity_paid')
        .eq('id', item.credit_sale_item_id)
        .single();

      const newQuantityPaid = (creditSaleItem?.quantity_paid || 0) + item.quantity;

      await supabaseAdmin
        .from('credit_sale_items')
        .update({ quantity_paid: newQuantityPaid })
        .eq('id', item.credit_sale_item_id);
    }

    // Update credit store - mark items as paid
    for (const item of payment.credit_payment_items) {
      const { data: storeItems } = await supabaseAdmin
        .from('credit_store')
        .select('id, quantity')
        .eq('credit_sale_item_id', item.credit_sale_item_id)
        .eq('status', 'active');

      if (storeItems && storeItems.length > 0) {
        const storeItem = storeItems[0];
        const remainingQuantity = storeItem.quantity - item.quantity;

        if (remainingQuantity <= 0) {
          await supabaseAdmin
            .from('credit_store')
            .update({ status: 'paid' })
            .eq('id', storeItem.id);
        } else {
          await supabaseAdmin
            .from('credit_store')
            .update({ quantity: remainingQuantity })
            .eq('id', storeItem.id);
        }
      }
    }

    // Check if all items of credit sale are paid
    const { data: allItems } = await supabaseAdmin
      .from('credit_sale_items')
      .select('quantity, quantity_paid')
      .eq('credit_sale_id', payment.credit_sale_id);

    const allPaid = allItems?.every((item) => item.quantity === item.quantity_paid);

    if (allPaid) {
      await supabaseAdmin
        .from('credit_sales')
        .update({ status: 'paid' })
        .eq('id', payment.credit_sale_id);
    }

    // Log activity
    await this.logActivity(approvedBy, payment.creditor_id, payment.credit_sale_id, paymentId, 'CREDIT_PAYMENT_APPROVED', {
      amount: payment.amount,
    });

    return updatedPayment;
  }

  /**
   * Reject credit payment by admin
   */
  async rejectCreditPayment(paymentId: string, rejectedBy: string, reason: string): Promise<any> {
    const { data: updatedPayment, error } = await supabaseAdmin
      .from('credit_payments')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: rejectedBy,
        approved_date: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await this.logActivity(rejectedBy, null, null, paymentId, 'CREDIT_PAYMENT_REJECTED', {
      reason,
    });

    return updatedPayment;
  }

  /**
   * Cancel creditor credit
   */
  async cancelCreditorCredit(creditorId: string, creditSaleId: string, cancelledBy: string): Promise<any> {
    // Get credit sale items
    const { data: items } = await supabaseAdmin
      .from('credit_sale_items')
      .select('*')
      .eq('credit_sale_id', creditSaleId);

    // Update credit store items to available_for_return
    for (const item of items || []) {
      await supabaseAdmin
        .from('credit_store')
        .update({ status: 'available_for_return' })
        .eq('credit_sale_item_id', item.id);
    }

    // Update credit sale status
    const { data: updatedSale, error } = await supabaseAdmin
      .from('credit_sales')
      .update({ status: 'cancelled' })
      .eq('id', creditSaleId)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await this.logActivity(cancelledBy, creditorId, creditSaleId, null, 'CREDIT_CANCELLED', {});

    return updatedSale;
  }

  /**
   * Return items from credit store to active store
   */
  async returnItemsToActiveStore(
    items: Array<{
      creditStoreId: string;
      itemId: string;
      quantity: number;
    }>,
    returnedBy: string
  ): Promise<any> {
    for (const item of items) {
      // Update credit store item status
      await supabaseAdmin
        .from('credit_store')
        .update({ status: 'returned' })
        .eq('id', item.creditStoreId);

      // Add back to active store inventory
      const { data: inventoryItem, error: fetchError } = await supabaseAdmin
        .from('items')
        .select('id, active_store_quantity, quantity')
        .eq('id', item.itemId)
        .single();

      if (fetchError) throw fetchError;

      const newActiveQuantity = (inventoryItem?.active_store_quantity || 0) + item.quantity;
      const newTotalQuantity = (inventoryItem?.quantity || 0) + item.quantity;

      await supabaseAdmin
        .from('items')
        .update({
          active_store_quantity: newActiveQuantity,
          quantity: newTotalQuantity,
        })
        .eq('id', item.itemId);
    }

    // Log activity
    await this.logActivity(returnedBy, null, null, null, 'ITEMS_RETURNED', {
      items_count: items.length,
    });

    return { success: true };
  }

  /**
   * Get remit credit data (approved payments ready to submit)
   */
  async getRemitCreditData(staffId?: string): Promise<any[]> {
    let query = supabaseAdmin
      .from('credit_payments')
      .select('*, credit_payment_items(*, credit_sale_items(item_name)), creditors(full_name, unique_code), users(full_name)')
      .eq('status', 'approved');

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get pending remit credit submissions
   */
  async getPendingRemitCredit(staffId?: string): Promise<any[]> {
    let query = supabaseAdmin
      .from('credit_payments')
      .select('*, credit_payment_items(*), creditors(full_name)')
      .eq('status', 'pending');

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Log credit activity
   */
  private async logActivity(
    staffId: string,
    creditorId: string | null,
    creditSaleId: string | null,
    creditPaymentId: string | null,
    action: string,
    details: any
  ): Promise<void> {
    await supabaseAdmin
      .from('credit_activities')
      .insert([
        {
          creditor_id: creditorId,
          credit_sale_id: creditSaleId,
          credit_payment_id: creditPaymentId,
          staff_id: staffId,
          action,
          details,
        },
      ]);
  }
}

export const creditService = new CreditService();
