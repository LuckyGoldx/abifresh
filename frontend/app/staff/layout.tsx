'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { 
  BarChart3, 
  PackageSearch, 
  ShoppingCart, 
  Undo2, 
  CreditCard, 
  Wallet, 
  FileText, 
  DollarSign, 
  Bell 
} from 'lucide-react';

interface MenuItemWithBadge {
  label: string;
  href: string;
  icon: any;
  badge?: number;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingPostedItemsCount, setPendingPostedItemsCount] = useState(0);
  const [pendingReturnCount, setPendingReturnCount] = useState(0);

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
      // Fetch pending posted items count and pending returns count
      const fetchCounts = async () => {
        try {
          const [postedRes, returnsRes] = await Promise.all([
            api.get('/api/staff/posted-items/pending-count'),
            api.get('/api/staff/returns/stats'),
          ]);
          setPendingPostedItemsCount(postedRes.data.count || 0);
          setPendingReturnCount(returnsRes.data.pending_to_accept || 0);
        } catch (error) {
          console.error('Failed to fetch counts:', error);
        }
      };
      fetchCounts();
      // Refresh every 15 seconds
      const interval = setInterval(fetchCounts, 15000);
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
    { label: 'Dashboard', href: '/staff/dashboard', icon: <BarChart3 size={20} /> },
    { label: 'Posted Items', href: '/staff/posted-items', icon: <PackageSearch size={20} />, badge: pendingPostedItemsCount > 0 ? pendingPostedItemsCount : undefined },
    { label: 'Make Sale', href: '/staff/make-sale', icon: <ShoppingCart size={20} /> },
    { label: 'Return Items', href: '/staff/return-items', icon: <Undo2 size={20} />, badge: pendingReturnCount > 0 ? pendingReturnCount : undefined },
    { label: 'Make Payment', href: '/staff/payments', icon: <CreditCard size={20} /> },
    { label: 'Expenses', href: '/staff/expenses', icon: <Wallet size={20} /> },
    { label: 'Receipts', href: '/staff/receipts', icon: <FileText size={20} /> },
    // Only show Commissions to commission staff
    ...(['staff_commission', 'commission_staff'].includes(user?.role || '') 
      ? [{ label: 'Commissions', href: '/staff/commissions', icon: <DollarSign size={20} /> }]
      : []),
    { label: 'Notifications', href: '/staff/notifications', icon: <Bell size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
      <Sidebar menuItems={menuItems as any} role={user?.role || 'staff'} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <Header />
          <main className="flex-1 min-h-0 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
