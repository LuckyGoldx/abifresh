import { supabaseAdmin } from '../config/supabase';
import { Item } from '../types';

export class InventoryService {
  /**
   * Get all items with quantities from both stores
   * Returns items from the items table with store quantities
   */
  async getAllItems(): Promise<any[]> {
    console.log('🔍 getAllItems() called - fetching from Supabase...');
    
    const { data, error } = await supabaseAdmin
      .from('items')
      .select(`
        id,
        name,
        sku,
        category,
        unit_price,
        commission,
        active_store_quantity,
        main_store_quantity,
        is_available,
        created_at,
        updated_at
      `)
      .order('name');

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log(`✅ Supabase returned ${data?.length || 0} items`);
    if (data && data.length > 0) {
      console.log('🔍 First item RAW from Supabase:', JSON.stringify(data[0], null, 2));
    }
    
    const mapped = (data || []).map((item: any) => {
      const result = {
        ...item,
        main_store_quantity: item.main_store_quantity || 0,
        active_store_quantity: item.active_store_quantity || 0,
      };
      
      console.log(`📦 Item: ${item.name}`, {
        main_qty: item.main_store_quantity,
        active_qty: item.active_store_quantity,
      });
      
      return result;
    });
    
    console.log('✅ getAllItems() returning', mapped.length, 'mapped items');
    if (mapped.length > 0) {
      console.log('🔍 First MAPPED item:', JSON.stringify(mapped[0], null, 2));
    }
    
    return mapped;
  }

  /**
   * Get single item by ID with full details
   */
  async getItemById(itemId: string): Promise<any | null> {
    const { data, error } = await supabaseAdmin
      .from('items')
      .select(`
        id,
        name,
        sku,
        category,
        unit_price,
        commission,
        active_store_quantity,
        main_store_quantity,
        is_available,
        created_at,
        updated_at
      `)
      .eq('id', itemId)
      .single();

    if (error) return null;
    
    return {
      ...data,
      main_store_quantity: data.main_store_quantity || 0,
      active_store_quantity: data.active_store_quantity || 0,
    };
  }

  /**
   * Add item to catalog
   * Creates item with store quantities in the items table
   */
  async addItem(
    name: string,
    category: string,
    unitPrice: number,
    sku: string,
    quantity: number = 0,
    commission: number = 0,
    extra: {
      brand?: string;
      package_type?: string;
      price_jalingo?: number;
      price_outside?: number;
      image_url?: string;
    } = {}
  ): Promise<any> {
    console.log('🔧 addItem called:', { name, sku, quantity, commission, ...extra });
    
    // Insert into items table with store quantities
    const insertData: any = {
      name,
      category,
      unit_price: unitPrice,
      sku,
      commission,
      main_store_quantity: quantity,
      active_store_quantity: 0,
      is_available: true,
    };

    // Add extra fields if provided
    if (extra.brand) insertData.brand = extra.brand;
    if (extra.package_type) insertData.package_type = extra.package_type;
    if (extra.price_jalingo !== undefined) insertData.price_jalingo = extra.price_jalingo;
    if (extra.price_outside !== undefined) insertData.price_outside = extra.price_outside;
    if (extra.image_url) insertData.image_url = extra.image_url;

    const { data: itemData, error: itemError } = await supabaseAdmin
      .from('items')
      .insert([insertData])
      .select()
      .single();

    if (itemError) {
      console.error('❌ Error inserting item:', itemError);
      throw itemError;
    }
    console.log('✅ Item created:', itemData.id);

    return this.getItemById(itemData.id);
  }

  /**
   * Edit item details
   * Updates items table including store quantities
   */
  async editItem(itemId: string, updates: {
    name?: string;
    category?: string;
    unit_price?: number;
    sku?: string;
    main_store_quantity?: number;
    active_store_quantity?: number;
    commission?: number;
  }): Promise<any> {
    const itemUpdates: any = {};

    if (updates.name !== undefined) itemUpdates.name = updates.name;
    if (updates.category !== undefined) itemUpdates.category = updates.category;
    if (updates.unit_price !== undefined) itemUpdates.unit_price = updates.unit_price;
    if (updates.sku !== undefined) itemUpdates.sku = updates.sku;
    if (updates.commission !== undefined) itemUpdates.commission = updates.commission;
    if (updates.main_store_quantity !== undefined) itemUpdates.main_store_quantity = updates.main_store_quantity;
    if (updates.active_store_quantity !== undefined) itemUpdates.active_store_quantity = updates.active_store_quantity;

    // Update items table
    if (Object.keys(itemUpdates).length > 0) {
      const { error: itemError } = await supabaseAdmin
        .from('items')
        .update(itemUpdates)
        .eq('id', itemId);
      if (itemError) throw itemError;
    }

    return this.getItemById(itemId);
  }

