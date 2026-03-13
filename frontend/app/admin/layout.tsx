'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from 'sonner';

// Ensure routes are not statically generated since they require authentication
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    if (hydrated && (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin'))) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!mounted || !hydrated || !isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
    return null;
  }

  const menuItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { label: 'Staff Management', href: '/admin/staff', icon: '👥' },
    { label: 'Staff Stores', href: '/admin/staff-stores', icon: '🏪' },
    { label: 'Post Items', href: '/admin/post-items', icon: '📮' },
    { label: 'Inventory', href: '/admin/inventory', icon: '📦' },
    { label: 'Restock Orders', href: '/admin/orders', icon: '🛒' },
    { label: 'Payments', href: '/admin/payments', icon: '💳' },
    { label: 'Receipts', href: '/admin/receipts', icon: '📄' },
    { label: 'Commissions', href: '/admin/commissions', icon: '💵' },
    { label: 'Expenses Tracker', href: '/admin/expenses', icon: '📋' },
    { label: 'My Expenses', href: '/admin/my-expenses', icon: '💰' },
    { label: 'Reports', href: '/admin/reports', icon: '📈' },
    { label: 'Items', href: '/admin/items', icon: '🛍️' },
    { label: 'Notifications', href: '/admin/notifications', icon: '🔔' },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
        <Sidebar menuItems={menuItems} role="admin" isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
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
