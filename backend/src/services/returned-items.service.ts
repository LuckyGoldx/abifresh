import { supabaseAdmin } from '../config/supabase';

export class ReturnedItemsService {
  /**
   * Helper: Resolve staff ID to actual UUID if needed
   * If ID looks like "sales-001", look up the actual UUID
   */
  private async resolveStaffIdToUUID(staffId: string): Promise<string> {
    // If it's already a UUID format, return as is
    if (staffId.includes('-') && staffId.length > 30) {
      return staffId;
    }

    // It's a string like "sales-001", look it up
    const { data: staffUser, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`username.eq.${staffId},id.eq.${staffId}`)
      .single();

    if (error || !staffUser) {
      throw new Error(`Staff member not found: ${staffId}`);
    }

    return staffUser.id;
  }

  /**
   * Create a return request from staff to sales staff
   * Items are held in requester's staff_store until accepted/rejected
   */
  async createReturnRequest(
    requesterStaffId: string,
    receiverSalesStaffId: string,
    items: Array<{
      item_id: string;
      quantity: number;
      unit_price: number;
    }>
  ): Promise<any[]> {
    // Resolve IDs to UUIDs if needed
    const actualRequesterStaffId = await this.resolveStaffIdToUUID(requesterStaffId);
    const actualReceiverSalesStaffId = await this.resolveStaffIdToUUID(receiverSalesStaffId);
    
    const returnedItemsData = [];

    // Get requester staff name and validate they exist
    const { data: requesterData } = await supabaseAdmin
      .from('users')
      .select('full_name, role')
      .eq('id', actualRequesterStaffId)
      .single();
    
    if (!requesterData) throw new Error('Requester not found');
    const requesterName = requesterData.full_name || 'Staff';

    // Get receiver sales staff name and validate they are sales staff
    const { data: receiverData } = await supabaseAdmin
      .from('users')
      .select('full_name, role')
      .eq('id', actualReceiverSalesStaffId)
      .single();
    
    if (!receiverData) throw new Error('Sales staff not found');
    if (!['sales', 'sales_staff'].includes(receiverData.role)) {
      throw new Error('Receiver must be a sales staff member');
    }
    const receiverName = receiverData.full_name || 'Sales Staff';

    // Get all pending/accepted returns for this staff to calculate already-locked quantities
    const { data: existingReturns } = await supabaseAdmin
      .from('returned_items')
      .select('item_id, quantity')
      .eq('requester_staff_id', actualRequesterStaffId)
      .in('status', ['pending', 'accepted']);

    const lockedQuantities = new Map<string, number>();
    (existingReturns || []).forEach((ret: any) => {
      const current = lockedQuantities.get(ret.item_id) || 0;
      lockedQuantities.set(ret.item_id, current + ret.quantity);
    });

    for (const item of items) {
      // Verify item exists in requester's staff_store
      const { data: staffStoreItem, error: storeError } = await supabaseAdmin
        .from('staff_store')
        .select('*')
        .eq('staff_id', actualRequesterStaffId)
        .eq('item_id', item.item_id)
        .single();

      if (storeError) throw new Error(`Item not found in your store: ${item.item_id}`);
      if (!staffStoreItem) throw new Error(`Item not found in your store: ${item.item_id}`);

      // Use quantity_available (quantity - quantity_sold) minus already-locked returns
      const lockedQty = lockedQuantities.get(item.item_id) || 0;
      const actualAvailable = Math.max(0, (staffStoreItem.quantity_available || 0) - lockedQty);

      if (actualAvailable < item.quantity) {
        throw new Error(
          `Insufficient quantity. Available: ${actualAvailable}, Requested: ${item.quantity}`
        );
      }

      // Update locked quantities map for subsequent items in same batch
      lockedQuantities.set(item.item_id, lockedQty + item.quantity);

      // Create returned item record
      const { data: returnedItem, error: returnError } = await supabaseAdmin
        .from('returned_items')
        .insert([
          {
            item_id: item.item_id,
            requester_staff_id: actualRequesterStaffId,
            receiver_staff_id: actualReceiverSalesStaffId,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (returnError) throw returnError;

      returnedItemsData.push(returnedItem);
    }

    // Create notification for sales staff
    await this.createNotification(
      actualReceiverSalesStaffId,
      'returned_items',
      `Items Returned by ${requesterName}`,
      `${items.length} item(s) returned by ${requesterName} - awaiting your review`
    );

    // Create notification for requester
    await this.createNotification(
      actualRequesterStaffId,
      'return_request_sent',
      `Return Request Sent to ${receiverName}`,
      `${items.length} item(s) return request sent to ${receiverName}`
    );

    // Log activity
    await this.logActivity(actualRequesterStaffId, 'RETURN_REQUEST_CREATED', 'returned_items', actualReceiverSalesStaffId, {
      receiver_staff_id: actualReceiverSalesStaffId,
      receiver_name: receiverName,
      items_count: items.length,
      total_quantity: items.reduce((sum, i) => sum + i.quantity, 0),
    });

    return returnedItemsData;
  }

  /**
   * Accept returned items and move them to active store
   */
  async acceptReturnedItems(salesStaffId: string, returnedItemIds: string[]): Promise<any[]> {
    const actualSalesStaffId = await this.resolveStaffIdToUUID(salesStaffId);
    const results = [];

    for (const returnedItemId of returnedItemIds) {
      // Get returned item details
      const { data: returnedItem, error: fetchError } = await supabaseAdmin
        .from('returned_items')
        .select('*')
        .eq('id', returnedItemId)
        .single();

      if (fetchError) throw new Error(`Returned item not found: ${returnedItemId}`);
      if (!returnedItem) throw new Error(`Returned item not found: ${returnedItemId}`);

      if (returnedItem.receiver_staff_id !== actualSalesStaffId) {
        throw new Error('Unauthorized: This return was not sent to you');
      }

      // Get item details
      const { data: itemData, error: itemError } = await supabaseAdmin
        .from('items')
        .select('*')
        .eq('id', returnedItem.item_id)
        .single();

      if (itemError) throw new Error(`Item not found: ${returnedItem.item_id}`);
      if (!itemData) throw new Error(`Item not found: ${returnedItem.item_id}`);

      // Add back to active store
      const newActiveStoreQty = itemData.active_store_quantity + returnedItem.quantity;
      const { error: updateError } = await supabaseAdmin
        .from('items')
        .update({ active_store_quantity: newActiveStoreQty })
        .eq('id', returnedItem.item_id);

      if (updateError) throw updateError;

      // Deduct from staff_store.quantity so quantity_available (generated = quantity - quantity_sold) decreases
      const { data: staffStoreItem } = await supabaseAdmin
        .from('staff_store')
        .select('*')
        .eq('staff_id', returnedItem.requester_staff_id)
        .eq('item_id', returnedItem.item_id)
        .single();

      if (staffStoreItem) {
        const newStaffQty = Math.max(0, staffStoreItem.quantity - returnedItem.quantity);
        const { error: staffUpdateError } = await supabaseAdmin
          .from('staff_store')
          .update({ quantity: newStaffQty, last_updated: new Date().toISOString() })
          .eq('id', staffStoreItem.id);

        if (staffUpdateError) throw staffUpdateError;
      }

      // Update returned item status
      const { data: updated, error: statusError } = await supabaseAdmin
        .from('returned_items')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', returnedItemId)
        .select()
        .single();

      if (statusError) throw statusError;

      // Get requester name
      const { data: requesterData } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', returnedItem.requester_staff_id)
        .single();
      
      const requesterName = requesterData?.full_name || 'Staff';

      // Create notifications
      await this.createNotification(
        returnedItem.requester_staff_id,
        'return_accepted',
        `Return Request Accepted`,
        `Your return request for ${returnedItem.quantity} item(s) has been accepted`
      );

      // Log activity
      await this.logActivity(actualSalesStaffId, 'RETURN_ACCEPTED', 'returned_items', returnedItem.requester_staff_id, {
        requester_staff_id: returnedItem.requester_staff_id,
        requester_name: requesterName,
        quantity: returnedItem.quantity,
        item_name: itemData.name,
      });

      results.push(updated);
    }

    return results;
  }

  /**
   * Reject returned items and send them back to requester's staff_store
   */
  async rejectReturnedItems(
    salesStaffId: string,
    returnedItemIds: string[],
    rejectReason: string
  ): Promise<any[]> {
    const actualSalesStaffId = await this.resolveStaffIdToUUID(salesStaffId);
    const results = [];

    for (const returnedItemId of returnedItemIds) {
      // Get returned item details
      const { data: returnedItem, error: fetchError } = await supabaseAdmin
        .from('returned_items')
        .select('*')
        .eq('id', returnedItemId)
        .single();

      if (fetchError) throw new Error(`Returned item not found: ${returnedItemId}`);
      if (!returnedItem) throw new Error(`Returned item not found: ${returnedItemId}`);

      if (returnedItem.receiver_staff_id !== actualSalesStaffId) {
        throw new Error('Unauthorized: This return was not sent to you');
      }

      // On reject: do NOT modify staff_store.quantity.
      // The quantity was never physically deducted when the return was created.
      // Virtual locking (getStaffStore) will automatically release the lock
      // when status changes to 'rejected' (only 'pending' and 'accepted' are locked).

      // Update returned item status
      const { data: updated, error: statusError } = await supabaseAdmin
        .from('returned_items')
        .update({ 
          status: 'rejected', 
          reject_reason: rejectReason,
          updated_at: new Date().toISOString() 
        })
        .eq('id', returnedItemId)
        .select()
        .single();

      if (statusError) throw statusError;

      // Get requester name and item name
      const { data: requesterData } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', returnedItem.requester_staff_id)
        .single();
      
      const requesterName = requesterData?.full_name || 'Staff';

      const { data: itemData } = await supabaseAdmin
        .from('items')
        .select('name')
        .eq('id', returnedItem.item_id)
        .single();

      // Create notifications
      await this.createNotification(
        returnedItem.requester_staff_id,
        'return_rejected',
        `Return Request Rejected`,
        `Your return request has been rejected. Reason: ${rejectReason}`
      );

      // Log activity
      await this.logActivity(actualSalesStaffId, 'RETURN_REJECTED', 'returned_items', returnedItem.requester_staff_id, {
        requester_staff_id: returnedItem.requester_staff_id,
        requester_name: requesterName,
        quantity: returnedItem.quantity,
        item_name: itemData?.name,
        reject_reason: rejectReason,
      });

      results.push(updated);
    }

    return results;
  }

  /**
   * Get all returned items for a requester staff (their own return requests)
   */
  async getReturnsByRequester(requesterStaffId: string): Promise<any[]> {
    const actualId = await this.resolveStaffIdToUUID(requesterStaffId);
    const { data, error } = await supabaseAdmin
      .from('returned_items')
      .select(`
        *,
        item:item_id(id, name, unit_price),
        receiver:receiver_staff_id(id, full_name)
      `)
      .eq('requester_staff_id', actualId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      item_id: item.item_id,
      item_name: item.item?.name || 'Unknown',
      quantity: item.quantity,
      unit_price: item.unit_price,
      status: item.status,
      reject_reason: item.reject_reason,
      receiver_name: item.receiver?.full_name || 'Unknown',
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  }

  /**
   * Get all returned items sent to a sales staff (items they need to accept/reject)
   */
  async getReturnsForReceiver(receiverSalesStaffId: string): Promise<any[]> {
    const actualId = await this.resolveStaffIdToUUID(receiverSalesStaffId);
    const { data, error } = await supabaseAdmin
      .from('returned_items')
      .select(`
        *,
        item:item_id(id, name, unit_price),
        requester:requester_staff_id(id, full_name)
      `)
      .eq('receiver_staff_id', actualId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      item_id: item.item_id,
      item_name: item.item?.name || 'Unknown',
      quantity: item.quantity,
      unit_price: item.unit_price,
      status: item.status,
      reject_reason: item.reject_reason,
      requester_name: item.requester?.full_name || 'Unknown',
      requester_id: item.requester_staff_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  }

  /**
   * Get stats for requester staff
   * available_for_return shows only items with remaining quantity after pending/accepted returns
   */
  async getReturnStatsForRequester(requesterStaffId: string): Promise<{
    total_returned: number;
    pending_to_accept: number;
    available_for_return: number;
  }> {
    const actualId = await this.resolveStaffIdToUUID(requesterStaffId);

    // Get all accepted returns
    const { count: acceptedCount } = await supabaseAdmin
      .from('returned_items')
      .select('*', { count: 'exact', head: true })
      .eq('requester_staff_id', actualId)
      .eq('status', 'accepted');

    // Get pending returns (still waiting for receiver to accept/reject)
    const { count: pendingCount } = await supabaseAdmin
      .from('returned_items')
      .select('*', { count: 'exact', head: true })
      .eq('requester_staff_id', actualId)
      .eq('status', 'pending');

    // Get all items in staff_store (need quantity_available for accurate calculation)
    const { data: staffStoreItems } = await supabaseAdmin
      .from('staff_store')
      .select('quantity_available, item_id')
      .eq('staff_id', actualId);

    // Get all pending or accepted returns for this staff
    const { data: returnedItems } = await supabaseAdmin
      .from('returned_items')
      .select('item_id, quantity, status')
      .eq('requester_staff_id', actualId)
      .in('status', ['pending', 'accepted']);

    // Create map of item_id -> total locked quantity (pending + accepted)
    const lockedQuantities = new Map<string, number>();
    (returnedItems || []).forEach((ret: any) => {
      const current = lockedQuantities.get(ret.item_id) || 0;
      lockedQuantities.set(ret.item_id, current + ret.quantity);
    });

    // Calculate available for return (sum of remaining quantities using quantity_available)
    const availableForReturn = (staffStoreItems || []).reduce((sum, item: any) => {
      const lockedQty = lockedQuantities.get(item.item_id) || 0;
      const remainingQty = Math.max(0, (item.quantity_available || 0) - lockedQty);
      return sum + remainingQty;
    }, 0);

    return {
      total_returned: acceptedCount || 0,
      pending_to_accept: pendingCount || 0,
      available_for_return: availableForReturn,
    };
  }

  /**
   * Get available items in requester's staff_store for return
   * Shows items with remaining quantity after subtracting pending/accepted returns
   * Only shows items if remaining quantity > 0
   */
  async getAvailableItemsForReturn(requesterStaffId: string): Promise<any[]> {
    const actualId = await this.resolveStaffIdToUUID(requesterStaffId);

    // Get all items in staff_store with quantity_available > 0 (unsold items only)
    const { data: staffStoreItems, error: storeError } = await supabaseAdmin
      .from('staff_store')
      .select(`
        *,
        item:item_id(id, name, unit_price)
      `)
      .eq('staff_id', actualId)
      .gt('quantity_available', 0);

    if (storeError) throw storeError;

    // Get all pending or accepted returns for this staff (items already in return process)
    const { data: returnedItems, error: returnError } = await supabaseAdmin
      .from('returned_items')
      .select('item_id, quantity, status')
      .eq('requester_staff_id', actualId)
      .in('status', ['pending', 'accepted']);

    if (returnError) throw returnError;

    // Create map of item_id -> total locked quantity (pending + accepted)
    const lockedQuantities = new Map<string, number>();
    (returnedItems || []).forEach((ret: any) => {
      const current = lockedQuantities.get(ret.item_id) || 0;
      lockedQuantities.set(ret.item_id, current + ret.quantity);
    });

    // Map items and calculate remaining available quantity
    const availableItems = (staffStoreItems || [])
      .map((item: any) => {
        const lockedQty = lockedQuantities.get(item.item_id) || 0;
        // Use quantity_available (= quantity - quantity_sold) minus locked returns
        const remainingQty = Math.max(0, (item.quantity_available || 0) - lockedQty);
        
        return {
          id: item.item_id,
          name: item.item?.name || 'Unknown',
          unit_price: item.item?.unit_price || 0,
          available_quantity: remainingQty,
        };
      })
      .filter((item: any) => item.available_quantity > 0); // Only show if remaining > 0

    return availableItems;
  }

  /**
   * Create notification
   */
  private async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string
  ): Promise<void> {
    await supabaseAdmin
      .from('notifications')
      .insert([
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
    entity_type: string,
    related_id: string,
    metadata: any
  ): Promise<void> {
    await supabaseAdmin
      .from('activity_log')
      .insert([
        {
          user_id: userId,
          action,
          entity_type,
          related_id,
          metadata,
          created_at: new Date().toISOString(),
        },
      ]);
  }
}

export const returnedItemsService = new ReturnedItemsService();
