'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';

interface MenuItemWithBadge {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingPostedItemsCount, setPendingPostedItemsCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Wait for Zustand hydration by checking if we have user data
    const checkHydration = () => {
      // Check if auth storage was loaded
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          setHydrated(true);
        }
      }
    };
    checkHydration();
    // Also set hydrated after a small delay to account for async load
    const timer = setTimeout(() => setHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      // Fetch pending posted items count
      const fetchPendingCount = async () => {
        try {
          const response = await api.get('/api/staff/posted-items/pending-count');
          setPendingPostedItemsCount(response.data.count || 0);
        } catch (error) {
          console.error('Failed to fetch pending count:', error);
        }
      };
      fetchPendingCount();
      // Refresh every 15 seconds
      const interval = setInterval(fetchPendingCount, 15000);
      return () => clearInterval(interval);
    }
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    if (hydrated && (!isAuthenticated || !['staff_commission', 'commission_staff', 'staff_non_commission', 'non_commission_staff'].includes(user?.role || ''))) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!mounted || !hydrated || !isAuthenticated || !['staff_commission', 'commission_staff', 'staff_non_commission', 'non_commission_staff'].includes(user?.role || '')) {
    return null;
  }

  const menuItems: MenuItemWithBadge[] = [
    { label: 'Dashboard', href: '/staff/dashboard', icon: '📊' },
    { label: 'Posted Items', href: '/staff/posted-items', icon: '📥', badge: pendingPostedItemsCount > 0 ? pendingPostedItemsCount : undefined },
    { label: 'Make Sale', href: '/staff/make-sale', icon: '🛒' },
    { label: 'Make Payment', href: '/staff/payments', icon: '💳' },
    { label: 'Expenses', href: '/staff/expenses', icon: '💸' },
    { label: 'Notifications', href: '/staff/notifications', icon: '🔔' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
      <Sidebar menuItems={menuItems as any} role={user?.role || 'staff'} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