  /**
   * Transfer quantity from main store to active store
   */
  async transferFromMainToActive(itemId: string, quantity: number): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    if (item.main_store_quantity < quantity) {
      throw new Error(
        `Insufficient quantity in main store. Available: ${item.main_store_quantity}, Requested: ${quantity}`
      );
    }

    const newMainStore = item.main_store_quantity - quantity;
    const newActiveStore = item.active_store_quantity + quantity;

    // Update items table
    const { error } = await supabaseAdmin
      .from('items')
      .update({ 
        main_store_quantity: newMainStore,
        active_store_quantity: newActiveStore 
      })
      .eq('id', itemId);
    if (error) throw error;
  }

  /**
   * Transfer quantity from active store to main store
   */
  async transferFromActiveToMain(itemId: string, quantity: number): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    if (item.active_store_quantity < quantity) {
      throw new Error(
        `Insufficient quantity in active store. Available: ${item.active_store_quantity}, Requested: ${quantity}`
      );
    }

    const newActiveStore = item.active_store_quantity - quantity;
    const newMainStore = item.main_store_quantity + quantity;

    // Update items table
    const { error } = await supabaseAdmin
      .from('items')
      .update({ 
        active_store_quantity: newActiveStore,
        main_store_quantity: newMainStore 
      })
      .eq('id', itemId);
    if (error) throw error;
  }

  /**
   * Delete item
   */
  async deleteItem(itemId: string): Promise<void> {
    // Delete from items
    const { error } = await supabaseAdmin.from('items').delete().eq('id', itemId);
    if (error) throw error;
  }

  /**
   * Get inventory summary with statistics
   */
  async getInventorySummary(): Promise<any> {
    const items = await this.getAllItems();
    
    const totalItems = items.length;
    const totalMainStore = items.reduce((sum, item) => sum + (item.main_store_quantity || 0), 0);
    const totalActiveStore = items.reduce((sum, item) => sum + (item.active_store_quantity || 0), 0);
    const totalQuantity = totalMainStore + totalActiveStore;
    const availableItems = items.filter(item => item.active_store_quantity > 0).length;
    const unavailableItems = items.filter(item => item.active_store_quantity === 0).length;
    
    // Calculate total value
    const totalValue = items.reduce((sum, item) => {
      const qty = (item.main_store_quantity || 0) + (item.active_store_quantity || 0);
      return sum + (qty * item.unit_price);
    }, 0);

    return {
      total_items: totalItems,
      total_quantity: totalQuantity,
      total_main_store: totalMainStore,
      total_active_store: totalActiveStore,
      available_items: availableItems,
      unavailable_items: unavailableItems,
      total_value: totalValue,
    };
  }

  /**
   * Get stats for main store items
   */
  async getMainStoreStats(): Promise<any> {
    const items = await this.getMainStoreItems();
    
    const totalMainStore = items.reduce((sum, item) => sum + (item.main_store_quantity || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + ((item.main_store_quantity || 0) * item.unit_price), 0);

    return {
      total_items: items.length,
      total_quantity: totalMainStore,
      total_main_store: totalMainStore,
      total_active_store: 0,
      available_items: items.length,
      unavailable_items: 0,
      total_value: totalValue,
      view: 'main'
    };
  }

  /**
   * Get stats for active store items
   */
  async getActiveStoreStats(): Promise<any> {
    const items = await this.getActiveStoreItems();
    
    const totalActiveStore = items.reduce((sum, item) => sum + (item.active_store_quantity || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + ((item.active_store_quantity || 0) * item.unit_price), 0);

    return {
      total_items: items.length,
      total_quantity: totalActiveStore,
      total_main_store: 0,
      total_active_store: totalActiveStore,
      available_items: items.length,
      unavailable_items: 0,
      total_value: totalValue,
      view: 'active'
    };
  }

  /**
   * Get stats for unavailable items
   */
  async getUnavailableStats(): Promise<any> {
    const items = await this.getUnavailableItems();
    
    return {
      total_items: items.length,
      total_quantity: 0,
      total_main_store: 0,
      total_active_store: 0,
      available_items: 0,
      unavailable_items: items.length,
      total_value: 0,
      view: 'unavailable'
    };
  }

  /**
   * Get only items in main store
   */
  async getMainStoreItems(): Promise<any[]> {
    const items = await this.getAllItems();
    return items.filter(item => item.main_store_quantity > 0);
  }

  /**
   * Get only items in active store
   */
  async getActiveStoreItems(): Promise<any[]> {
    const items = await this.getAllItems();
    return items.filter(item => item.active_store_quantity > 0);
  }

  /**
   * Get unavailable items (not in active store)
   */
  async getUnavailableItems(): Promise<any[]> {
    const items = await this.getAllItems();
    return items.filter(item => item.active_store_quantity === 0);
  }
}

export const inventoryService = new InventoryService();
