'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
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
  CheckCircle2,
  RefreshCcw,
  ClipboardList,
  Home,
  ShieldCheck,
  ScrollText,
  Activity,
  Save,
  Undo2,
  Monitor
} from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creditMode, setCreditMode] = useState(false);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [pendingCreditRemittanceCount, setPendingCreditRemittanceCount] = useState(0);
  const [unreadCreditNotificationsCount, setUnreadCreditNotificationsCount] = useState(0);

  useEffect(() => {
    const creditRoutes = [
      '/superadmin/credits',
      '/superadmin/give-credit',
      '/superadmin/manage-creditors',
      '/superadmin/manage-credits',
      '/superadmin/credit-store',
      '/superadmin/credit-history',
      '/superadmin/credit-receipts',
      '/superadmin/credit-notifications',
      '/superadmin/credit-payments',
      '/superadmin/approve-payments',
      '/superadmin/approve-remittance'
    ];
    if (creditRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      setCreditMode(true);
    } else {
      setCreditMode(false);
    }
  }, [pathname]);

  const fetchData = useCallback(async () => {
    try {
      const [payRes, creditPayRes, notifRes] = await Promise.all([
        api.get('/api/admin/payments/pending-count'),
        api.get('/api/credits/payments/pending-count'),
        api.get('/api/notifications')
      ]);

      setPendingPaymentsCount(payRes.data.count || 0);
      setPendingCreditRemittanceCount(creditPayRes.data.count || 0);

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
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [hydrated, isAuthenticated, fetchData]);

  if (!mounted || !hydrated || !isAuthenticated || user?.role !== 'superadmin') {
    return null;
  }

  const menuItems = [
    // Superadmin Overview
    { label: 'Dashboard', href: '/superadmin/dashboard', icon: <Home size={20} /> },
    
    // All Admin Features
    { label: 'Staff Management', href: '/superadmin/staff', icon: <Users size={20} /> },
    { label: 'Staff Stores', href: '/superadmin/staff-stores', icon: <Store size={20} /> },
    { label: 'Post Items', href: '/superadmin/post-items', icon: <Send size={20} /> },
    { label: 'Inventory', href: '/superadmin/inventory', icon: <Package size={20} /> },
    { label: 'Returned Items', href: '/superadmin/returned-items', icon: <Undo2 size={20} /> },
    { label: 'Restock Orders', href: '/superadmin/orders', icon: <ShoppingCart size={20} /> },
    { label: 'Payments', href: '/superadmin/payments', icon: <CreditCard size={20} />, badge: pendingPaymentsCount },
    { label: 'Credit Management', href: '/superadmin/credits', icon: <CreditCard size={20} /> },
    { label: 'Receipts', href: '/superadmin/receipts', icon: <FileText size={20} /> },
    { label: 'Commissions', href: '/superadmin/commissions', icon: <DollarSign size={20} /> },
    { label: 'Expenses Tracker', href: '/superadmin/expenses', icon: <ClipboardList size={20} /> },
    { label: 'My Expenses', href: '/superadmin/my-expenses', icon: <DollarSign size={20} /> },
    { label: 'Reports', href: '/superadmin/reports', icon: <BarChart3 size={20} /> },
    { label: 'Items', href: '/superadmin/items', icon: <ShoppingBag size={20} /> },
    
    // Superadmin Exclusive
    { label: 'User Management', href: '/superadmin/users', icon: <ShieldCheck size={20} /> },
    { label: 'Audit Logs', href: '/superadmin/audit-logs', icon: <ScrollText size={20} /> },
    { label: 'Server Logs', href: '/superadmin/logs', icon: <Monitor size={20} /> },
    { label: 'System Health', href: '/superadmin/system-health', icon: <Activity size={20} /> },
    { label: 'Notifications', href: '/superadmin/notifications', icon: <Bell size={20} /> },
    { label: 'Backup', href: '/superadmin/backup', icon: <Save size={20} /> },
  ];

  const creditMenuItems = [
    { label: 'Overview', href: '/superadmin/credits', icon: <BarChart3 size={20} /> },
    { label: 'Give Credit', href: '/superadmin/give-credit', icon: <PlusCircle size={20} /> },
    { label: 'Manage Creditors', href: '/superadmin/manage-creditors', icon: <Users size={20} /> },
    { label: 'Manage Credits', href: '/superadmin/manage-credits', icon: <Store size={20} /> },
    { label: 'Credit Store', href: '/superadmin/credit-store', icon: <Package size={20} /> },
    { label: 'Credit Payments', href: '/superadmin/credit-payments', icon: <DollarSign size={20} />, badge: pendingCreditRemittanceCount > 0 ? pendingCreditRemittanceCount : undefined },
    { label: 'Credit History', href: '/superadmin/credit-history', icon: <History size={20} /> },
    { label: 'Credit Notifications', href: '/superadmin/credit-notifications', icon: <Bell size={20} />, badge: unreadCreditNotificationsCount > 0 ? unreadCreditNotificationsCount : undefined },
    { label: 'Credit Receipts', href: '/superadmin/credit-receipts', icon: <FileText size={20} /> },
    { label: 'Approve Payments', href: '/superadmin/approve-payments', icon: <CheckCircle2 size={20} /> },
    { label: 'Approve Remittance', href: '/superadmin/approve-remittance', icon: <RefreshCcw size={20} /> },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
        <Sidebar 
          menuItems={menuItems} 
          creditMenuItems={creditMenuItems}
          role="superadmin" 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
          creditMode={creditMode}
          onToggleCreditMode={() => {
            if (creditMode) {
              router.push('/superadmin/dashboard');
            } else {
              router.push('/superadmin/credits');
            }
          }}
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
