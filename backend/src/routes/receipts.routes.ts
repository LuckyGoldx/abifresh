import express, { Request, Response } from 'express';
import { receiptsService } from '../services/receipts.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

/** * GET /api/receipts/test-users
 * List all users in database (PUBLIC - for debugging)
 */
router.get('/test-users', async (req: Request, res: Response) => {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, full_name, role');
    
    if (error) throw error;
    res.json({
      count: (data || []).length,
      users: data || []
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/** 
 * GET /api/receipts/test-db
 * Debug endpoint to check database content (PUBLIC - no auth required)
 * MUST BE BEFORE OTHER GET ROUTES
 */
router.get('/test-db', async (req: Request, res: Response) => {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    
    console.log('\n🔍 === Testing Database Connection ===\n');

    // Test receipts
    const { data: receipts, error: receiptsError } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .limit(5);
    
    console.log(`Receipts: ${receiptsError ? 'ERROR: ' + receiptsError.message : 'OK - ' + (receipts?.length || 0) + ' records'}`);

    // Test receipt_items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('receipt_items')
      .select('*')
      .limit(5);
    
    console.log(`Receipt Items: ${itemsError ? 'ERROR: ' + itemsError.message : 'OK - ' + (items?.length || 0) + ' records'}`);

    // Test staff_expenses
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('staff_expenses')
      .select('*')
      .limit(5);
    
    console.log(`Staff Expenses: ${expensesError ? 'ERROR: ' + expensesError.message : 'OK - ' + (expenses?.length || 0) + ' records'}`);

    // Test users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5);
    
    console.log(`Users: ${usersError ? 'ERROR: ' + usersError.message : 'OK - ' + (users?.length || 0) + ' records'}`);

    // Test items
    const { data: allItems, error: allItemsError } = await supabaseAdmin
      .from('items')
      .select('*')
      .limit(5);
    
    console.log(`Items: ${allItemsError ? 'ERROR: ' + allItemsError.message : 'OK - ' + (allItems?.length || 0) + ' records'}`);

    // Test inventory tables
    const { data: mainStore, error: mainStoreError } = await supabaseAdmin
      .from('inventory_main_store')
      .select('*')
      .limit(5);
    
    console.log(`Inventory Main Store: ${mainStoreError ? 'ERROR: ' + mainStoreError.message : 'OK - ' + (mainStore?.length || 0) + ' records'}`);

    const { data: activeStore, error: activeStoreError } = await supabaseAdmin
      .from('inventory_active_store')
      .select('*')
      .limit(5);
    
    console.log(`Inventory Active Store: ${activeStoreError ? 'ERROR: ' + activeStoreError.message : 'OK - ' + (activeStore?.length || 0) + ' records'}`);

    const { data: staffStore, error: staffStoreError } = await supabaseAdmin
      .from('staff_store')
      .select('*')
      .limit(5);
    
    console.log(`Staff Store: ${staffStoreError ? 'ERROR: ' + staffStoreError.message : 'OK - ' + (staffStore?.length || 0) + ' records'}`);

    res.json({
      status: 'Database test complete',
      summary: {
        receipts: receiptsError ? 'ERROR' : (receipts?.length || 0),
        receipt_items: itemsError ? 'ERROR' : (items?.length || 0),
        staff_expenses: expensesError ? 'ERROR' : (expenses?.length || 0),
        users: usersError ? 'ERROR' : (users?.length || 0),
        items: allItemsError ? 'ERROR' : (allItems?.length || 0),
        inventory_main_store: mainStoreError ? 'ERROR' : (mainStore?.length || 0),
        inventory_active_store: activeStoreError ? 'ERROR' : (activeStore?.length || 0),
        staff_store: staffStoreError ? 'ERROR' : (staffStore?.length || 0),
      },
      raw_data: {
        receipts: receipts?.slice(0, 2),
        receipt_items: items?.slice(0, 2),
        staff_expenses: expenses?.slice(0, 2),
        inventory_main_store: mainStore?.slice(0, 2),
        inventory_active_store: activeStore?.slice(0, 2),
        staff_store: staffStore?.slice(0, 2),
      },
    });
  } catch (error: any) {
    console.error('❌ Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/receipts/test-items
 * Check what's in the items table
 */
router.get('/test-items', async (req: Request, res: Response) => {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('*');
    
    res.json({
      count: (items || []).length,
      items: items || [],
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/receipts/test-inventory-joins
 * Test if inventory JOINs with items table work
 */
router.get('/test-inventory-joins', async (req: Request, res: Response) => {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    
    console.log('\n🔍 === Testing Inventory JOINs ===\n');

    // Test without JOINs
    const { data: mainNoJoin, error: err1 } = await supabaseAdmin
      .from('inventory_main_store')
      .select('*')
      .limit(2);
    
    console.log(`Main store without JOIN: ${err1 ? 'ERROR' : mainNoJoin?.length || 0} items`);

    // Test WITH JOIN
    const { data: mainWithJoin, error: err2 } = await supabaseAdmin
      .from('inventory_main_store')
      .select('*, items(id, name, unit_price)')
      .limit(2);
    
    console.log(`Main store WITH JOIN (items): ${err2 ? 'ERROR: ' + err2.message : mainWithJoin?.length || 0} items`);
    
    // Try alternative JOIN syntax
    const { data: mainAltJoin, error: err3 } = await supabaseAdmin
      .from('inventory_main_store')
      .select('id, item_id, quantity_in_stock, reorder_level, last_restocked, notes, items(name, unit_price)')
      .limit(2);
    
    console.log(`Main store Alt JOIN: ${err3 ? 'ERROR: ' + err3.message : mainAltJoin?.length || 0} items`);

    // Check what's in items table
    const { data: allItems, error: itemsErr } = await supabaseAdmin
      .from('items')
      .select('id, name')
      .limit(5);
    
    console.log(`Items table: ${itemsErr ? 'ERROR' : allItems?.length || 0} items`);
    
    // Check if the item_ids in main_store match items table
    const { data: mainStore } = await supabaseAdmin
      .from('inventory_main_store')
      .select('item_id')
      .limit(10);
    
    console.log(`Main store item IDs that we're trying to match: ${mainStore?.map((m: any) => m.item_id).slice(0, 3)}`);
    console.log(`Items in items table: ${allItems?.map((i: any) => i.id).slice(0, 3)}`);

    res.json({
      status: 'Inventory JOIN test complete',
      tests: {
        main_no_join: mainNoJoin?.length || 0,
        main_with_join: mainWithJoin?.length || 0,
        main_with_join_error: err2?.message,
        main_alt_join: mainAltJoin?.length || 0,
        main_alt_join_error: err3?.message,
        items_count: allItems?.length || 0,
        items_table_exists: !itemsErr,
      },
      sample_data: {
        main_no_join: mainNoJoin?.[0],
        main_with_join: mainWithJoin?.[0],
        main_alt_join: mainAltJoin?.[0],
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/receipts/create
 * Create a new receipt
 */
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { receipt_number, items, total_amount, payment_method, sold_outside_jalingo } = req.body;
    const staff_id = req.user?.id;

    if (!staff_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!receipt_number || !items || !total_amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Transform items to include total_price and selling prices
    const itemsData = items.map((item: any) => ({
      item_id: item.id,
      quantity: item.sale_quantity,
      unit_price: item.unit_price,
      price_jalingo: item.price_jalingo,
      price_outside: item.price_outside || null,
      name: item.name,
      total_price: item.unit_price * item.sale_quantity,
    }));

    const receipt = await receiptsService.createReceipt({
      receipt_number,
      staff_id,
      items: itemsData,
      total_amount,
      payment_method,
      sold_outside_jalingo: sold_outside_jalingo || false,
    });

    res.json({
      success: true,
      receipt,
      message: 'Receipt created and stored successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create receipt' });
  }
});

/**
 * GET /api/receipts
 * Get all receipts for the current user
 * Query params: limit, offset
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const staff_id = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!staff_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const receipts = await receiptsService.getStaffReceipts(staff_id, limit, offset);
    res.json(receipts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch receipts' });
  }
});

/**
 * GET /api/receipts/all
 * Get all receipts (admin only)
 */
router.get('/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userRole?.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const receipts = await receiptsService.getAllReceipts(limit, offset);
    res.json(receipts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch receipts' });
  }
});

/**
 * GET /api/receipts/:id
 * Get a specific receipt with all its items
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const receipt = await receiptsService.getReceiptById(id);

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Check authorization: user can view their own receipts, admins can view all
    if (receipt.staff_id !== req.user?.id && !req.user?.role?.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(receipt);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch receipt' });
  }
});

/**
 * GET /api/receipts/search
 * Search receipts by number, date range, etc.
 */
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q, startDate, endDate, limit, offset } = req.query;
    const staff_id = req.user?.role?.includes('admin') ? (req.query.staff_id as string) : req.user?.id;

    const receipts = await receiptsService.searchReceipts(
      (q as string) || '',
      staff_id,
      startDate as string,
      endDate as string,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );

    res.json(receipts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to search receipts' });
  }
});

/**
 * GET /api/receipts/:id/stats
 * Get receipt statistics for a staff member
 */
router.get('/:id/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Check authorization
    if (id !== req.user?.id && !req.user?.role?.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await receiptsService.getStaffReceiptStats(
      id,
      startDate as string,
      endDate as string
    );

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch statistics' });
  }
});

/**
 * DELETE /api/receipts/:id
 * Delete a receipt (only admin or the staff member who created it)
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const receipt = await receiptsService.getReceiptById(id);

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Check authorization
    if (receipt.staff_id !== req.user?.id && !req.user?.role?.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await receiptsService.deleteReceipt(id);
    res.json({ success: true, message: 'Receipt deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete receipt' });
  }
});

export default router;
