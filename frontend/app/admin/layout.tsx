'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useNotifications } from '@/context/NotificationContext';
import { Toaster } from 'sonner';
import api from '@/lib/api';
import { 
  LayoutDashboard, 
  Bell, 
  Store, 
  Send, 
  Package, 
  CreditCard, 
  FileText, 
  DollarSign, 
  BarChart3, 
  ShoppingBag, 
  ShoppingCart, 
  Users,
  PlusCircle,
  History,
  RefreshCcw,
  ClipboardList,
  Undo2,
  TrendingUp
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creditMode, setCreditMode] = useState(false);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [pendingCreditRemittanceCount, setPendingCreditRemittanceCount] = useState(0);
  const [unreadCreditNotificationsCount, setUnreadCreditNotificationsCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);

  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  
  // Calculate badges for the toggle button
  const mainBadge = unreadCount;
  const creditBadge = unreadCreditNotificationsCount;

  useEffect(() => {
    const creditRoutes = [
      '/admin/credits',
      '/admin/give-credit',
      '/admin/manage-creditors',
      '/admin/manage-credits',
      '/admin/credit-store',
      '/admin/credit-history',
      '/admin/credit-receipts',
      '/admin/credit-notifications',
      '/admin/credit-payments',
      '/admin/credit-reports'
    ];
    if (creditRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      setCreditMode(true);
    } else {
      setCreditMode(false);
    }
  }, [pathname]);

  const fetchData = useCallback(async () => {
    try {
      const [payRes, creditPayRes, notifRes, expRes] = await Promise.all([
        api.get('/api/admin/payments/pending-count'),
        api.get('/api/credits/payments/pending-count'),
        api.get('/api/notifications'),
        api.get('/api/admin/expenses')
      ]);

      setPendingPaymentsCount(payRes.data.count || 0);
      setPendingCreditRemittanceCount(creditPayRes.data.count || 0);

      const pendingExpenses = (expRes.data || []).filter((e: any) => {
        const role = e.staff_role?.toLowerCase() || '';
        return e.status === 'pending' && role !== 'admin' && role !== 'superadmin';
      }).length;
      setPendingExpensesCount(pendingExpenses);

      const CREDIT_NOTIFICATION_TYPES = [
        'credit_item_returned',
        'credit_return_confirmation',
        'creditor_added',
        'creditor_added_confirmation',
        'credit_given',
        'credit_given_confirmation',
        'credit_payment',
        'credit_payment_confirmation',
        'credit_cancelled',
        'credit_cancel_confirmation'
      ];

      const rawNotifs = notifRes.data;
      const notifArray = Array.isArray(rawNotifs) ? rawNotifs : (rawNotifs?.data || []);
      const unreadCreditCount = notifArray.filter((n: any) => 
        !n.is_read && CREDIT_NOTIFICATION_TYPES.includes(n.type)
      ).length;
      setUnreadCreditNotificationsCount(unreadCreditCount);

    } catch {
      // silently ignore
    }
  }, []);

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

  // Fetch pending payments count and poll every 30 seconds
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [hydrated, isAuthenticated, fetchData]);

  if (!mounted || !hydrated || !isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
    return null;
  }

  const menuItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Notifications', href: '/admin/notifications', icon: <Bell size={20} /> },
    { label: 'Staff Stores', href: '/admin/staff-stores', icon: <Store size={20} /> },
    { label: 'Post Items', href: '/admin/post-items', icon: <Send size={20} /> },
    { label: 'Inventory', href: '/admin/inventory', icon: <Package size={20} /> },
    { label: 'Returned Items', href: '/admin/returned-items', icon: <Undo2 size={20} /> },
    { label: 'Payments', href: '/admin/payments', icon: <CreditCard size={20} />, badge: pendingPaymentsCount },
    { label: 'Receipts', href: '/admin/receipts', icon: <FileText size={20} /> },
    { label: 'Commissions', href: '/admin/commissions', icon: <DollarSign size={20} /> },
    { label: 'Expenses Tracker', href: '/admin/expenses', icon: <ClipboardList size={20} />, badge: pendingExpensesCount > 0 ? pendingExpensesCount : undefined },
    { label: 'My Expenses', href: '/admin/my-expenses', icon: <DollarSign size={20} /> },
    { label: 'Reports', href: '/admin/reports', icon: <BarChart3 size={20} /> },
    { label: 'Sales Analysis', href: '/admin/sales-analysis', icon: <TrendingUp size={20} /> },
    { label: 'Items', href: '/admin/items', icon: <ShoppingBag size={20} /> },
    { label: 'Restock Orders', href: '/admin/orders', icon: <ShoppingCart size={20} /> },
    { label: 'Staff Management', href: '/admin/staff', icon: <Users size={20} /> },
  ];

  const creditMenuItems = [
    { label: 'Overview', href: '/admin/credits', icon: <BarChart3 size={20} /> },
    { label: 'Give Credit', href: '/admin/give-credit', icon: <PlusCircle size={20} /> },
    { label: 'Manage Creditors', href: '/admin/manage-creditors', icon: <Users size={20} /> },
    { label: 'Manage Credits', href: '/admin/manage-credits', icon: <Store size={20} /> },
    { label: 'Credit Store', href: '/admin/credit-store', icon: <Package size={20} /> },
    { label: 'Credit Payments', href: '/admin/credit-payments', icon: <DollarSign size={20} />, badge: pendingCreditRemittanceCount > 0 ? pendingCreditRemittanceCount : undefined },
    { label: 'Credit History', href: '/admin/credit-history', icon: <History size={20} /> },
    { label: 'Credit Notifications', href: '/admin/credit-notifications', icon: <Bell size={20} />, badge: unreadCreditNotificationsCount > 0 ? unreadCreditNotificationsCount : undefined },
    { label: 'Credit Receipts', href: '/admin/credit-receipts', icon: <FileText size={20} /> },
    { label: 'Credit Reports', href: '/admin/credit-reports', icon: <BarChart3 size={20} /> },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
        <Sidebar 
          menuItems={menuItems} 
          creditMenuItems={creditMenuItems}
          role="admin" 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
          creditMode={creditMode}
          onToggleCreditMode={() => {
            if (creditMode) {
              router.push('/admin/dashboard');
            } else {
              router.push('/admin/credits');
            }
          }}
          mainBadge={mainBadge}
          creditBadge={creditBadge}
        />
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
