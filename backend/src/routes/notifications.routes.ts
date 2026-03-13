import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * Get the user's last_notifications_read_at timestamp.
 * Virtual notifications (posted items, payments, returns) created before this time are treated as read.
 * Falls back to null if column doesn't exist yet.
 */
async function getLastReadAt(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('last_notifications_read_at')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data?.last_notifications_read_at || null;
  } catch {
    return null;
  }
}

/** Map a DB notification type to a frontend category */
function getNotificationCategory(type: string): string {
  if (['payment_request', 'payment_approved', 'payment_rejected', 'payment_status'].includes(type)) return 'payments';
  if (['posted_items', 'items_posted', 'items_accepted', 'items_rejected', 'posted_item_status'].includes(type)) return 'posted_items';
  if (['returned_items', 'return_request_sent', 'return_accepted', 'return_rejected'].includes(type)) return 'returns';
  return 'system';
}

/** Check if user has admin-level role */
function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'superadmin';
}

/**
 * Get the set of individually-read virtual notification IDs for a user.
 * These are stored as special marker records in the notifications table with type='virtual_read_marker'.
 */
async function getReadVirtualIds(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabaseAdmin
      .from('notifications')
      .select('title')
      .eq('user_id', userId)
      .eq('type', 'virtual_read_marker');
    return new Set((data || []).map((r: any) => r.title));
  } catch {
    return new Set();
  }
}

/**
 * Get all notifications for current user (comprehensive)
 * Includes: posted items status, payment updates, returned items, system notifications
 * Admin/superadmin see ALL activity across the system.
 * Virtual notifications from posted_items/staff_payments/returned_items use last_notifications_read_at + notification_reads for read tracking
 */
