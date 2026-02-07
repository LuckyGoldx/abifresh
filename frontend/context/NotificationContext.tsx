'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

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

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setIsLoading(true);
      const response = await api.get('/api/notifications');
      setNotifications(response.data || []);
      
      // Count unread
      const unread = (response.data || []).filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      // Only mark system notifications as read (they have a real read status)
      if (id.startsWith('posted-item-') || id.startsWith('payment-')) {
        // For posted items and payments, we don't mark as read in DB
        // Just update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        // Recalculate unread count
        setNotifications((prev) => {
          const unread = prev.filter((n) => !n.is_read).length;
          setUnreadCount(unread);
          return prev;
        });
        return;
      }

      // For system notifications, mark as read in DB
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        // Recalculate unread count after update
        const unread = updated.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Mark all system notifications as read in DB
      const systemNotifications = notifications.filter(n => !n.id.startsWith('posted-item-') && !n.id.startsWith('payment-'));
      
      for (const notification of systemNotifications) {
        if (!notification.is_read) {
          try {
            await api.put(`/api/notifications/${notification.id}/read`);
          } catch (error) {
            console.error(`Failed to mark notification ${notification.id} as read:`, error);
          }
        }
      }

      // Mark all as read in local state
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, read: true }));
        setUnreadCount(0);
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [notifications]);

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetchNotifications();

    // Poll for new notifications every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
