'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import api from '@/lib/api';
import { Bell, CheckCircle, AlertCircle, X, CreditCard, Package } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  status?: string;
  amount?: number;
  timestamp: string;
  read?: boolean;
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsDrawer({ isOpen, onClose }: NotificationsDrawerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { fetchNotifications: refreshGlobalNotifications, markAsRead: globalMarkAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/notifications');
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Update local state first
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      
      // Update global context (handles DB update for system notifications)
      await globalMarkAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'posted_items': return <Package className="w-4 h-4 text-purple-500" />;
      case 'payments': return <CreditCard className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'posted_items': return 'bg-purple-50 dark:bg-purple-900';
      case 'payments': return 'bg-blue-50 dark:bg-blue-900';
      case 'system': return 'bg-orange-50 dark:bg-orange-900';
      default: return 'bg-gray-50 dark:bg-gray-900';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '';
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredNotifications = filterCategory === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === filterCategory);

  const categories = ['all', 'posted_items', 'payments', 'system'];

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
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-pink-500" />
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="text-xs px-2 py-1 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900 rounded transition"
                title="Mark all as read"
              >
                Mark all
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
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition text-sm ${
                  filterCategory === category
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                }`}
              >
                {category === 'posted_items' && 'Posted'}
                {category === 'payments' && 'Payments'}
                {category === 'system' && 'System'}
                {category === 'all' && 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Loading...
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-2 p-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border-l-4 ${getCategoryColor(notification.category)} hover:shadow-md transition cursor-pointer`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex-shrink-0">
                    {getCategoryIcon(notification.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      {notification.status && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(notification.status)}`}>
                          {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                        </span>
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
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && notification.id.startsWith('posted-item-') === false && (
                    <CheckCircle className="w-4 h-4 text-pink-600 flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
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
