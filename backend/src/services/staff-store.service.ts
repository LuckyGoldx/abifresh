import { supabaseAdmin } from '../config/supabase';

export class StaffStoreService {
  /**
   * Post multiple items to staff
   * Creates entries in posted_items and staff_store
   */
  async postItemsToStaff(
    salesPersonId: string,
    staffId: string,
    items: Array<{
      item_id: string;
      quantity: number;
      unit_price: number;
    }>
  ): Promise<any[]> {
    const postedItemsData = [];

    // Get staff name
    const { data: staffData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', staffId)
      .single();
    
    const staffName = staffData?.full_name || 'Staff';

    for (const item of items) {
      // Verify item exists and has sufficient quantity in active store
      const { data: itemData, error: itemError } = await supabaseAdmin
        .from('items')
        .select('id, active_store_quantity, name')
        .eq('id', item.item_id)
        .single();

      if (itemError) throw new Error(`Item not found: ${item.item_id}`);
      if (!itemData) throw new Error(`Item not found: ${item.item_id}`);

      if (itemData.active_store_quantity < item.quantity) {
        throw new Error(
          `Insufficient quantity for ${itemData.name}. Available: ${itemData.active_store_quantity}, Requested: ${item.quantity}`
        );
      }

      // Deduct from active store
      const newQuantity = itemData.active_store_quantity - item.quantity;
      const { error: updateError } = await supabaseAdmin
        .from('items')
        .update({ active_store_quantity: newQuantity })
        .eq('id', item.item_id);

      if (updateError) throw updateError;

      // Create posted item record
      const { data: postedItem, error: postError } = await supabaseAdmin
        .from('posted_items')
        .insert([
          {
            item_id: item.item_id,
            poster_id: salesPersonId,
            staff_id: staffId,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (postError) throw postError;

      postedItemsData.push(postedItem);
    }

    // Create notification for staff
    await this.createNotification(
      staffId,
      'posted_items',
      'New Items Posted',
      `You have received ${items.length} item(s) for sale`
    );

    // Create notification for sales person to show in recent activities
    await this.createNotification(
      salesPersonId,
      'items_posted',
      `Items posted to ${staffName}`,
      `${items.length} item(s) posted to ${staffName}`
    );

    // Log activity for sales person
    await this.logActivity(salesPersonId, 'ITEMS_POSTED_BATCH', 'posted_items', staffId, {
      staff_id: staffId,
      staff_name: staffName,
      items_count: items.length,
      total_quantity: items.reduce((sum, i) => sum + i.quantity, 0),
    });

    return postedItemsData;
  }

  /**
   * Accept posted items and add to staff store
   */
  async acceptPostedItems(staffId: string, postedItemIds: string[]): Promise<any[]> {
    const staffStoreUpdates = [];
    let posterIdForActivity = '';
    let staffNameForActivity = '';

    console.log(`🔷 acceptPostedItems called for staff: ${staffId}, items: ${postedItemIds.length}`);

    // Get staff name
    const { data: staffData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', staffId)
      .single();
    
    staffNameForActivity = staffData?.full_name || 'Staff';
    console.log(`👤 Staff: ${staffNameForActivity}`);

    for (const postedItemId of postedItemIds) {
      console.log(`\n📝 Processing posted item: ${postedItemId}`);
      
      // Get posted item details
      const { data: postedItem, error: fetchError } = await supabaseAdmin
        .from('posted_items')
        .select('*')
        .eq('id', postedItemId)
        .single();

      console.log(`📋 Posted item fetched:`, postedItem ? 'YES' : 'NO', fetchError ? `ERROR: ${fetchError.message}` : '');
      
      if (fetchError) throw new Error(`Posted item not found: ${postedItemId}`);
      if (!postedItem) throw new Error(`Posted item not found: ${postedItemId}`);
      
      if (postedItem.staff_id !== staffId) {
        throw new Error('Unauthorized: This item was not posted to you');
      }

      console.log(`   Item ID: ${postedItem.item_id}, Quantity: ${postedItem.quantity}`);

      posterIdForActivity = postedItem.poster_id;

      // Check if item already exists in staff store
      console.log(`🔍 Checking if item exists in staff_store...`);
      const { data: existing } = await supabaseAdmin
        .from('staff_store')
        .select('*')
        .eq('staff_id', staffId)
        .eq('item_id', postedItem.item_id)
        .single();

      console.log(`   Existing entry: ${existing ? 'YES' : 'NO'}`);

      if (existing) {
        console.log(`✏️ Updating existing entry (ID: ${existing.id})`);
        console.log(`   Current quantity: ${existing.quantity}, Adding: ${postedItem.quantity}`);
        
        // Update existing entry
        // NOTE: quantity_available is GENERATED ALWAYS, so we only update quantity
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('staff_store')
          .update({
            quantity: existing.quantity + postedItem.quantity,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error(`❌ Error updating staff store: ${updateError.message}`);
          throw updateError;
        }
        console.log(`✅ Staff store updated. New quantity: ${updated.quantity}, Available: ${updated.quantity_available}`);
        staffStoreUpdates.push(updated);
      } else {
        console.log(`➕ Creating new staff store entry`);
        
        // Create new staff store entry
        // NOTE: quantity_available is GENERATED ALWAYS AS (quantity - quantity_sold), do not insert it
        const { data: created, error: createError } = await supabaseAdmin
          .from('staff_store')
          .insert([
            {
              staff_id: staffId,
              item_id: postedItem.item_id,
              quantity: postedItem.quantity,
              posted_from_id: postedItem.poster_id,
              posted_date: postedItem.created_at,
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error(`❌ Error creating staff store entry: ${createError.message}`);
          console.error(`   Full error:`, JSON.stringify(createError, null, 2));
          throw createError;
        }
        console.log(`✅ Staff store entry created. ID: ${created.id}, Quantity: ${created.quantity}, Available: ${created.quantity_available}`);
        staffStoreUpdates.push(created);
      }

      // Update posted item status to accepted
      console.log(`🔄 Updating posted item status to 'accepted'...`);
      const { error: statusError } = await supabaseAdmin
        .from('posted_items')
        .update({ status: 'accepted' })
        .eq('id', postedItemId);

      if (statusError) {
        console.error(`❌ Error updating posted item status: ${statusError.message}`);
        throw statusError;
      }
      console.log(`✅ Posted item status updated to 'accepted'`);

      // Create mapping
      console.log(`🗂️ Creating mapping entry...`);
      const staffStore = staffStoreUpdates[staffStoreUpdates.length - 1];
      await supabaseAdmin
        .from('posted_items_mapping')
        .insert([
          {
            posted_item_id: postedItemId,
            staff_store_id: staffStore.id,
            status: 'accepted',
            accepted_date: new Date().toISOString(),
          },
        ]);
      console.log(`✅ Mapping entry created`);
    }

    console.log(`\n✅ acceptPostedItems completed. ${staffStoreUpdates.length} items updated/created`);

    // Create notification for sales person
    if (posterIdForActivity) {
      await this.createNotification(
        posterIdForActivity,
        'items_accepted',
        `Items Accepted by ${staffNameForActivity}`,
        `${postedItemIds.length} item(s) have been accepted by ${staffNameForActivity}`
      );

      // Log activity for sales person
      await this.logActivity(posterIdForActivity, 'ITEMS_ACCEPTED_BY_STAFF', 'posted_items', postedItemIds[0], {
        staff_id: staffId,
        staff_name: staffNameForActivity,
        items_count: postedItemIds.length,
      });
    }

    // Create notification for staff
    await this.createNotification(
      staffId,
      'items_accepted',
      'Items Accepted',
      `${postedItemIds.length} item(s) have been added to your store`
    );

    // Log activity for staff
    await this.logActivity(staffId, 'ITEMS_ACCEPTED', 'posted_items', postedItemIds[0], {
      items_count: postedItemIds.length,
    });

    return staffStoreUpdates;
  }

  /**
   * Reject posted items
   */
  async rejectPostedItems(
    staffId: string,
    postedItemIds: string[],
    comment?: string
  ): Promise<any[]> {
    const rejectedItems = [];
    let posterIdForActivity = '';
    let staffNameForActivity = '';

    // Get staff name
    const { data: staffData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', staffId)
      .single();
    
    staffNameForActivity = staffData?.full_name || 'Staff';

    for (const postedItemId of postedItemIds) {
      // Get posted item details
      const { data: postedItem, error: fetchError } = await supabaseAdmin
        .from('posted_items')
        .select('*')
        .eq('id', postedItemId)
        .single();

      if (fetchError) throw new Error(`Posted item not found: ${postedItemId}`);

      posterIdForActivity = postedItem.poster_id;

      // Update posted item status to rejected
      const { error: statusError } = await supabaseAdmin
        .from('posted_items')
        .update({ status: 'rejected' })
        .eq('id', postedItemId);

      if (statusError) throw statusError;

      // Add back to active store
      const { data: item } = await supabaseAdmin
        .from('items')
        .select('active_store_quantity')
        .eq('id', postedItem.item_id)
        .single();

      if (item) {
        await supabaseAdmin
          .from('items')
          .update({ active_store_quantity: (item.active_store_quantity || 0) + postedItem.quantity })
          .eq('id', postedItem.item_id);
      }

      // Create mapping for rejection
      await supabaseAdmin
        .from('posted_items_mapping')
        .insert([
          {
            posted_item_id: postedItemId,
            status: 'rejected',
            staff_comment: comment || null,
            rejected_date: new Date().toISOString(),
          },
        ]);

      rejectedItems.push(postedItem);
    }

    // Create notification for sales person
    if (posterIdForActivity) {
      await this.createNotification(
        posterIdForActivity,
        'items_rejected',
        `Items Rejected by ${staffNameForActivity}`,
        `${postedItemIds.length} item(s) have been rejected by ${staffNameForActivity}${comment ? ': ' + comment : ''}`
      );

      // Log activity for sales person
      await this.logActivity(posterIdForActivity, 'ITEMS_REJECTED_BY_STAFF', 'posted_items', postedItemIds[0], {
        staff_id: staffId,
        staff_name: staffNameForActivity,
        items_count: postedItemIds.length,
        comment,
      });
    }

    // Create notification for staff
    await this.createNotification(
      staffId,
      'items_rejected',
      'Items Rejected',
      `${postedItemIds.length} item(s) have been rejected`
    );

    // Log activity for staff
    await this.logActivity(staffId, 'ITEMS_REJECTED', 'posted_items', postedItemIds[0], {
      items_count: postedItemIds.length,
      comment,
    });

    return rejectedItems;
  }

  /**
   * Get staff store items
   */
  async getStaffStore(staffId: string): Promise<any[]> {
    console.log(`\n📊 getStaffStore called for staff: ${staffId}`);
    
    try {
      // First try to get basic staff_store data
      console.log(`🔍 Querying staff_store table...`);
      const { data: storeItems, error } = await supabaseAdmin
        .from('staff_store')
        .select('*')
        .eq('staff_id', staffId)
        .order('posted_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching staff store:', error);
        throw error;
      }

      console.log(`📦 Total staff_store entries fetched: ${storeItems?.length || 0}`);
      if (storeItems && storeItems.length > 0) {
        storeItems.forEach((item, idx) => {
          console.log(`  [${idx}] Item ID: ${item.item_id}, Staff: ${item.staff_id}, Qty: ${item.quantity}, Sold: ${item.quantity_sold}, Available: ${item.quantity_available}`);
        });
      } else {
        console.log('⚠️  No items found in staff store for this staff member');
        return []; // Return empty array if no items
      }

      // Now enrich with item and user details
      console.log(`🔗 Enriching with item and user details...`);
      const enrichedItems = [];
      
      for (const storeItem of storeItems) {
        try {
          // Get item details
          const { data: itemData, error: itemError } = await supabaseAdmin
            .from('items')
            .select('id, name, sku, category, unit_price, commission')
            .eq('id', storeItem.item_id)
            .single();
          
          if (itemError) {
            console.warn(`  ⚠️ Could not fetch item ${storeItem.item_id}: ${itemError.message}`);
            continue;
          }

          // Get posted_by user details
          const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, full_name')
            .eq('id', storeItem.posted_from_id)
            .single();
          
          if (userError) {
            console.warn(`  ⚠️ Could not fetch user ${storeItem.posted_from_id}: ${userError.message}`);
          }

          // Map to frontend format
          const mappedItem = {
            id: storeItem.item_id,
            name: itemData?.name || 'Unknown',
            sku: itemData?.sku || 'N/A',
            category: itemData?.category || 'N/A',
            unit_price: itemData?.unit_price || 0,
            quantity: storeItem.quantity_available || 0,
            commission: itemData?.commission || 0,
            posted_date: storeItem.posted_date,
            posted_by: userData?.full_name || 'Unknown',
          };
          
          enrichedItems.push(mappedItem);
          console.log(`  ✅ Enriched: ${mappedItem.name} (Qty: ${mappedItem.quantity})`);
        } catch (err) {
          console.error(`  ❌ Error enriching item:`, err);
        }
      }

      console.log(`✅ Returning ${enrichedItems.length} enriched items`);
      if (enrichedItems.length > 0) {
        console.log('First item:', JSON.stringify(enrichedItems[0], null, 2));
      }

      return enrichedItems;
    } catch (err) {
      console.error(`❌ getStaffStore error:`, err);
      throw err;
    }
  }

  /**
   * Record a sale from staff store
   */
  async recordStaffSale(
    staffId: string,
    itemId: string,
    quantity: number,
    paymentMethod: 'cash' | 'pos' | 'transfer' = 'cash'
  ): Promise<any> {
    // Get the staff store entry
    const { data: storeItem, error: storeError } = await supabaseAdmin
      .from('staff_store')
      .select('*')
      .eq('staff_id', staffId)
      .eq('item_id', itemId)
      .single();

    if (storeError) throw new Error(`Item not in staff store`);
    if (!storeItem) throw new Error(`Item not found in staff store`);

    // Check sufficient quantity
    if (storeItem.quantity_available < quantity) {
      throw new Error(
        `Insufficient quantity in staff store. Available: ${storeItem.quantity_available}, Requested: ${quantity}`
      );
    }

    // Get item details to get unit_price and commission
    const { data: itemData, error: itemError } = await supabaseAdmin
      .from('items')
      .select('unit_price, commission')
      .eq('id', itemId)
      .single();

    if (itemError) throw new Error(`Item not found in inventory`);

    const unitPrice = itemData?.unit_price || 0;
    const totalAmount = unitPrice * quantity;
    const commissionPerUnit = itemData?.commission || 0;
    const totalCommission = commissionPerUnit * quantity;

    // Create staff sale record with commission
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('staff_sales')
      .insert([
        {
          staff_id: staffId,
          item_id: itemId,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          commission: totalCommission,
          payment_method: paymentMethod,
          receipt_number: `STAFF-${Date.now()}`,
        },
      ])
      .select()
      .single();

    if (saleError) throw saleError;

    // Update staff store: increase quantity_sold
    // NOTE: quantity_available is GENERATED ALWAYS AS (quantity - quantity_sold), so it auto-updates
    const { error: updateError } = await supabaseAdmin
      .from('staff_store')
      .update({
        quantity_sold: (storeItem.quantity_sold || 0) + quantity,
        last_updated: new Date().toISOString(),
      })
      .eq('id', storeItem.id);

    if (updateError) throw updateError;

    // Log activity
    await this.logActivity(staffId, 'STAFF_SALE_RECORDED', 'staff_sales', sale.id, {
      item_id: itemId,
      quantity,
      amount: totalAmount,
    });

    return sale;
  }

  /**
   * Get staff sales history
   */
  async getStaffSalesHistory(staffId: string, limit: number = 50): Promise<any> {
    const { data: sales, error } = await supabaseAdmin
      .from('staff_sales')
      .select(`
        *,
        items:item_id(id, name, sku, unit_price)
      `)
      .eq('staff_id', staffId)
      .order('sale_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Fetch payments (all statuses) to know which items are in any payment state
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, items_paid_for, status, created_at')
      .eq('staff_id', staffId);

    if (paymentsError) {
      console.error('⚠️ Error fetching payments:', paymentsError);
    }

    // Build sets for different payment states - track SALE IDs, not item IDs
    const approvedSaleIds = new Set<string>();
    const pendingSaleIds = new Set<string>();
    const rejectedSaleIds = new Set<string>();
    const approvedPaymentIds = new Set<string>();
    const pendingPaymentIds = new Set<string>();

    if (paymentsData) {
      paymentsData.forEach((payment: any) => {
        if (payment.items_paid_for && Array.isArray(payment.items_paid_for)) {
          // items_paid_for contains objects: {item_id, sale_ids: [...], quantity, amount}
          payment.items_paid_for.forEach((paidItem: any) => {
            if (Array.isArray(paidItem.sale_ids)) {
              paidItem.sale_ids.forEach((saleId: string) => {
                if (payment.status === 'approved') {
                  approvedSaleIds.add(saleId);
                  approvedPaymentIds.add(payment.id);
                } else if (payment.status === 'pending') {
                  pendingSaleIds.add(saleId);
                  pendingPaymentIds.add(payment.id);
                } else if (payment.status === 'rejected') {
                  rejectedSaleIds.add(saleId);
                }
              });
            }
          });
        }
      });
    }

    // Calculate approved and pending amounts (only once per payment, not per sale_id)
    let approvedPaymentAmount = 0;
    let pendingPaymentAmount = 0;
    
    if (paymentsData) {
      paymentsData.forEach((payment: any) => {
        if (approvedPaymentIds.has(payment.id)) {
          approvedPaymentAmount += payment.amount || 0;
        } else if (pendingPaymentIds.has(payment.id)) {
          pendingPaymentAmount += payment.amount || 0;
        }
      });
    }

    // Map to expected format
    const allSales = (sales || []).map((sale: any) => ({
      id: sale.id,
      item_id: sale.item_id,
      item_name: sale.items?.name || 'Unknown',
      quantity: sale.quantity,
      unit_price: sale.unit_price || sale.items?.unit_price || 0,
      total_amount: sale.total_amount || (sale.unit_price * sale.quantity) || 0,
      sale_date: sale.sale_date,
      isApproved: approvedSaleIds.has(sale.id),
      isPending: pendingSaleIds.has(sale.id),
      isRejected: rejectedSaleIds.has(sale.id),
    }));

    // Calculate stats
    // Display items = items that are NOT approved and NOT pending (only truly unpaid)
    const displayItems = allSales.filter((item: any) => !item.isApproved && !item.isPending);
    const totalQuantity = displayItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalSalesAmount = displayItems.reduce((sum: number, item: any) => sum + item.total_amount, 0);
    
    // For all-time totals
    const allTimeQuantity = allSales.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const allTimeTotalSales = allSales.reduce((sum: number, item: any) => sum + item.total_amount, 0);
    const paidQuantity = allSales.filter((item: any) => item.isApproved).reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    // Today's sales calculation
    const today = new Date().toISOString().split('T')[0];
    const todaysSales = allSales.filter((item: any) => item.sale_date.startsWith(today));
    const todaysTotalQuantity = todaysSales.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const todaysTotalAmount = todaysSales.reduce((sum: number, item: any) => sum + item.total_amount, 0);
    
    // Outstanding amount calculation
    const outstandingAmount = Math.max(0, allTimeTotalSales - approvedPaymentAmount - pendingPaymentAmount);

    console.log(`✅ ALL-TIME CALCULATION FOR STAFF: ${staffId}`);
    console.log(`   - Total Sales Items: ${allSales.length}`);
    console.log(`   - All-Time Quantity: ${allTimeQuantity} units`);
    console.log(`   - All-Time Total Sales: ₦${allTimeTotalSales}`);
    console.log(`   - Approved Amount: ₦${approvedPaymentAmount}`);
    console.log(`   - Pending Amount: ₦${pendingPaymentAmount}`);
    console.log(`   - Outstanding: ₦${outstandingAmount}`);

    return {
      allItems: displayItems, // Only show items NOT in pending or approved state
      stats: {
        // Today's sales
        todaysTotalQuantity: todaysTotalQuantity,
        todaysTotalAmount: todaysTotalAmount,
        
        // All-time totals
        allTimeQuantity: allTimeQuantity,
        allTimeTotalAmount: allTimeTotalSales,
        paidQuantity: paidQuantity,
        
        // Currently unpaid/displayable
        totalQuantity: totalQuantity,
        totalItems: displayItems.length,
        totalSalesAmount: totalSalesAmount,
        
        // Outstanding calculation
        outstandingAmount: outstandingAmount,
      }
    };
  }

  /**
   * Get staff store summary for admin dashboard
   */
  async getAllStaffStoresSummary(): Promise<any[]> {
    console.log('📋 getAllStaffStoresSummary called');
    
    // First get all staff_store records
    const { data: storeData, error } = await supabaseAdmin
      .from('staff_store')
      .select('*')
      .order('staff_id', { ascending: true })
      .order('posted_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching staff store summary:', error);
      throw error;
    }

    console.log(`📦 getAllStaffStoresSummary: Found ${storeData?.length || 0} total store records`);

    if (!storeData || storeData.length === 0) {
      console.log('ℹ️ No staff store data found, returning empty array');
      return [];
    }

    // Get all unique staff and item IDs
    const staffIds = [...new Set((storeData || []).map(s => s.staff_id))];
    const itemIds = [...new Set((storeData || []).map(s => s.item_id))];

    console.log(`📦 Fetching data for ${staffIds.length} staff and ${itemIds.length} items`);

    // Fetch all users and items
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role')
      .in('id', staffIds);

    const { data: items } = await supabaseAdmin
      .from('items')
      .select('id, name, sku, category, unit_price, base_price')
      .in('id', itemIds);

    // Create maps for easy lookup
    const userMap = new Map(users?.map(u => [u.id, u]) || []);
    const itemMap = new Map(items?.map(i => [i.id, i]) || []);

    // Group by staff
    const grouped = (storeData || []).reduce((acc: any, item: any) => {
      const staffId = item.staff_id;
      if (!acc[staffId]) {
        const user = userMap.get(staffId);
        acc[staffId] = {
          staff_id: staffId,
          staff_name: user?.full_name || 'Unknown',
          staff_role: user?.role || 'Unknown',
          items: [],
          total_items: 0,
          total_quantity: 0,
          total_sold: 0,
          total_available: 0,
        };
      }
      
      const enrichedItem = {
        ...item,
        items: itemMap.get(item.item_id) || null,
        users: userMap.get(item.staff_id) || null,
      };
      
      acc[staffId].items.push(enrichedItem);
      acc[staffId].total_items += 1;
      acc[staffId].total_quantity += item.quantity || 0;
      acc[staffId].total_sold += item.quantity_sold || 0;
      acc[staffId].total_available += item.quantity_available || 0;
      return acc;
    }, {});

    const result = Object.values(grouped);
    console.log(`✅ getAllStaffStoresSummary: Grouped into ${result.length} staff members`);
    if (result.length > 0) {
      console.log('🔍 First staff:', (result as any[])[0]);
    }
    return result;
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
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: userId,
        type,
        title,
        message,
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

export const staffStoreService = new StaffStoreService();
