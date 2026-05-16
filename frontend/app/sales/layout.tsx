'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useNotifications } from '@/context/NotificationContext';
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
  CheckCircle2,
  RefreshCcw,
  ClipboardList,
  CheckCircle,
  XCircle,
  Upload,
  Undo2,
  Receipt,
  Wallet
} from 'lucide-react';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creditMode, setCreditMode] = useState(false);
  const [pendingReturnedItemsCount, setPendingReturnedItemsCount] = useState(0);
  const [unreadCreditNotificationsCount, setUnreadCreditNotificationsCount] = useState(0);
  
  // Calculate badges for the toggle button
  const mainBadge = unreadCount;
  const creditBadge = unreadCreditNotificationsCount;

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
    if (hydrated && (!isAuthenticated || !['sales', 'sales_staff', 'admin', 'superadmin'].includes(user?.role || ''))) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, user, router]);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      // Fetch pending returned items count
      const fetchData = async () => {
        try {
          const [retRes, notifRes] = await Promise.all([
            api.get('/api/sales/returned-items'),
            api.get('/api/notifications')
          ]);

          const pendingCount = retRes.data.filter((item: any) => item.status === 'pending').length;
          setPendingReturnedItemsCount(pendingCount);

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

          const unreadCreditCount = (notifRes.data || []).filter((n: any) => 
            !n.is_read && CREDIT_NOTIFICATION_TYPES.includes(n.type)
          ).length;
          setUnreadCreditNotificationsCount(unreadCreditCount);

        } catch (error) {
          console.error('Failed to fetch sidebar data:', error);
        }
      };
      fetchData();
      // Refresh every 15 seconds
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    const creditRoutes = [
      '/sales/credits',
      '/sales/give-credit',
      '/sales/manage-creditors',
      '/sales/manage-credits',
      '/sales/credit-store',
      '/sales/credit-history',
      '/sales/credit-receipts',
      '/sales/credit-notifications',
      '/sales/credit-payments'
    ];
    if (creditRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      setCreditMode(true);
    } else {
      setCreditMode(false);
    }
  }, [pathname]);

  if (!mounted || !hydrated || !isAuthenticated || !['sales', 'sales_staff', 'admin', 'superadmin'].includes(user?.role || '')) {
    return null;
  }

  const menuItems = [
    { label: 'Dashboard', href: '/sales/dashboard', icon: <BarChart3 size={20} /> },
    { label: 'Make Sale', href: '/sales/make-sale', icon: <DollarSign size={20} /> },
    { label: 'Available Items', href: '/sales/items', icon: <CheckCircle size={20} /> },
    { label: 'Unavailable Items', href: '/sales/unavailable', icon: <XCircle size={20} /> },
    { label: 'Post Items', href: '/sales/post-items', icon: <Upload size={20} /> },
    { label: 'Returned Items', href: '/sales/returned-items', icon: <Undo2 size={20} />, badge: pendingReturnedItemsCount > 0 ? pendingReturnedItemsCount : undefined },
    { label: 'Make Payment', href: '/sales/payments', icon: <CreditCard size={20} /> },
    { label: 'Expenses', href: '/sales/expenses', icon: <Wallet size={20} /> },
    { label: 'Receipts', href: '/sales/receipts', icon: <Receipt size={20} /> },
    { label: 'Notifications', href: '/sales/notifications', icon: <Bell size={20} /> },
  ];

  const creditMenuItems = [
    { label: 'Overview', href: '/sales/credits', icon: <BarChart3 size={20} /> },
    { label: 'Give Credit', href: '/sales/give-credit', icon: <PlusCircle size={20} /> },
    { label: 'Manage Creditors', href: '/sales/manage-creditors', icon: <Users size={20} /> },
    { label: 'Manage Credits', href: '/sales/manage-credits', icon: <Store size={20} /> },
    { label: 'Credit Store', href: '/sales/credit-store', icon: <Package size={20} /> },
    { label: 'Credit Payments', href: '/sales/credit-payments', icon: <DollarSign size={20} /> },
    { label: 'Credit History', href: '/sales/credit-history', icon: <History size={20} /> },
    { label: 'Credit Notifications', href: '/sales/credit-notifications', icon: <Bell size={20} />, badge: unreadCreditNotificationsCount > 0 ? unreadCreditNotificationsCount : undefined },
    { label: 'Credit Receipts', href: '/sales/credit-receipts', icon: <FileText size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
      <Sidebar
        menuItems={menuItems}
        creditMenuItems={creditMenuItems}
        role="sales"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        creditMode={creditMode}
        onToggleCreditMode={() => {
          if (creditMode) {
            router.push('/sales/dashboard');
          } else {
            router.push('/sales/credits');
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
  );
}
