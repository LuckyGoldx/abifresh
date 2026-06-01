'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, CheckCircle, AlertCircle, X, CreditCard, Package, RotateCcw, ChevronRight } from 'lucide-react';
import { formatTimestamp } from '@/lib/format-quantity';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsDrawer({ isOpen, onClose }: NotificationsDrawerProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [drawerLoading, setDrawerLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  const MAX_VISIBLE = 30;

  // Refresh notifications when drawer opens
  useEffect(() => {
    if (isOpen) {
      setFilterCategory('all');
      setDrawerLoading(true);
      fetchNotifications().finally(() => setDrawerLoading(false));
    }
  }, [isOpen, fetchNotifications]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'posted_items': return <Package className="w-4 h-4 text-purple-500" />;
      case 'payments': return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'returns': return <RotateCcw className="w-4 h-4 text-green-500" />;
      case 'system': return <Bell className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'posted_items': return 'bg-purple-50 dark:bg-purple-900/30 border-l-purple-500';
      case 'payments': return 'bg-blue-50 dark:bg-blue-900/30 border-l-blue-500';
      case 'returns': return 'bg-green-50 dark:bg-green-900/30 border-l-green-500';
      case 'system': return 'bg-orange-50 dark:bg-orange-900/30 border-l-orange-500';
      default: return 'bg-gray-50 dark:bg-gray-900/30 border-l-gray-500';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '';
    switch (status) {
      case 'accepted': case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredNotifications = filterCategory === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === filterCategory);

  const displayedNotifications = filteredNotifications.slice(0, MAX_VISIBLE);
  const totalFiltered = filteredNotifications.length;
  const hasMore = totalFiltered > MAX_VISIBLE;

  const notificationsHref = (() => {
    const role = user?.role || '';
    if (role === 'superadmin') return '/superadmin/notifications';
    if (role === 'admin') return '/admin/notifications';
    if (role === 'sales' || role === 'sales_staff') return '/sales/notifications';
    return '/staff/notifications';
  })();

  const categories = ['all', 'posted_items', 'payments', 'returns', 'system'];
  const getCategoryLabel = (cat: string): string => {
    switch (cat) {
      case 'posted_items': return 'Posted';
      case 'payments': return 'Payments';
      case 'returns': return 'Returns';
      case 'system': return 'System';
      case 'all': return 'All';
      default: return cat;
    }
  };

  const getCategoryCount = (cat: string): number => {
    if (cat === 'all') return notifications.filter(n => !n.is_read).length;
    return notifications.filter(n => n.category === cat && !n.is_read).length;
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-screen w-96 bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 z-50 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-pink-500" />
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs px-2 py-1 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900 rounded transition"
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => {
              const count = getCategoryCount(category);
              return (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition text-sm flex items-center gap-1 ${
                    filterCategory === category
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {getCategoryLabel(category)}
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      filterCategory === category
                        ? 'bg-pink-500 text-white'
                        : 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List */}
        {drawerLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-bold text-pink-600 dark:text-pink-400">Abifreshing...</span>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-2 p-4">
            {displayedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border-l-4 ${getCategoryColor(notification.category)} ${
                  !notification.is_read ? 'ring-1 ring-pink-200 dark:ring-pink-800' : 'opacity-80'
                } hover:shadow-md transition cursor-pointer`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex-shrink-0">
                    {getCategoryIcon(notification.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className={`font-semibold text-sm ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {notification.title}
                      </h3>
                      {notification.status && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(notification.status)}`}>
                          {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                        </span>
                      )}
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 break-words">
                      {notification.message}
                    </p>
                    {notification.amount && (
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        ₦{notification.amount.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="sticky bottom-0 pt-2 bg-gradient-to-t from-white dark:from-slate-800 via-white/95 dark:via-slate-800/95 to-transparent">
                <Link
                  href={notificationsHref}
                  onClick={onClose}
                  className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white font-bold rounded-xl shadow-lg shadow-pink-200/50 dark:shadow-none transition-all duration-200 group"
                >
                  <span>View All Notifications</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {totalFiltered - MAX_VISIBLE}+ more
                  </span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400 px-4">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </>
  );
}
