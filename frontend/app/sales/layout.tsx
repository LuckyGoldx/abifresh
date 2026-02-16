'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
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
    if (hydrated && (!isAuthenticated || !['sales', 'sales_staff'].includes(user?.role || ''))) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!mounted || !hydrated || !isAuthenticated || !['sales', 'sales_staff'].includes(user?.role || '')) {
    return null;
  }

  const menuItems = [
    { label: 'Dashboard', href: '/sales/dashboard', icon: '📊' },
    { label: 'Make Sale', href: '/sales/make-sale', icon: '💰' },
    { label: 'Available Items', href: '/sales/items', icon: '✅' },
    { label: 'Unavailable Items', href: '/sales/unavailable', icon: '❌' },
    { label: 'Post Items', href: '/sales/post-items', icon: '📤' },
    { label: 'Make Payment', href: '/sales/payments', icon: '💳' },
    { label: 'Expenses', href: '/sales/expenses', icon: '💸' },
    { label: 'Receipts', href: '/sales/receipts', icon: '🧾' },
    { label: 'Notifications', href: '/sales/notifications', icon: '🔔' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
      <Sidebar menuItems={menuItems} role="sales" isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
