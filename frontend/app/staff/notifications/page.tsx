'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import { Bell, CheckCircle, AlertCircle, TrendingUp, CreditCard, MessageSquare, Package } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  type: 'posted_item' | 'payment_approved' | 'payment_rejected' | 'item_request';
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { notifications, isLoading, markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead } = useNotifications();
  const { addToast } = useToast();

  const markAsRead = async (id: string) => {
    try {
      await contextMarkAsRead(id);
      addToast('Notification marked as read', 'success', 2000);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      addToast('Failed to mark notification as read', 'error', 2000);
    }
  };

  const markAllAsReadLocal = async () => {
    try {
      await contextMarkAllAsRead();
      addToast('All notifications marked as read', 'success', 2000);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      addToast('Failed to mark all notifications as read', 'error', 2000);
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'posted_item': return <Package className="w-5 h-5 text-purple-500" />;
      case 'payment_approved': return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'payment_rejected': return <CreditCard className="w-5 h-5 text-red-500" />;
      case 'item_request': return <MessageSquare className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'posted_item': return 'bg-purple-50 dark:bg-purple-900 border-purple-500';
      case 'payment_approved': return 'bg-green-50 dark:bg-green-900 border-green-500';
      case 'payment_rejected': return 'bg-red-50 dark:bg-red-900 border-red-500';
      case 'item_request': return 'bg-blue-50 dark:bg-blue-900 border-blue-500';
      default: return 'bg-gray-50 dark:bg-gray-900 border-gray-500';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '';
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
      case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  const filteredNotifications = filterCategory === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filterCategory);

  const categories = ['all', 'posted_item', 'payment_approved', 'payment_rejected', 'item_request'];
  const categoryCounts = {
    all: notifications.length,
    posted_item: notifications.filter(n => n.type === 'posted_item').length,
    payment_approved: notifications.filter(n => n.type === 'payment_approved').length,
    payment_rejected: notifications.filter(n => n.type === 'payment_rejected').length,
    item_request: notifications.filter(n => n.type === 'item_request').length,
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading notifications...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Bell className="w-8 h-8 text-pink-500" />
          Notifications
        </h1>
        <div className="flex items-center gap-4">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={markAllAsReadLocal}
              className="px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
            >
              Mark all as read
            </button>
          )}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {notifications.filter(n => !n.is_read).length} unread
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const getCategoryLabel = (cat: string) => {
            switch (cat) {
              case 'posted_item': return 'Posted Items';
              case 'payment_approved': return 'Payment Approved';
              case 'payment_rejected': return 'Payment Rejected';
              case 'item_request': return 'Item Request';
              case 'all': return 'All';
              default: return cat;
            }
          };
          return (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition ${
                filterCategory === category
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
              }`}
            >
              {getCategoryLabel(category)}
              <span className="ml-2 text-xs bg-opacity-30 bg-white px-2 py-1 rounded">
                {categoryCounts[category as keyof typeof categoryCounts]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`card border-l-4 ${getCategoryColor(notification.type)}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  {getCategoryIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-lg">{notification.title}</h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-2 break-words">{notification.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {!notification.is_read && !notification.id.startsWith('posted-item-') && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="text-pink-600 hover:text-pink-800 flex items-center gap-1 text-sm flex-shrink-0"
                  title="Mark as read"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="card text-center py-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {filterCategory === 'all' 
              ? 'No notifications yet' 
              : `No ${filterCategory} notifications`}
          </p>
        </div>
      )}
    </div>
  );
}
