'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Bell, 
  UserPlus, 
  CreditCard, 
  DollarSign, 
  RotateCcw, 
  RefreshCw,
  XCircle, 
  CheckCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Toast, CreditTabs } from '@/components/credits';
import Pagination from '@/components/Pagination';
import { AbifreshLoading } from '@/components/AbifreshLoading';

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

export default function CreditNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const NOTIFS_PER_PAGE = 30;

  const CATEGORIES = [
    { id: 'all', name: 'All Activities', icon: <Bell size={16} /> },
    { id: 'credits', name: 'Issuance', icon: <CreditCard size={16} /> },
    { id: 'payments', name: 'Payments', icon: <DollarSign size={16} /> },
    { id: 'returns', name: 'Returns', icon: <RotateCcw size={16} /> },
    { id: 'creditors', name: 'Creditors', icon: <UserPlus size={16} /> },
  ];

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (retryCount = 0) => {
    try {
      const response = await api.get('/api/notifications');
      const raw = response.data;
      const allNotifications = Array.isArray(raw) ? raw : (raw?.data || []);
      
      const creditNotifications = allNotifications.filter((n: any) => 
        CREDIT_NOTIFICATION_TYPES.includes(n.type)
      );
      
      setNotifications(creditNotifications);
      setToast(null);
    } catch (error: any) {
      if (retryCount < 2) {
        setTimeout(() => fetchNotifications(retryCount + 1), 1500);
      } else {
        setToast({ message: 'Connection interrupted. Retrying...', type: 'error' });
      }
    } finally {
      if (retryCount >= 2 || retryCount === 0) setIsLoading(false);
    }
  };

  const filteredNotifications = activeCategory === 'all' 
    ? notifications 
    : notifications.filter(n => {
        if (activeCategory === 'creditors') return n.type.includes('creditor');
        if (activeCategory === 'credits') return n.type.includes('credit_given') || n.type.includes('credit_cancel');
        if (activeCategory === 'payments') return n.type.includes('credit_payment');
        if (activeCategory === 'returns') return n.type.includes('credit_item_returned') || n.type.includes('credit_return');
        return false;
      });

  const totalPages = Math.ceil(filteredNotifications.length / NOTIFS_PER_PAGE);
  const safePage = Math.min(currentPage, totalPages || 1);
  const paginatedNotifications = filteredNotifications.slice(
    (safePage - 1) * NOTIFS_PER_PAGE,
    safePage * NOTIFS_PER_PAGE
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  }, []);

  const getUnreadCount = (catId: string) => {
    return notifications.filter(n => {
      if (n.is_read) return false;
      if (catId === 'all') return true;
      if (catId === 'creditors') return n.type.includes('creditor');
      if (catId === 'credits') return n.type.includes('credit_given') || n.type.includes('credit_cancel');
      if (catId === 'payments') return n.type.includes('credit_payment');
      if (catId === 'returns') return n.type.includes('credit_item_returned') || n.type.includes('credit_return');
      return false;
    }).length;
  };

  const markAllAsRead = async () => {
    const toMark = filteredNotifications.filter(n => !n.is_read);
    if (toMark.length === 0) return;
    
    setIsLoading(true);
    try {
      await Promise.all(toMark.map(n => api.patch(`/api/notifications/${n.id}/read`)));
      await fetchNotifications();
      setToast({ message: `Marked ${toMark.length} notifications as read`, type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to update notifications', type: 'error' });
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'creditor_added':
      case 'creditor_added_confirmation':
        return <UserPlus className="w-5 h-5 text-blue-600" />;
      case 'credit_given':
      case 'credit_given_confirmation':
        return <CreditCard className="w-5 h-5 text-purple-600" />;
      case 'credit_payment':
      case 'credit_payment_confirmation':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'credit_item_returned':
      case 'credit_return_confirmation':
        return <RotateCcw className="w-5 h-5 text-orange-600" />;
      case 'credit_cancelled':
      case 'credit_cancel_confirmation':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBadgeColor = (type: string) => {
    if (type.includes('confirmation') || type.includes('payment')) return 'bg-green-100 text-green-700';
    if (type.includes('cancelled')) return 'bg-red-100 text-red-700';
    if (type.includes('returned')) return 'bg-orange-100 text-orange-700';
    if (type.includes('added')) return 'bg-blue-100 text-blue-700';
    return 'bg-purple-100 text-purple-700';
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <CreditTabs />
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
              Credit Notifications
            </h1>
            <p className="text-gray-500 font-medium italic">Superadmin oversight of all credit system activities</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={markAllAsRead}
              disabled={filteredNotifications.filter(n => !n.is_read).length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              âœ… Mark Category as Read
            </button>
            <button
              onClick={() => fetchNotifications()}
              className="flex items-center gap-2 px-6 py-3 bg-pink-600 rounded-2xl text-sm font-bold text-white hover:bg-pink-700 transition-all shadow-lg shadow-pink-100"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Feed
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const count = getUnreadCount(cat.id);
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border-2 ${
                  isActive 
                    ? 'bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-100' 
                    : 'bg-white border-gray-100 text-gray-500 hover:border-pink-200 hover:bg-pink-50/30'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
                {count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-600'
                  }`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="max-w-4xl space-y-4">
          {filteredNotifications.length > 0 ? (
            paginatedNotifications.map((notif, idx) => (
              <div 
                key={notif.id || idx} 
                className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-100 transition-all cursor-default relative overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  notif.type.includes('cancelled') ? 'bg-red-500' :
                  notif.type.includes('payment') ? 'bg-green-500' :
                  notif.type.includes('given') ? 'bg-purple-500' :
                  notif.type.includes('returned') ? 'bg-orange-500' :
                  'bg-blue-500'
                }`} />

                <div className="flex gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    notif.type.includes('cancelled') ? 'bg-red-50' :
                    notif.type.includes('payment') ? 'bg-green-50' :
                    notif.type.includes('given') ? 'bg-purple-50' :
                    notif.type.includes('returned') ? 'bg-orange-50' :
                    'bg-blue-50'
                  }`}>
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {notif.title}
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                        )}
                      </h3>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.timestamp || notif.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 font-medium leading-relaxed mb-3">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${getBadgeColor(notif.type)}`}>
                        {notif.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">No Credit Activity Yet</h2>
              <p className="text-gray-500 max-w-sm mx-auto font-medium">
                When staff gives credit, receives payments, or returns items, you will be notified here.
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}

