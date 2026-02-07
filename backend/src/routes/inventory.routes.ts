import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { inventoryService } from '../services/inventory.service';

const router = Router();

/**
 * Get all items (accessible by all authenticated users)
 */
router.get('/items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📥 GET /items - Fetching all items');
    const items = await inventoryService.getAllItems();
    console.log('📦 Found', items.length, 'items');
    
    if (items.length > 0) {
      console.log('🔍 First item being sent to frontend:', {
        name: items[0].name,
        main_store_quantity: items[0].main_store_quantity,
        active_store_quantity: items[0].active_store_quantity,
        keys: Object.keys(items[0])
      });
    }
    
    res.json(items);
  } catch (error: any) {
    console.error('❌ Error fetching items:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get single item by ID
 */
router.get('/items/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await inventoryService.getItemById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Add new item (admin only)
 */
router.post('/items', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, unit_price, sku, quantity, commission } = req.body;
    
    console.log('📝 POST /items - Adding new item:', { name, sku, quantity, commission });

    if (!name || !category || unit_price === undefined || !sku) {
      return res.status(400).json({ error: 'Missing required fields: name, category, unit_price, sku' });
    }

    const item = await inventoryService.addItem(
      name,
      category,
      unit_price,
      sku,
      quantity || 0,
      commission || 0
    );

    console.log('✅ Item added successfully:', item.id);
    res.status(201).json(item);
  } catch (error: any) {
    console.error('❌ Error adding item:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Edit item (admin only)
 */
router.put('/items/:id', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, unit_price, sku, main_store_quantity, commission } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (unit_price !== undefined) updates.unit_price = unit_price;
    if (sku !== undefined) updates.sku = sku;
    if (commission !== undefined) updates.commission = commission;
    if (main_store_quantity !== undefined) updates.main_store_quantity = main_store_quantity;

    const item = await inventoryService.editItem(id, updates);
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete item
 */
router.delete('/items/:id', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await inventoryService.deleteItem(id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Transfer from main store to active store (admin only)
 */
router.post('/transfer/main-to-active', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity } = req.body;

    if (!item_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: item_id, quantity' });
    }

    await inventoryService.transferFromMainToActive(item_id, quantity);
    res.json({ message: 'Transfer successful' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Transfer from active store to main store (admin only)
 */
router.post('/transfer/active-to-main', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity } = req.body;

    if (!item_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: item_id, quantity' });
    }

    await inventoryService.transferFromActiveToMain(item_id, quantity);
    res.json({ message: 'Transfer successful' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get inventory summary (statistics) with optional view filter
 */
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const view = req.query.view as string || 'all';
    let summary;
    
    if (view === 'main') {
      summary = await inventoryService.getMainStoreStats();
    } else if (view === 'active') {
      summary = await inventoryService.getActiveStoreStats();
    } else if (view === 'unavailable') {
      summary = await inventoryService.getUnavailableStats();
    } else {
      summary = await inventoryService.getInventorySummary();
    }
    
    console.log(`📊 Summary for view: ${view}`, summary);
    res.json(summary);
  } catch (error: any) {
    console.error('❌ Error getting summary:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get main store items only
 */
router.get('/main-store', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await inventoryService.getMainStoreItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get active store items only
 */
router.get('/active-store', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await inventoryService.getActiveStoreItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get unavailable items (not in active store)
 */
router.get('/unavailable', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await inventoryService.getUnavailableItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
