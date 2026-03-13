import express, { Request, Response } from 'express';
import { receiptsService } from '../services/receipts.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

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

    // Transform items to include total_price
    const itemsData = items.map((item: any) => ({
      item_id: item.id,
      quantity: item.sale_quantity,
      unit_price: item.unit_price,
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
