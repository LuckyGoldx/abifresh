'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  status?: string;
  amount?: number;
  timestamp: string;
  is_read: boolean;
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
  const fetchInProgress = useRef(false);

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    if (fetchInProgress.current) return;

    try {
      fetchInProgress.current = true;
      setIsLoading(true);
      const response = await api.get('/api/notifications');
      const data: Notification[] = response.data || [];
      setNotifications(data);
      
      // Count unread using is_read field
      const unread = data.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, [isAuthenticated, user]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      // Always call the backend — it handles both virtual and DB notifications
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(updated.filter((n) => !n.is_read).length);
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read — uses bulk endpoint
  const markAllAsRead = useCallback(async () => {
    try {
      // Call bulk mark-all-read endpoint (marks DB notifications + sets last_notifications_read_at)
      await api.put('/api/notifications/mark-all-read');

      // Update local state immediately
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

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
