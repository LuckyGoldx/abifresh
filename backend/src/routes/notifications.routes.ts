import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * Get all notifications for current user (comprehensive)
 * Includes: posted items status, payment updates, comments, system notifications
 * Filters: Only shows recent items (less than 24 hours old) or items that recently changed status
 */
router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const allNotifications: any[] = [];

    // 1. Get posted items notifications (items sent to staff or received by staff)
    if (userRole.includes('staff') || userRole.includes('commission')) {
      // For staff: items they received and their status
      const { data: receivedItems } = await supabaseAdmin
        .from('posted_items')
        .select(`
          id, quantity, status, created_at, updated_at,
          item:item_id(name),
          posted_by:poster_id(full_name)
        `)
        .eq('staff_id', userId)
        .order('updated_at', { ascending: false });

      (receivedItems || []).forEach((item: any) => {
        // Only show if: status is pending (new) OR updated in last 24 hours (recent change)
        const isRecent = item.updated_at && new Date(item.updated_at) > new Date(twentyFourHoursAgo);
        const isPending = item.status === 'pending';

        if (isPending || isRecent) {
          const statusText = item.status === 'accepted' ? 'Accepted' : 
                             item.status === 'rejected' ? 'Rejected' : 'Posted';
          
          allNotifications.push({
            id: `posted-item-${item.id}`,
            type: 'posted_item_status',
            title: statusText === 'Posted' ? 'New Items Posted' : `Items ${statusText}`,
            message: `${item.quantity}x ${item.item?.name || 'Item'} ${item.status === 'pending' ? 'awaiting your response' : statusText.toLowerCase()} - from ${item.posted_by?.full_name || 'Sales'}`,
            status: item.status,
            timestamp: item.updated_at,
            category: 'posted_items',
            read: false,
          });
        }
      });
    }

    if (userRole.includes('sales')) {
      // For sales: items they posted and their status
      const { data: postedItems } = await supabaseAdmin
        .from('posted_items')
        .select(`
          id, quantity, status, created_at, updated_at,
          item:item_id(name),
          staff:staff_id(full_name)
        `)
        .eq('poster_id', userId)
        .order('updated_at', { ascending: false });

      (postedItems || []).forEach((item: any) => {
        // Only show if: status is pending (just posted) OR updated in last 24 hours (recent change)
        const isRecent = item.updated_at && new Date(item.updated_at) > new Date(twentyFourHoursAgo);
        const isPending = item.status === 'pending';

        if (isPending) {
          // Show when items are first posted
          allNotifications.push({
            id: `posted-item-${item.id}`,
            type: 'posted_item_status',
            title: `Items posted to ${item.staff?.full_name || 'Staff'}`,
            message: `${item.quantity}x ${item.item?.name || 'Item'} posted to ${item.staff?.full_name || 'Staff'}`,
            status: item.status,
            timestamp: item.created_at,
            category: 'posted_items',
            read: false,
          });
        } else if (isRecent) {
          // Show status changes in last 24 hours
          if (item.status === 'accepted') {
            allNotifications.push({
              id: `posted-item-${item.id}`,
              type: 'posted_item_status',
              title: `Items Accepted by ${item.staff?.full_name || 'Staff'}`,
              message: `${item.quantity}x ${item.item?.name || 'Item'} accepted by ${item.staff?.full_name || 'Staff'}`,
              status: item.status,
              timestamp: item.updated_at,
              category: 'posted_items',
              read: false,
            });
          } else if (item.status === 'rejected') {
            allNotifications.push({
              id: `posted-item-${item.id}`,
              type: 'posted_item_status',
              title: `Items Rejected by ${item.staff?.full_name || 'Staff'}`,
              message: `${item.quantity}x ${item.item?.name || 'Item'} rejected by ${item.staff?.full_name || 'Staff'}`,
              status: item.status,
              timestamp: item.updated_at,
              category: 'posted_items',
              read: false,
            });
          }
        }
      });
    }

    // 2. Get payment notifications
    const { data: payments } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, status, created_at, updated_at, comment, staff_id')
      .or(`staff_id.eq.${userId},reviewer_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(20);

    (payments || []).forEach((payment: any) => {
      allNotifications.push({
        id: `payment-${payment.id}`,
        type: 'payment_status',
        title: `Payment ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}`,
        message: `₦${(payment.amount || 0).toLocaleString()} payment ${payment.status}${payment.comment ? ': ' + payment.comment : ''}`,
        status: payment.status,
        amount: payment.amount,
        timestamp: payment.updated_at,
        category: 'payments',
        read: false,
      });
    });

    // 3. Get system notifications (if any)
    const { data: systemNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    (systemNotifications || []).forEach((notification: any) => {
      allNotifications.push({
        id: notification.id,
        type: 'system',
        title: notification.title,
        message: notification.message,
        timestamp: notification.created_at,
        category: 'system',
        read: notification.is_read || false,
      });
    });

    // Sort by timestamp (newest first)
    allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(allNotifications);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get notifications for current user (legacy - from notifications table)
 */
router.get('/notifications/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Mark notification as read
 */
router.put('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get unread notification count for current user
 */
router.get('/notifications/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let unreadCount = 0;

    // Count unread system notifications
    const { count: systemCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    unreadCount += systemCount || 0;

    // Count pending posted items (for staff)
    if (userRole.includes('staff') || userRole.includes('commission')) {
      const { count: postedCount } = await supabaseAdmin
        .from('posted_items')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('status', 'pending');

      unreadCount += postedCount || 0;
    }

    // Count pending payments
    const { count: paymentCount } = await supabaseAdmin
      .from('staff_payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .or(`staff_id.eq.${userId},reviewer_id.eq.${userId}`);

    unreadCount += paymentCount || 0;

    res.json({ unread_count: unreadCount });
  } catch (error: any) {
    console.error('Error fetching unread notification count:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
