'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Core fetch function - no memoization to avoid stale closures
  const performFetch = async () => {
    if (!isAuthenticated || !user) return;

    try {
      setIsLoading(true);
      console.log('[Notifications] Fetching notifications...');
      const response = await api.get('/api/notifications');
      const data: Notification[] = response.data || [];
      console.log('[Notifications] Fetched', data.length, 'notifications');
      setNotifications(data);
      
      // Count unread using is_read field
      const unread = data.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('[Notifications] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced fetch for realtime updates (prevents too many simultaneous requests)
  const debouncedFetch = useCallback(() => {
    // Clear existing timeout
    if (realtimeDebounceRef.current) {
      clearTimeout(realtimeDebounceRef.current);
    }

    // Set new timeout - fetch after 300ms of no updates
    realtimeDebounceRef.current = setTimeout(() => {
      console.log('[Realtime] Debounce triggered - fetching notifications');
      performFetch();
    }, 300);
  }, []);

  // Fetchable function for external calls
  const fetchNotifications = useCallback(() => {
    return performFetch();
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

  // Fetch notifications on mount and set up real-time subscription or polling
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Initial fetch
    performFetch();

    // If Supabase is configured, use real-time subscription
    if (isSupabaseConfigured && supabase) {
      console.log('[Notifications] Setting up real-time subscription');
      
      // Listen to changes on multiple tables that trigger notifications
      const handleChange = () => {
        console.log('[Realtime] Data changed - triggering debounced fetch');
        debouncedFetch();
      };

      const channels = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posted_items',
          },
          handleChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'staff_payments',
          },
          handleChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'returned_items',
          },
          handleChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          handleChange
        )
        .subscribe((status) => {
          console.log('[Realtime] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Connected to real-time updates');
          }
        });

      return () => {
        console.log('[Notifications] Cleaning up subscription');
        supabase.removeChannel(channels);
        if (realtimeDebounceRef.current) {
          clearTimeout(realtimeDebounceRef.current);
        }
      };
    } else {
      // Fall back to polling every 10 seconds if Supabase is not configured
      console.log('[Notifications] Using polling (Supabase not configured)');
      const interval = setInterval(() => {
        console.log('[Polling] Fetching notifications...');
        performFetch();
      }, 10000);
      return () => {
        clearInterval(interval);
        if (realtimeDebounceRef.current) {
          clearTimeout(realtimeDebounceRef.current);
        }
      };
    }
  }, [isAuthenticated, user]);

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
