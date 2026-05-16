import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { creditService } from '../services/credit.service';
import { StorageService } from '../services/storage.service';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * CREDITOR ROUTES
 */

/**
 * Get all creditors
 */
router.get('/creditors', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const creditors = await creditService.getAllCreditors();
    res.json(creditors);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get creditor details
 */
router.get('/creditors/:creditorId', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { creditorId } = req.params;
    const details = await creditService.getCreditorDetails(creditorId);
    res.json(details);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Add new creditor
 */
router.post('/creditors', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phoneNumber, email, address } = req.body;

    if (!fullName || !phoneNumber) {
      return res.status(400).json({ error: 'Full Name and Phone Number are required' });
    }

    const creditor = await creditService.addCreditor(
      fullName,
      phoneNumber,
      email || null,
      address || null,
      req.user!.id
    );

    res.status(201).json(creditor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * CREDIT SALE ROUTES
 */

/**
 * Create credit sale (Give credit)
 */
router.post('/sales', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { creditorId, items, notes } = req.body;

    if (!creditorId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Creditor and items are required' });
    }

    const creditSale = await creditService.createCreditSale(
      creditorId,
      req.user!.id,
      items,
      notes
    );

    res.status(201).json(creditSale);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * CREDIT OVERVIEW & STATS ROUTES
 */

/**
 * Get credit overview stats
 */
router.get('/overview/stats', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await creditService.getCreditOverviewStats();
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get credit activities
 */
router.get('/activities', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const activities = await creditService.getCreditActivities(limit);
    res.json(activities);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * CREDIT STORE ROUTES
 */

/**
 * Get credit store items
 */
router.get('/store', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const items = await creditService.getCreditStoreItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Return items from credit store to active store
 */
router.post('/store/return', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const result = await creditService.returnItemsToActiveStore(items, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * CREDIT PAYMENT ROUTES
 */

/**
 * Record credit payment
 */
router.post('/payments', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      creditorId,
      creditSaleId,
      amount,
      paymentMethod,
      selectedItems,
      referenceNumber,
      notes,
    } = req.body;

    if (!creditorId || !creditSaleId || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    // Parse selectedItems if it's a JSON string (from FormData)
    let parsedSelectedItems = selectedItems;
    if (typeof selectedItems === 'string') {
      try {
        parsedSelectedItems = JSON.parse(selectedItems);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid selectedItems format' });
      }
    }

    // Handle receipt file upload
    let receiptUrl = null;
    if (req.files && (req.files.receipt as any)) {
      const receiptFile = req.files.receipt as any;
      const fileName = `credit-payments/${creditorId}/${Date.now()}-${receiptFile.name}`;
      receiptUrl = await StorageService.uploadReceipt(receiptFile.data, fileName);
    }

    const payment = await creditService.recordCreditPayment(
      creditorId,
      creditSaleId,
      req.user!.id,
      amount,
      paymentMethod,
      parsedSelectedItems,
      referenceNumber,
      receiptUrl,
      notes
    );

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get pending credit payments (for admin approval)
 */
router.get('/payments/pending', authMiddleware, roleMiddleware('admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_payments')
      .select('*, credit_payment_items(*), creditors(full_name, unique_code), users(full_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Approve credit payment
 */
router.post('/payments/:paymentId/approve', authMiddleware, roleMiddleware('admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const payment = await creditService.approveCreditPayment(paymentId, req.user!.id);
    res.json(payment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject credit payment
 */
router.post('/payments/:paymentId/reject', authMiddleware, roleMiddleware('admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const payment = await creditService.rejectCreditPayment(paymentId, req.user!.id, reason);
    res.json(payment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Cancel creditor credit
 */
router.post('/sales/:creditSaleId/cancel', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { creditSaleId } = req.params;
    const { creditorId } = req.body;

    if (!creditorId) {
      return res.status(400).json({ error: 'Creditor ID is required' });
    }

    const result = await creditService.cancelCreditorCredit(creditorId, creditSaleId, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * REMIT CREDIT ROUTES
 */

/**
 * Get remit credit data (ready to submit)
 */
router.get('/remit/ready', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const staffId = req.query.staffId ? (req.query.staffId as string) : undefined;
    const data = await creditService.getRemitCreditData(staffId);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get pending remit credit (not yet approved)
 */
router.get('/remit/pending', authMiddleware, roleMiddleware('sales', 'admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const staffId = req.query.staffId ? (req.query.staffId as string) : undefined;
    const data = await creditService.getPendingRemitCredit(staffId);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
