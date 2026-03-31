import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

function getNotificationCategory(type: string): string {
  if (['payment_request', 'payment_approved', 'payment_rejected', 'payment_status'].includes(type)) return 'payments';
  if (['posted_items', 'items_posted', 'items_accepted', 'items_rejected', 'posted_item_status'].includes(type)) return 'posted_items';
  if (['returned_items', 'return_request_sent', 'return_accepted', 'return_rejected', 'return_status'].includes(type)) return 'returns';
  return 'system';
}

function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'superadmin';
}

async function getLastReadAt(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.from('users').select('last_notifications_read_at').eq('id', userId).single();
    return data?.last_notifications_read_at || null;
  } catch { return null; }
}

async function getReadVirtualIds(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabaseAdmin.from('notifications').select('title').eq('user_id', userId).eq('type', 'virtual_read_marker');
    return new Set((data || []).map((r: any) => r.title));
  } catch { return new Set(); }
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.id;
  const userRole = authResult.role;
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const lastReadAt = await getLastReadAt(userId);
  const readVirtualIds = await getReadVirtualIds(userId);
  const allNotifications: any[] = [];

  // ── 1. POSTED ITEMS virtual notifications ──
  if (userRole.includes('staff') || userRole.includes('commission')) {
    const { data: receivedItems } = await supabaseAdmin
      .from('posted_items')
      .select('id, quantity, status, created_at, updated_at, item:item_id(name), posted_by:poster_id(full_name)')
      .eq('staff_id', userId)
      .order('updated_at', { ascending: false })
      .limit(30);

    (receivedItems || []).forEach((item: any) => {
      const isRecent = item.updated_at && new Date(item.updated_at) > new Date(fortyEightHoursAgo);
      if (item.status === 'pending' || isRecent) {
        const statusText = item.status === 'accepted' ? 'Accepted' : item.status === 'rejected' ? 'Rejected' : 'Posted';
        const timestamp = item.updated_at || item.created_at;
        const virtualId = `posted-item-${item.id}`;
        allNotifications.push({
          id: virtualId, type: 'posted_item_status',
          title: statusText === 'Posted' ? 'New Items Posted' : `Items ${statusText}`,
          message: `${item.quantity}x ${item.item?.name || 'Item'} ${item.status === 'pending' ? 'awaiting your response' : statusText.toLowerCase()} - from ${item.posted_by?.full_name || 'Sales'}`,
          status: item.status, timestamp, category: 'posted_items',
          is_read: readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false),
        });
      }
    });
  }

  if (userRole.includes('sales')) {
    const { data: postedItems } = await supabaseAdmin
      .from('posted_items')
      .select('id, quantity, status, created_at, updated_at, item:item_id(name), staff:staff_id(full_name)')
      .eq('poster_id', userId)
      .order('updated_at', { ascending: false })
      .limit(30);

    (postedItems || []).forEach((item: any) => {
      const isRecent = item.updated_at && new Date(item.updated_at) > new Date(fortyEightHoursAgo);
      if (item.status === 'pending' || isRecent) {
        const statusText = item.status === 'accepted' ? 'Accepted' : item.status === 'rejected' ? 'Rejected' : 'Pending';
        const timestamp = item.updated_at || item.created_at;
        const virtualId = `posted-item-${item.id}`;
        const isPending = item.status === 'pending';
        allNotifications.push({
          id: virtualId, type: 'posted_item_status',
          title: isPending ? `Items posted to ${item.staff?.full_name || 'Staff'}` : `Items ${statusText} by ${item.staff?.full_name || 'Staff'}`,
          message: `${item.quantity}x ${item.item?.name || 'Item'} ${isPending ? 'posted to' : statusText.toLowerCase() + ' by'} ${item.staff?.full_name || 'Staff'}`,
          status: item.status, timestamp, category: 'posted_items',
          is_read: readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false),
        });
      }
    });
  }

  if (isAdminRole(userRole)) {
    const { data: allPostedItems } = await supabaseAdmin
      .from('posted_items')
      .select('id, quantity, status, created_at, updated_at, item:item_id(name), staff:staff_id(full_name), posted_by:poster_id(full_name)')
      .order('updated_at', { ascending: false })
      .limit(40);

    (allPostedItems || []).forEach((item: any) => {
      const isRecent = item.updated_at && new Date(item.updated_at) > new Date(fortyEightHoursAgo);
      if (item.status === 'pending' || isRecent) {
        const statusText = item.status === 'accepted' ? 'Accepted' : item.status === 'rejected' ? 'Rejected' : 'Pending';
        const timestamp = item.updated_at || item.created_at;
        const virtualId = `posted-item-${item.id}`;
        const isPending = item.status === 'pending';
        const poster = item.posted_by?.full_name || 'Sales';
        const staff = item.staff?.full_name || 'Staff';
        allNotifications.push({
          id: virtualId, type: 'posted_item_status',
          title: isPending ? `Items Posted: ${poster} → ${staff}` : `Items ${statusText}: ${poster} → ${staff}`,
          message: `${item.quantity}x ${item.item?.name || 'Item'} — ${poster} posted to ${staff} (${statusText.toLowerCase()})`,
          status: item.status, timestamp, category: 'posted_items',
          is_read: readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false),
        });
      }
    });
  }

  // ── 2. PAYMENT virtual notifications ──
  if (isAdminRole(userRole)) {
    const { data: allPayments } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, status, created_at, updated_at, notes, staff_id, staff_name, payment_method')
      .order('updated_at', { ascending: false })
      .limit(30);

    (allPayments || []).forEach((payment: any) => {
      const isRecent = payment.updated_at && new Date(payment.updated_at) > new Date(fortyEightHoursAgo);
      const isPending = payment.status === 'pending';
      if (isPending || isRecent) {
        const timestamp = payment.updated_at || payment.created_at;
        const virtualId = `payment-${payment.id}`;
        const staffName = payment.staff_name || 'Staff';
        allNotifications.push({
          id: virtualId, type: 'payment_status',
          title: isPending ? `Payment Request from ${staffName}` : `Payment ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)} — ${staffName}`,
          message: `₦${(payment.amount || 0).toLocaleString()} via ${payment.payment_method || 'N/A'} — ${payment.status}${payment.notes ? ': ' + payment.notes : ''}`,
          status: payment.status, amount: payment.amount, timestamp, category: 'payments',
          is_read: readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false),
        });
      }
    });
  } else {
    const { data: payments } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, status, created_at, updated_at, notes, staff_id')
      .eq('staff_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    (payments || []).forEach((payment: any) => {
      const timestamp = payment.updated_at || payment.created_at;
      const virtualId = `payment-${payment.id}`;
      allNotifications.push({
        id: virtualId, type: 'payment_status',
        title: `Payment ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}`,
        message: `₦${(payment.amount || 0).toLocaleString()} payment ${payment.status}${payment.notes ? ': ' + payment.notes : ''}`,
        status: payment.status, amount: payment.amount, timestamp, category: 'payments',
        is_read: readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false),
      });
    });
  }

  // ── 3. RETURNED ITEMS virtual notifications ──
  if (isAdminRole(userRole)) {
    const { data: allReturns } = await supabaseAdmin
      .from('returned_items')
      .select('id, quantity, status, created_at, updated_at, item:item_id(name), requester:requester_staff_id(full_name), receiver:receiver_staff_id(full_name)')
      .order('updated_at', { ascending: false })
      .limit(30);

    (allReturns || []).forEach((ret: any) => {
      const isRecent = ret.updated_at && new Date(ret.updated_at) > new Date(fortyEightHoursAgo);
      if (ret.status === 'pending' || isRecent) {
        const timestamp = ret.updated_at || ret.created_at;
        const virtualId = `return-${ret.id}`;
        const statusText = ret.status === 'accepted' ? 'Accepted' : ret.status === 'rejected' ? 'Rejected' : 'Pending';
        const requester = ret.requester?.full_name || 'Staff';
        const receiver = ret.receiver?.full_name || 'Sales';
        allNotifications.push({
          id: virtualId, type: 'return_status',
          title: `Return ${statusText}: ${requester} → ${receiver}`,
          message: `${ret.quantity}x ${ret.item?.name || 'Item'} — ${requester} returned to ${receiver} (${statusText.toLowerCase()})`,
          status: ret.status, timestamp, category: 'returns',
          is_read: readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false),
        });
      }
    });
  } else {
    const { data: myReturns } = await supabaseAdmin
      .from('returned_items')
      .select('id, quantity, status, created_at, updated_at, item:item_id(name), requester:requester_staff_id(full_name), receiver:receiver_staff_id(full_name)')
      .or(`requester_staff_id.eq.${userId},receiver_staff_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(20);

    (myReturns || []).forEach((ret: any) => {
      const isRecent = ret.updated_at && new Date(ret.updated_at) > new Date(fortyEightHoursAgo);
      if (ret.status === 'pending' || isRecent) {
        const timestamp = ret.updated_at || ret.created_at;
        const virtualId = `return-${ret.id}`;
        const isRequester = ret.requester?.full_name !== undefined;
        const statusText = ret.status === 'accepted' ? 'Accepted' : ret.status === 'rejected' ? 'Rejected' : 'Pending';
        allNotifications.push({
          id: virtualId, type: 'return_status',
          title: `Return ${statusText}`,
          message: `${ret.quantity}x ${ret.item?.name || 'Item'} return ${statusText.toLowerCase()}`,
          status: ret.status, timestamp, category: 'returns',
          is_read: readVirtualIds.has(virtualId) || (lastReadAt ? new Date(timestamp) <= new Date(lastReadAt) : false),
        });
      }
    });
  }

  // ── 4. SYSTEM (DB) notifications ──
  const { data: systemNotifications } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .neq('type', 'virtual_read_marker')
    .order('created_at', { ascending: false })
    .limit(50);

  (systemNotifications || []).forEach((n: any) => {
    allNotifications.push({
      id: n.id, type: n.type || 'system',
      title: n.title, message: n.message,
      timestamp: n.created_at,
      category: getNotificationCategory(n.type || 'system'),
      is_read: n.is_read || false,
    });
  });

  allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return NextResponse.json(allNotifications);
}