router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const lastReadAt = await getLastReadAt(userId);
    const readVirtualIds = await getReadVirtualIds(userId);

    const allNotifications: any[] = [];

    // ────────────────────────────────────────────────────
    // 1. POSTED ITEMS virtual notifications
    // ────────────────────────────────────────────────────

    // Staff: items received
    if (userRole.includes('staff') || userRole.includes('commission')) {
      const { data: receivedItems } = await supabaseAdmin
        .from('posted_items')
        .select(`
          id, quantity, status, created_at, updated_at,
          item:item_id(name),
          posted_by:poster_id(full_name)
        `)
        .eq('staff_id', userId)
        .order('updated_at', { ascending: false })
        .limit(30);

      (receivedItems || []).forEach((item: any) => {
        const isRecent = item.updated_at && new Date(item.updated_at) > new Date(fortyEightHoursAgo);
        const isPending = item.status === 'pending';

        if (isPending || isRecent) {
          const statusText = item.status === 'accepted' ? 'Accepted' : 
                             item.status === 'rejected' ? 'Rejected' : 'Posted';
          const timestamp = item.updated_at || item.created_at;
          const virtualId = `posted-item-${item.id}`;
          const isRead = readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false);
          
          allNotifications.push({
            id: virtualId,
            type: 'posted_item_status',
            title: statusText === 'Posted' ? 'New Items Posted' : `Items ${statusText}`,
            message: `${item.quantity}x ${item.item?.name || 'Item'} ${item.status === 'pending' ? 'awaiting your response' : statusText.toLowerCase()} - from ${item.posted_by?.full_name || 'Sales'}`,
            status: item.status,
            timestamp,
            category: 'posted_items',
            is_read: isRead,
          });
        }
      });
    }

    // Sales: items they posted
    if (userRole.includes('sales')) {
      const { data: postedItems } = await supabaseAdmin
        .from('posted_items')
        .select(`
          id, quantity, status, created_at, updated_at,
          item:item_id(name),
          staff:staff_id(full_name)
        `)
        .eq('poster_id', userId)
        .order('updated_at', { ascending: false })
        .limit(30);

      (postedItems || []).forEach((item: any) => {
        const isRecent = item.updated_at && new Date(item.updated_at) > new Date(fortyEightHoursAgo);
        const isPending = item.status === 'pending';

        if (isPending || isRecent) {
          const statusText = item.status === 'accepted' ? 'Accepted' : 
                             item.status === 'rejected' ? 'Rejected' : 'Pending';
          const timestamp = item.updated_at || item.created_at;
          const virtualId = `posted-item-${item.id}`;
          const isRead = readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false);
          allNotifications.push({
            id: virtualId,
            type: 'posted_item_status',
            title: isPending ? `Items posted to ${item.staff?.full_name || 'Staff'}` : `Items ${statusText} by ${item.staff?.full_name || 'Staff'}`,
            message: `${item.quantity}x ${item.item?.name || 'Item'} ${isPending ? 'posted to' : statusText.toLowerCase() + ' by'} ${item.staff?.full_name || 'Staff'}`,
            status: item.status,
            timestamp,
            category: 'posted_items',
            is_read: isRead,
          });
        }
      });
    }

    // Admin/Superadmin: see ALL posted items (overview)
    if (isAdminRole(userRole)) {
      const { data: allPostedItems } = await supabaseAdmin
        .from('posted_items')
        .select(`
          id, quantity, status, created_at, updated_at,
          item:item_id(name),
          staff:staff_id(full_name),
          posted_by:poster_id(full_name)
        `)
        .order('updated_at', { ascending: false })
        .limit(40);

      (allPostedItems || []).forEach((item: any) => {
        const isRecent = item.updated_at && new Date(item.updated_at) > new Date(fortyEightHoursAgo);
        const isPending = item.status === 'pending';

        if (isPending || isRecent) {
          const statusText = item.status === 'accepted' ? 'Accepted' : 
                             item.status === 'rejected' ? 'Rejected' : 'Pending';
          const timestamp = item.updated_at || item.created_at;
          const virtualId = `posted-item-${item.id}`;
          const isRead = readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false);
          const poster = item.posted_by?.full_name || 'Sales';
          const staff = item.staff?.full_name || 'Staff';

          allNotifications.push({
            id: virtualId,
            type: 'posted_item_status',
            title: isPending
              ? `Items Posted: ${poster} → ${staff}`
              : `Items ${statusText}: ${poster} → ${staff}`,
            message: `${item.quantity}x ${item.item?.name || 'Item'} — ${poster} posted to ${staff} (${statusText.toLowerCase()})`,
            status: item.status,
            timestamp,
            category: 'posted_items',
            is_read: isRead,
          });
        }
      });
    }

    // ────────────────────────────────────────────────────
    // 2. PAYMENT virtual notifications
    // ────────────────────────────────────────────────────

    if (isAdminRole(userRole)) {
      // Admin/Superadmin: see ALL payments
      const { data: allPayments } = await supabaseAdmin
        .from('staff_payments')
        .select('id, amount, status, created_at, updated_at, comment, staff_id, staff_name, payment_method')
        .order('updated_at', { ascending: false })
        .limit(30);

      (allPayments || []).forEach((payment: any) => {
        const isRecent = payment.updated_at && new Date(payment.updated_at) > new Date(fortyEightHoursAgo);
        const isPending = payment.status === 'pending';

        if (isPending || isRecent) {
          const timestamp = payment.updated_at || payment.created_at;
          const virtualId = `payment-${payment.id}`;
          const isRead = readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false);
          const staffName = payment.staff_name || 'Staff';
          allNotifications.push({
            id: virtualId,
            type: 'payment_status',
            title: isPending
              ? `Payment Request from ${staffName}`
              : `Payment ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)} — ${staffName}`,
            message: `₦${(payment.amount || 0).toLocaleString()} via ${payment.payment_method || 'N/A'} — ${payment.status}${payment.comment ? ': ' + payment.comment : ''}`,
            status: payment.status,
            amount: payment.amount,
            timestamp,
            category: 'payments',
            is_read: isRead,
          });
        }
      });
    } else {
      // Staff/Sales: only their own payments
      const { data: payments } = await supabaseAdmin
        .from('staff_payments')
        .select('id, amount, status, created_at, updated_at, comment, staff_id')
        .or(`staff_id.eq.${userId},reviewer_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(20);

      (payments || []).forEach((payment: any) => {
        const timestamp = payment.updated_at || payment.created_at;
        const virtualId = `payment-${payment.id}`;
        const isRead = readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false);
        allNotifications.push({
          id: virtualId,
          type: 'payment_status',
          title: `Payment ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}`,
          message: `₦${(payment.amount || 0).toLocaleString()} payment ${payment.status}${payment.comment ? ': ' + payment.comment : ''}`,
          status: payment.status,
          amount: payment.amount,
          timestamp,
          category: 'payments',
          is_read: isRead,
        });
      });
    }

    // ────────────────────────────────────────────────────
    // 3. RETURNED ITEMS virtual notifications
    // ────────────────────────────────────────────────────

    if (isAdminRole(userRole)) {
      // Admin: see ALL returned items
      const { data: allReturns } = await supabaseAdmin
        .from('returned_items')
        .select(`
          id, quantity, status, created_at, updated_at,
          item:item_id(name),
          requester:requester_staff_id(full_name),
          receiver:receiver_staff_id(full_name)
        `)
        .order('updated_at', { ascending: false })
        .limit(30);

      (allReturns || []).forEach((ret: any) => {
        const isRecent = ret.updated_at && new Date(ret.updated_at) > new Date(fortyEightHoursAgo);
        const isPending = ret.status === 'pending';

        if (isPending || isRecent) {
          const timestamp = ret.updated_at || ret.created_at;
          const virtualId = `return-${ret.id}`;
          const isRead = readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false);
          const requester = ret.requester?.full_name || 'Staff';
          const receiver = ret.receiver?.full_name || 'Sales';
          const statusText = ret.status === 'accepted' ? 'Accepted' : ret.status === 'rejected' ? 'Rejected' : 'Pending';

          allNotifications.push({
            id: virtualId,
            type: 'return_status',
            title: `Return ${statusText}: ${requester} → ${receiver}`,
            message: `${ret.quantity}x ${ret.item?.name || 'Item'} — ${requester} returned to ${receiver} (${statusText.toLowerCase()})`,
            status: ret.status,
            timestamp,
            category: 'returns',
            is_read: isRead,
          });
        }
      });
    } else {
      // Staff/Sales: returns they're involved in
      const { data: myReturns } = await supabaseAdmin
        .from('returned_items')
        .select(`
          id, quantity, status, created_at, updated_at,
          item:item_id(name),
          requester:requester_staff_id(full_name),
          receiver:receiver_staff_id(full_name)
        `)
        .or(`requester_staff_id.eq.${userId},receiver_staff_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(20);

      (myReturns || []).forEach((ret: any) => {
        const isRecent = ret.updated_at && new Date(ret.updated_at) > new Date(fortyEightHoursAgo);
        const isPending = ret.status === 'pending';

        if (isPending || isRecent) {
          const timestamp = ret.updated_at || ret.created_at;
          const virtualId = `return-${ret.id}`;
          const isRead = readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false);
          const isRequester = ret.requester_staff_id === userId;
          const otherParty = isRequester ? (ret.receiver?.full_name || 'Sales') : (ret.requester?.full_name || 'Staff');
          const statusText = ret.status === 'accepted' ? 'Accepted' : ret.status === 'rejected' ? 'Rejected' : 'Pending';

          allNotifications.push({
            id: virtualId,
            type: 'return_status',
            title: isRequester
              ? `Return ${statusText} — sent to ${otherParty}`
              : `Return ${statusText} — from ${otherParty}`,
            message: `${ret.quantity}x ${ret.item?.name || 'Item'} return ${statusText.toLowerCase()}`,
            status: ret.status,
            timestamp,
            category: 'returns',
            is_read: isRead,
          });
        }
      });
    }

    // ────────────────────────────────────────────────────
    // 4. SYSTEM (DB) notifications — mapped to proper categories
    //    Excludes virtual_read_marker records (used for tracking individual read state)
    // ────────────────────────────────────────────────────
    const { data: systemNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .neq('type', 'virtual_read_marker')
      .order('created_at', { ascending: false })
      .limit(50);

    (systemNotifications || []).forEach((notification: any) => {
      const type = notification.type || 'system';
      allNotifications.push({
        id: notification.id,
        type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.created_at,
        category: getNotificationCategory(type),
        is_read: notification.is_read || false,
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
 * Mark ALL notifications as read (bulk operation) — MUST be before :id/read route
 * - Marks all system notifications (in DB) as read
 * - Updates last_notifications_read_at on users table so virtual notifications are marked read too
 * - Cleans up notification_reads since they're now covered by the timestamp
 */
router.put('/notifications/mark-all-read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date().toISOString();

    // 1. Mark all system notifications as read in DB (exclude markers)
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('user_id', userId)
      .eq('is_read', false)
      .neq('type', 'virtual_read_marker');

    // 2. Update last_notifications_read_at on users table for virtual notifications
    try {
      await supabaseAdmin
        .from('users')
        .update({ last_notifications_read_at: now })
        .eq('id', userId);
    } catch {
      // Column may not exist yet — migration pending
    }

    // 3. Clean up virtual_read_marker records (now covered by the timestamp)
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('type', 'virtual_read_marker');

    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Mark single notification as read
 */
router.put('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Virtual notification (posted-item-*, payment-*, return-*)
    if (id.startsWith('posted-item-') || id.startsWith('payment-') || id.startsWith('return-')) {
      // Check if marker already exists
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'virtual_read_marker')
        .eq('title', id)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'virtual_read_marker',
            title: id,
            message: '',
            is_read: true,
          });
      }
      return res.json({ message: 'Notification marked as read' });
    }

    // DB notification (UUID)
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

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
    const lastReadAt = await getLastReadAt(userId);

    let unreadCount = 0;

    // Count unread system notifications (exclude virtual_read_markers)
    const { count: systemCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .neq('type', 'virtual_read_marker');

    unreadCount += systemCount || 0;

    // Count pending posted items newer than lastReadAt
    if (userRole.includes('staff') || userRole.includes('commission')) {
      let query = supabaseAdmin
        .from('posted_items')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('status', 'pending');
      if (lastReadAt) query = query.gt('created_at', lastReadAt);
      const { count } = await query;
      unreadCount += count || 0;
    }

    if (isAdminRole(userRole)) {
      // Admin: count ALL pending posted items newer than lastReadAt
      let postedQuery = supabaseAdmin
        .from('posted_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (lastReadAt) postedQuery = postedQuery.gt('created_at', lastReadAt);
      const { count: postedCount } = await postedQuery;
      unreadCount += postedCount || 0;

      // Admin: count ALL pending payments newer than lastReadAt
      let paymentQuery = supabaseAdmin
        .from('staff_payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (lastReadAt) paymentQuery = paymentQuery.gt('created_at', lastReadAt);
      const { count: paymentCount } = await paymentQuery;
      unreadCount += paymentCount || 0;

      // Admin: count ALL pending returns newer than lastReadAt
      let returnQuery = supabaseAdmin
        .from('returned_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (lastReadAt) returnQuery = returnQuery.gt('created_at', lastReadAt);
      const { count: returnCount } = await returnQuery;
      unreadCount += returnCount || 0;
    } else {
      // Staff/Sales: count their own pending payments
      let paymentQuery = supabaseAdmin
        .from('staff_payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .or(`staff_id.eq.${userId},reviewer_id.eq.${userId}`);
      if (lastReadAt) paymentQuery = paymentQuery.gt('created_at', lastReadAt);
      const { count: paymentCount } = await paymentQuery;
      unreadCount += paymentCount || 0;

      // Staff/Sales: count their own pending returns
      let returnQuery = supabaseAdmin
        .from('returned_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .or(`requester_staff_id.eq.${userId},receiver_staff_id.eq.${userId}`);
      if (lastReadAt) returnQuery = returnQuery.gt('created_at', lastReadAt);
      const { count: returnCount } = await returnQuery;
      unreadCount += returnCount || 0;
    }

    res.json({ unread_count: unreadCount });
  } catch (error: any) {
    console.error('Error fetching unread notification count:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
