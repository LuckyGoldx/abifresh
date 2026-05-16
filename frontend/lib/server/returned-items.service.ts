import { supabaseAdmin } from './supabase-admin';

export class ReturnedItemsService {
  /**
   * Helper: Resolve staff ID to actual UUID if needed
   */
  private async resolveStaffIdToUUID(staffId: string): Promise<string> {
    if (staffId.includes('-') && staffId.length > 30) {
      return staffId;
    }

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
   */
  async createReturnRequest(
    requesterStaffId: string,
    receiverSalesStaffId: string,
    items: Array<{
      item_id: string;
      quantity: number;
      unit_price: number;
      location?: string;
    }>
  ): Promise<any[]> {
    const actualRequesterStaffId = await this.resolveStaffIdToUUID(requesterStaffId);
    const actualReceiverSalesStaffId = await this.resolveStaffIdToUUID(receiverSalesStaffId);
    
    const returnedItemsData = [];

    const { data: requesterData } = await supabaseAdmin
      .from('users')
      .select('full_name, role')
      .eq('id', actualRequesterStaffId)
      .single();
    
    if (!requesterData) throw new Error('Requester not found');
    const requesterName = requesterData.full_name || 'Staff';

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

    // Only count PENDING returns as locked. Accepted returns already reduced staff_store.quantity.
    const { data: existingReturns } = await supabaseAdmin
      .from('returned_items')
      .select('item_id, quantity')
      .eq('requester_staff_id', actualRequesterStaffId)
      .eq('status', 'pending');

    const lockedQuantities = new Map<string, number>();
    (existingReturns || []).forEach((ret: any) => {
      const current = lockedQuantities.get(ret.item_id) || 0;
      lockedQuantities.set(ret.item_id, current + ret.quantity);
    });

    for (const item of items) {
      const { data: staffStoreItem, error: storeError } = await supabaseAdmin
        .from('staff_store')
        .select('quantity, quantity_sold')
        .eq('staff_id', actualRequesterStaffId)
        .eq('item_id', item.item_id)
        .single();

      if (storeError) throw new Error(`Item not found in your store: ${item.item_id}`);
      if (!staffStoreItem) throw new Error(`Item not found in your store: ${item.item_id}`);

      const lockedQty = lockedQuantities.get(item.item_id) || 0;
      // Use real-time quantity - quantity_sold (not stale quantity_available column)
      const netAvailable = (staffStoreItem.quantity || 0) - (staffStoreItem.quantity_sold || 0);
      const actualAvailable = Math.max(0, netAvailable - lockedQty);

      if (actualAvailable < item.quantity) {
        throw new Error(
          `Insufficient quantity. Available: ${actualAvailable}, Requested: ${item.quantity}`
        );
      }

      lockedQuantities.set(item.item_id, lockedQty + item.quantity);

      const { data: returnedItem, error: returnError } = await supabaseAdmin
        .from('returned_items')
        .insert([
          {
            item_id: item.item_id,
            requester_staff_id: actualRequesterStaffId,
            receiver_staff_id: actualReceiverSalesStaffId,
            quantity: item.quantity,
            unit_price: item.unit_price,
            location: item.location || 'Inside Jalingo',
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (returnError) throw returnError;

      returnedItemsData.push(returnedItem);
    }

    return returnedItemsData;
  }

  /**
   * Accept returned items and move them to active store
   */
  async acceptReturnedItems(userId: string, returnedItemIds: string[], isAdmin: boolean = false): Promise<any[]> {
    const actualUserId = await this.resolveStaffIdToUUID(userId);
    const results = [];

    for (const returnedItemId of returnedItemIds) {
      const { data: returnedItem, error: fetchError } = await supabaseAdmin
        .from('returned_items')
        .select('*')
        .eq('id', returnedItemId)
        .single();

      if (fetchError) throw new Error(`Returned item not found: ${returnedItemId}`);
      if (!returnedItem) throw new Error(`Returned item not found: ${returnedItemId}`);

      // Admin can accept any return. Staff can only accept returns sent to them.
      if (!isAdmin && returnedItem.receiver_staff_id !== actualUserId) {
        throw new Error('Unauthorized: This return was not sent to you');
      }

      const { data: itemData, error: itemError } = await supabaseAdmin
        .from('items')
        .select('*')
        .eq('id', returnedItem.item_id)
        .single();

      if (itemError) throw new Error(`Item not found: ${returnedItem.item_id}`);
      if (!itemData) throw new Error(`Item not found: ${returnedItem.item_id}`);

      const newActiveStoreQty = itemData.active_store_quantity + returnedItem.quantity;
      const { error: updateError } = await supabaseAdmin
        .from('items')
        .update({ active_store_quantity: newActiveStoreQty })
        .eq('id', returnedItem.item_id);

      if (updateError) throw updateError;

      const { data: staffStoreItem } = await supabaseAdmin
        .from('staff_store')
        .select('*')
        .eq('staff_id', returnedItem.requester_staff_id)
        .eq('item_id', returnedItem.item_id)
        .eq('location', returnedItem.location || 'Inside Jalingo')
        .single();

      if (staffStoreItem) {
        const newStaffQty = Math.max(0, staffStoreItem.quantity - returnedItem.quantity);
        const { error: staffUpdateError } = await supabaseAdmin
          .from('staff_store')
          .update({ quantity: newStaffQty, last_updated: new Date().toISOString() })
          .eq('id', staffStoreItem.id);

        if (staffUpdateError) throw staffUpdateError;
      }

      const { data: updated, error: statusError } = await supabaseAdmin
        .from('returned_items')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', returnedItemId)
        .select()
        .single();

      if (statusError) throw statusError;

      results.push(updated);
    }

    return results;
  }

  /**
   * Reject returned items
   */
  async rejectReturnedItems(
    userId: string,
    returnedItemIds: string[],
    rejectReason: string,
    isAdmin: boolean = false
  ): Promise<any[]> {
    const actualUserId = await this.resolveStaffIdToUUID(userId);
    const results = [];

    for (const returnedItemId of returnedItemIds) {
      const { data: returnedItem, error: fetchError } = await supabaseAdmin
        .from('returned_items')
        .select('*')
        .eq('id', returnedItemId)
        .single();

      if (fetchError) throw new Error(`Returned item not found: ${returnedItemId}`);
      if (!returnedItem) throw new Error(`Returned item not found: ${returnedItemId}`);

      // Admin can reject any return. Staff can only reject returns sent to them.
      if (!isAdmin && returnedItem.receiver_staff_id !== actualUserId) {
        throw new Error('Unauthorized: This return was not sent to you');
      }

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

      results.push(updated);
    }

    return results;
  }

  /**
   * Get all returned items for a requester staff (their own return requests)
   * CRITICAL: Uses price_jalingo (selling price), NOT unit_price (cost price)
   */
  async getReturnsByRequester(requesterStaffId: string): Promise<any[]> {
    const actualId = await this.resolveStaffIdToUUID(requesterStaffId);
    const { data, error } = await supabaseAdmin
      .from('returned_items')
      .select(`
        *,
        item:item_id(id, name, price_jalingo),
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
      unit_price: item.item?.price_jalingo || 0,
      location: item.location || 'Inside Jalingo',
      status: item.status,
      reject_reason: item.reject_reason,
      receiver_name: item.receiver?.full_name || 'Unknown',
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  }

  /**
   * Get all returned items sent to a sales staff (items they need to accept/reject)
   * CRITICAL: Uses price_jalingo (selling price), NOT unit_price (cost price)
   */
  async getReturnsForReceiver(receiverSalesStaffId: string): Promise<any[]> {
    const actualId = await this.resolveStaffIdToUUID(receiverSalesStaffId);
    const { data, error } = await supabaseAdmin
      .from('returned_items')
      .select(`
        *,
        item:item_id(id, name, price_jalingo),
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
      unit_price: item.item?.price_jalingo || 0,
      location: item.location || 'Inside Jalingo',
      status: item.status,
      reject_reason: item.reject_reason,
      requester_name: item.requester?.full_name || 'Unknown',
      requester_id: item.requester_staff_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  }

  /**
   * Get all returned items for admin
   * CRITICAL: Uses price_jalingo (selling price), NOT unit_price (cost price)
   */
  async getAllReturns(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('returned_items')
      .select(`
        *,
        item:item_id(id, name, price_jalingo),
        requester:requester_staff_id(id, full_name),
        receiver:receiver_staff_id(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      item_id: item.item_id,
      item_name: item.item?.name || 'Unknown',
      quantity: item.quantity,
      unit_price: item.item?.price_jalingo || 0,
      location: item.location || 'Inside Jalingo',
      status: item.status,
      reject_reason: item.reject_reason,
      requester_name: item.requester?.full_name || 'Unknown',
      receiver_name: item.receiver?.full_name || 'Unknown',
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  }

  /**
   * Get available items in requester's staff_store for return
   * Shows items with remaining quantity after subtracting pending/accepted returns
   * Only shows items if remaining quantity > 0
   * 
   * CRITICAL: Uses price_jalingo (selling price) from items table
   * NOT unit_price (cost price) from items or posted_items tables
   */
  async getAvailableItemsForReturn(requesterStaffId: string): Promise<any[]> {
    const actualId = await this.resolveStaffIdToUUID(requesterStaffId);

    // Use quantity - quantity_sold for real-time available stock (quantity_available column is stale)
    const { data: staffStoreItems, error: storeError } = await supabaseAdmin
      .from('staff_store')
      .select(`
        id, item_id, quantity, quantity_sold, location,
        item:item_id(id, name, price_jalingo)
      `)
      .eq('staff_id', actualId);

    if (storeError) throw storeError;

    // Only subtract PENDING returns (soft-locked). Accepted returns already reduced staff_store.quantity.
    const { data: returnedItems, error: returnError } = await supabaseAdmin
      .from('returned_items')
      .select('item_id, quantity, status, location')
      .eq('requester_staff_id', actualId)
      .eq('status', 'pending');

    if (returnError) throw returnError;

    const lockedQuantities = new Map<string, number>();
    (returnedItems || []).forEach((ret: any) => {
      const key = `${ret.item_id}_${ret.location || 'Inside Jalingo'}`;
      const current = lockedQuantities.get(key) || 0;
      lockedQuantities.set(key, current + ret.quantity);
    });

    const availableItems = (staffStoreItems || [])
      .map((item: any) => {
        const itemLoc = item.location || 'Inside Jalingo';
        const key = `${item.item_id}_${itemLoc}`;
        const lockedQty = lockedQuantities.get(key) || 0;
        // Real-time available = quantity - quantity_sold - pending/accepted returns
        const netAvailable = (item.quantity || 0) - (item.quantity_sold || 0);
        const remainingQty = Math.max(0, netAvailable - lockedQty);
        
        const sellingPrice = item.item?.price_jalingo || 0;
        
        return {
          id: item.item_id,
          name: item.item?.name || 'Unknown',
          unit_price: sellingPrice,
          available_quantity: remainingQty,
          location: itemLoc,
        };
      })
      .filter((item: any) => item.available_quantity > 0);

    return availableItems;
  }
}

export const returnedItemsService = new ReturnedItemsService();
