'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from 'sonner';
import api from '@/lib/api';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/payments/pending-count');
      setPendingPaymentsCount(res.data.count || 0);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const checkHydration = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          setHydrated(true);
        }
      }
    };
    checkHydration();
    const timer = setTimeout(() => setHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated && (!isAuthenticated || user?.role !== 'superadmin')) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, user, router]);

  // Fetch pending payments count and poll every 30 seconds
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [hydrated, isAuthenticated, fetchPendingCount]);

  if (!mounted || !hydrated || !isAuthenticated || user?.role !== 'superadmin') {
    return null;
  }

  const menuItems = [
    // Superadmin Overview
    { label: 'Dashboard', href: '/superadmin/dashboard', icon: '🏠' },
    
    // All Admin Features
    { label: 'Staff Management', href: '/superadmin/staff', icon: '👥' },
    { label: 'Staff Stores', href: '/superadmin/staff-stores', icon: '🏪' },
    { label: 'Post Items', href: '/superadmin/post-items', icon: '📮' },
    { label: 'Inventory', href: '/superadmin/inventory', icon: '📦' },
    { label: 'Restock Orders', href: '/superadmin/orders', icon: '🛒' },
    { label: 'Payments', href: '/superadmin/payments', icon: '💳', badge: pendingPaymentsCount },
    { label: 'Receipts', href: '/superadmin/receipts', icon: '📄' },
    { label: 'Commissions', href: '/superadmin/commissions', icon: '💵' },
    { label: 'Expenses Tracker', href: '/superadmin/expenses', icon: '📋' },
    { label: 'My Expenses', href: '/superadmin/my-expenses', icon: '💰' },
    { label: 'Reports', href: '/superadmin/reports', icon: '📈' },
    { label: 'Items', href: '/superadmin/items', icon: '🛍️' },
    
    // Superadmin Exclusive
    { label: 'User Management', href: '/superadmin/users', icon: '🔐' },
    { label: 'Audit Logs', href: '/superadmin/audit-logs', icon: '📜' },
    { label: 'Server Logs', href: '/superadmin/logs', icon: '🖥️' },
    { label: 'System Health', href: '/superadmin/system-health', icon: '💓' },
    { label: 'Notifications', href: '/superadmin/notifications', icon: '🔔' },
    { label: 'Backup', href: '/superadmin/backup', icon: '💾' },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
        <Sidebar menuItems={menuItems} role="superadmin" isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
