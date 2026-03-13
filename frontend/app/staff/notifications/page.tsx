'use client';

import { useState } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import { Bell, CheckCircle, CreditCard, Package, RotateCcw } from 'lucide-react';

export default function NotificationsPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { notifications, unreadCount, isLoading, markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead } = useNotifications();
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'posted_items': return <Package className="w-5 h-5 text-purple-500" />;
      case 'payments': return <CreditCard className="w-5 h-5 text-blue-500" />;
      case 'returns': return <RotateCcw className="w-5 h-5 text-green-500" />;
      case 'system': return <Bell className="w-5 h-5 text-orange-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'posted_items': return 'bg-purple-50 dark:bg-purple-900/30 border-purple-500';
      case 'payments': return 'bg-blue-50 dark:bg-blue-900/30 border-blue-500';
      case 'returns': return 'bg-green-50 dark:bg-green-900/30 border-green-500';
      case 'system': return 'bg-orange-50 dark:bg-orange-900/30 border-orange-500';
      default: return 'bg-gray-50 dark:bg-gray-900/30 border-gray-500';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '';
    switch (status) {
      case 'accepted': case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  const filteredNotifications = filterCategory === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === filterCategory);

  const categories = ['all', 'posted_items', 'payments', 'returns', 'system'];

  const getCategoryLabel = (cat: string): string => {
    switch (cat) {
      case 'posted_items': return 'Posted Items';
      case 'payments': return 'Payments';
      case 'returns': return 'Returns';
      case 'system': return 'System';
      case 'all': return 'All';
      default: return cat;
    }
  };

  const getCategoryCount = (cat: string): number => {
    if (cat === 'all') return notifications.length;
    return notifications.filter(n => n.category === cat).length;
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading notifications...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Bell className="w-8 h-8 text-pink-500" />
          Notifications
        </h1>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsReadLocal}
              className="px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
            >
              Mark all as read
            </button>
          )}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {unreadCount} unread
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
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
              {getCategoryCount(category)}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => !notification.is_read && markAsRead(notification.id)}
            className={`card border-l-4 ${getCategoryColor(notification.category)} ${
              !notification.is_read ? 'ring-1 ring-pink-200 dark:ring-pink-800 cursor-pointer' : 'opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  {getCategoryIcon(notification.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className={`font-bold text-lg ${!notification.is_read ? '' : 'text-gray-500'}`}>
                      {notification.title}
                    </h3>
                    {notification.status && (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(notification.status)}`}>
                        {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                      </span>
                    )}
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-pink-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-2 break-words">{notification.message}</p>
                  {notification.amount && (
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      ₦{notification.amount.toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              {!notification.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
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
              : `No ${getCategoryLabel(filterCategory).toLowerCase()} notifications`}
          </p>
        </div>
      )}
    </div>
  );
}
