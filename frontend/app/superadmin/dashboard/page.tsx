'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { Users, DollarSign, Package, TrendingUp, Search, Eye, X, ShoppingCart, Wallet, Clock, Banknote, ArrowRightLeft, Shield, Activity, AlertTriangle, Server, UserCheck, UserX, Database } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { formatQty } from '@/lib/format-quantity';

interface DashboardStats {
  today_sales: number;
  today_amount: number;
  today_items?: number;
  total_sales: number;
  total_amount: number;
  total_items: number;
  total_staff: number;
  pending_approvals: number;
  pending_amount: number;
  active_users: number;
  inactive_users: number;
}

interface ReceiptItem {
  id: string;
  item_id: string | { name: string; price_jalingo?: number; price_outside?: number };
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Receipt {
  id: string;
  receipt_number: string;
  total_amount: number;
  payment_method: 'cash' | 'pos' | 'transfer';
  items_count: number;
  created_at: string;
  staff_id: string;
  sold_outside_jalingo?: boolean;
  receipt_items?: ReceiptItem[];
}

interface StaffInfo {
  id: string;
  full_name: string;
  username: string;
  role: string;
  is_active?: boolean;
}

export default function SuperAdminDashboard() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'staff-analytics' | 'system'>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    today_sales: 0,
    today_amount: 0,
    total_sales: 0,
    total_amount: 0,
    total_items: 0,
    total_staff: 0,
    pending_approvals: 0,
    pending_amount: 0,
    active_users: 0,
    inactive_users: 0,
  });
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [staffList, setStaffList] = useState<StaffInfo[]>([]);
  const [staffMap, setStaffMap] = useState<{ [key: string]: StaffInfo }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptDetail, setShowReceiptDetail] = useState(false);
  const [filterType, setFilterType] = useState<'none' | 'date' | 'range'>('none');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [staffWithReceipts, setStaffWithReceipts] = useState<StaffInfo[]>([]);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentRes, receiptsRes, staffRes] = await Promise.all([
          api.get('/api/admin/payments/pending', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] })),
          api.get('/api/receipts/all', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] })),
          api.get('/api/admin/staff', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] })),
        ]);

        const allReceipts = receiptsRes.data || [];
        const allStaff = staffRes.data || [];
        setStaffList(allStaff);

        const staffMapData: { [key: string]: StaffInfo } = {};
        allStaff.forEach((staff: StaffInfo) => {
          staffMapData[staff.id] = staff;
        });
        setStaffMap(staffMapData);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayReceipts = allReceipts.filter((receipt: any) => {
          const receiptDate = new Date(receipt.created_at);
          return receiptDate >= today && receiptDate < tomorrow;
        });

        // receipts API returns receipt_items[] (no items_count field)
        const countItems = (receipt: any) =>
          (receipt.receipt_items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

        const todayStats = todayReceipts.reduce((acc: any, receipt: any) => ({
          sales: acc.sales + 1,
          amount: acc.amount + (receipt.total_amount || 0),
          items: acc.items + countItems(receipt),
        }), { sales: 0, amount: 0, items: 0 });

        const allTimeStats = allReceipts.reduce((acc: any, receipt: any) => ({
          sales: acc.sales + 1,
          items: acc.items + countItems(receipt),
          amount: acc.amount + (receipt.total_amount || 0),
        }), { sales: 0, items: 0, amount: 0 });

        const pendingAmount = (paymentRes.data || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);

        const activeUsers = allStaff.filter((s: StaffInfo) => s.is_active !== false).length;
        const inactiveUsers = allStaff.filter((s: StaffInfo) => s.is_active === false).length;

        setStats({
          today_sales: todayStats.sales,
          today_amount: todayStats.amount,
          total_sales: allTimeStats.sales,
          total_amount: allTimeStats.amount,
          total_items: allTimeStats.items,
          total_staff: allStaff.length,
          pending_approvals: paymentRes.data?.length || 0,
          pending_amount: pendingAmount,
          today_items: todayStats.items,
          active_users: activeUsers,
          inactive_users: inactiveUsers,
        });

        setReceipts(allReceipts);

        const uniqueStaffMap = new Map<string, StaffInfo>();
        allReceipts.forEach((receipt: any) => {
          if (receipt.staff_id && staffMapData[receipt.staff_id]) {
            uniqueStaffMap.set(receipt.staff_id, staffMapData[receipt.staff_id]);
          }
        });
        setStaffWithReceipts(Array.from(uniqueStaffMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  // Compute role distribution for pie chart
  const roleDistribution = staffList.reduce((acc: any[], staff) => {
    const role = staff.role || 'unknown';
    const existing = acc.find(r => r.name === role);
    if (existing) { existing.value++; } 
    else { acc.push({ name: role, value: 1 }); }
    return acc;
  }, []);

  // Compute daily sales for last 7 days
  const dailySalesData = (() => {
    const days: { name: string; amount: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayReceipts = receipts.filter(r => {
        const rd = new Date(r.created_at);
        return rd >= d && rd < next;
      });
      days.push({
        name: d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' }),
        amount: dayReceipts.reduce((s, r) => s + (r.total_amount || 0), 0),
        count: dayReceipts.length,
      });
    }
    return days;
  })();

  // Payment method breakdown
  const paymentMethodData = (() => {
    const methods: { [k: string]: number } = { cash: 0, pos: 0, transfer: 0 };
    receipts.forEach(r => { methods[r.payment_method] = (methods[r.payment_method] || 0) + r.total_amount; });
    return Object.entries(methods).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  })();

  // Staff performance (top 5 by sales amount)
  const staffPerformance = (() => {
    const perf: { [id: string]: { name: string; amount: number; count: number } } = {};
    receipts.forEach(r => {
      if (!perf[r.staff_id]) {
        perf[r.staff_id] = { name: staffMap[r.staff_id]?.full_name || 'Unknown', amount: 0, count: 0 };
      }
      perf[r.staff_id].amount += r.total_amount || 0;
      perf[r.staff_id].count++;
    });
    return Object.values(perf).sort((a, b) => b.amount - a.amount).slice(0, 5);
  })();

  const PIE_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

  const StatCard = ({ icon: Icon, title, value, color, onClick, additionalInfo, badge }: any) => (
    <div
      className={`card flex flex-col md:flex-row items-center md:space-x-4 text-center md:text-left ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`${color} p-2 md:p-3 rounded-lg flex-shrink-0`}>
        <Icon className="w-5 md:w-6 h-5 md:h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm truncate">{title}</p>
        <div className="flex items-center justify-center md:justify-start gap-2">
          <p className="text-lg md:text-2xl font-bold text-gray-800 dark:text-white truncate">{value}</p>
          {badge && <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300">{badge}</span>}
        </div>
        {additionalInfo && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">{additionalInfo}</p>}
      </div>
    </div>
  );

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-NG', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });

  const filteredReceipts = receipts
    .filter(receipt => {
      if (!receipt.receipt_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType === 'date' && selectedDate) {
        if (new Date(receipt.created_at).toISOString().split('T')[0] !== selectedDate) return false;
      }
      if (filterType === 'range' && dateRangeStart && dateRangeEnd) {
        const rd = new Date(receipt.created_at);
        const start = new Date(dateRangeStart);
        const end = new Date(dateRangeEnd); end.setHours(23, 59, 59, 999);
        if (rd < start || rd > end) return false;
      }
      if (selectedStaff && receipt.staff_id !== selectedStaff) return false;
      return true;
    })
    .sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortOrder, filterType, selectedDate, dateRangeStart, dateRangeEnd, selectedStaff]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Superadmin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8" />
              <h1 className="text-2xl md:text-3xl font-bold">Superadmin Dashboard</h1>
            </div>
            <p className="text-pink-100 text-sm md:text-base">Welcome back, {user?.full_name || 'Superadmin'}. Full system control and analytics.</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-pink-100">Role</p>
              <p className="font-bold text-sm">SUPERADMIN</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-pink-100">Total Users</p>
              <p className="font-bold text-sm">{stats.total_staff}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation (Segmented Control) */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex flex-wrap p-1.5 bg-gray-100/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl gap-1 border border-gray-200/50 dark:border-gray-700/40 shadow-sm w-full sm:w-auto">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'sales', label: 'Sales & Receipts', icon: '💰' },
            { key: 'staff-analytics', label: 'Staff Analytics', icon: '👥' },
            { key: 'system', label: 'System Monitor', icon: '🖥️' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 sm:flex-none py-2 px-5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25'
                  : 'text-gray-500 hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Banknote} title="Today's Revenue" value={`₦${stats.today_amount.toLocaleString()}`} color="bg-emerald-600" />
            <StatCard icon={ArrowRightLeft} title="Today's Transactions" value={stats.today_sales} color="bg-cyan-500" />
            <StatCard icon={Wallet} title="Total Revenue" value={`₦${stats.total_amount.toLocaleString()}`} color="bg-green-600" />
            <StatCard icon={Clock} title="Pending Approvals" value={stats.pending_approvals} color="bg-orange-500" onClick={() => router.push('/superadmin/payments')} additionalInfo={`₦${stats.pending_amount.toLocaleString()}`} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} title="Total Staff" value={stats.total_staff} color="bg-violet-500" onClick={() => router.push('/superadmin/staff')} />
            <StatCard icon={UserCheck} title="Active Users" value={stats.active_users} color="bg-teal-500" />
            <StatCard icon={ShoppingCart} title="Total Items Sold" value={formatQty(stats.total_items)} color="bg-sky-500" />
            <StatCard icon={TrendingUp} title="Total Transactions" value={stats.total_sales} color="bg-indigo-500" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">7-Day Sales Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="amount" name="Revenue" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Payment Methods</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentMethodData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { label: 'Manage Users', href: '/superadmin/users', icon: '🔐', desc: 'View, activate, deactivate users' },
                { label: 'Audit Logs', href: '/superadmin/audit-logs', icon: '📜', desc: 'Track all system activities' },
                { label: 'System Health', href: '/superadmin/system-health', icon: '💓', desc: 'Monitor system performance' },
                { label: 'Manage Staff', href: '/superadmin/staff', icon: '👥', desc: 'Staff details & roles' },
                { label: 'Payments', href: '/superadmin/payments', icon: '💳', desc: 'Approve pending payments' },
                { label: 'Reports', href: '/superadmin/reports', icon: '📈', desc: 'Comprehensive reports' },
                { label: 'Inventory', href: '/superadmin/inventory', icon: '📦', desc: 'Stock levels & items' },
                { label: 'Backup', href: '/superadmin/backup', icon: '💾', desc: 'Database backup & export' },
              ].map(action => (
                <div
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className="card cursor-pointer hover:shadow-lg hover:border-pink-300 dark:hover:border-pink-600 transition-all group"
                >
                  <div className="text-3xl mb-2">{action.icon}</div>
                  <h4 className="font-semibold text-gray-800 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">{action.label}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SALES TAB ==================== */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Today vs All Time */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Banknote} title="Today's Sales Amount" value={`₦${stats.today_amount.toLocaleString()}`} color="bg-emerald-600" />
            <StatCard icon={ArrowRightLeft} title="Today's Transactions" value={stats.today_sales} color="bg-cyan-500" />
            <StatCard icon={Package} title="Today's Items Sold" value={formatQty(stats.today_items || 0)} color="bg-indigo-500" />
          </div>

          {/* Receipts Table */}
          <div className="card space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sales Receipts</h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total: {receipts.length}</div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input type="text" placeholder="Search by receipt number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white">
                  <option value="">All Staff</option>
                  {staffWithReceipts.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <select value={filterType} onChange={(e) => { setFilterType(e.target.value as any); setSelectedDate(''); setDateRangeStart(''); setDateRangeEnd(''); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white">
                  <option value="none">No Date Filter</option>
                  <option value="date">Specific Date</option>
                  <option value="range">Date Range</option>
                </select>
                {filterType === 'date' && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white" />}
                {filterType === 'range' && (
                  <div className="flex gap-3 flex-1">
                    <input type="date" value={dateRangeStart} onChange={(e) => setDateRangeStart(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white" />
                    <input type="date" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white" />
                  </div>
                )}
                {(filterType !== 'none' || selectedStaff) && (
                  <button onClick={() => { setFilterType('none'); setSelectedDate(''); setDateRangeStart(''); setDateRangeEnd(''); setSelectedStaff(''); }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition">
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {filteredReceipts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Receipt #</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Staff</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Payment</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Items</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedReceipts.map(receipt => (
                      <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="px-4 py-3"><span className="font-semibold text-pink-600 dark:text-pink-400">{receipt.receipt_number}</span></td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          <div className="text-sm">{formatDate(receipt.created_at)}</div>
                          <div className="text-xs text-gray-500">{formatTime(receipt.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          <div className="font-medium">{staffMap[receipt.staff_id]?.full_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">@{staffMap[receipt.staff_id]?.username || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold capitalize">{receipt.payment_method}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{(receipt.receipt_items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">₦{receipt.total_amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => { setSelectedReceipt(receipt); setShowReceiptDetail(true); }}
                            className="inline-flex items-center justify-center px-3 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">{searchQuery ? 'No receipts match your search' : 'No sales receipts yet'}</div>
            )}

            {filteredReceipts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredReceipts.length)} of {filteredReceipts.length}
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition">Previous</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded transition ${currentPage === page ? 'bg-pink-600 text-white font-semibold' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== STAFF ANALYTICS TAB ==================== */}
      {activeTab === 'staff-analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} title="Total Staff" value={stats.total_staff} color="bg-violet-500" />
            <StatCard icon={UserCheck} title="Active" value={stats.active_users} color="bg-green-500" />
            <StatCard icon={UserX} title="Inactive" value={stats.inactive_users} color="bg-red-500" />
            <StatCard icon={Activity} title="Staff with Sales" value={staffWithReceipts.length} color="bg-cyan-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Performance */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Top 5 Staff by Revenue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={staffPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                  <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                  <Bar dataKey="amount" name="Revenue" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Role Distribution */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Staff Role Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={roleDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {roleDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Staff Table */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">All Staff Members</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Username</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Role</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {staffList.map(staff => (
                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{staff.full_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">@{staff.username}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs font-semibold capitalize">{staff.role?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${staff.is_active !== false ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}>
                          {staff.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SYSTEM TAB ==================== */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Server} title="Backend Status" value="Online" color="bg-green-600" badge="✓" />
            <StatCard icon={Database} title="Database" value="Connected" color="bg-blue-600" badge="✓" />
            <StatCard icon={Activity} title="API Health" value="Healthy" color="bg-emerald-500" />
            <StatCard icon={AlertTriangle} title="Pending Alerts" value={stats.pending_approvals} color="bg-amber-500" />
          </div>

          {/* System Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">System Information</h3>
              <div className="space-y-3">
                {[
                  { label: 'Application', value: 'Abifresh & Kiddies Ventures' },
                  { label: 'Version', value: '1.0.0' },
                  { label: 'Backend', value: 'Express.js + TypeScript' },
                  { label: 'Frontend', value: 'Next.js + React' },
                  { label: 'Database', value: 'Supabase PostgreSQL' },
                  { label: 'Authentication', value: 'JWT + Supabase Auth' },
                  { label: 'Logged in as', value: user?.full_name || 'Superadmin' },
                  { label: 'Role', value: 'Superadmin' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">{item.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Database Overview</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Users', value: stats.total_staff },
                  { label: 'Active Users', value: stats.active_users },
                  { label: 'Inactive Users', value: stats.inactive_users },
                  { label: 'Total Receipts', value: receipts.length },
                  { label: 'Total Revenue', value: `₦${stats.total_amount.toLocaleString()}` },
                  { label: 'Pending Payments', value: stats.pending_approvals },
                  { label: 'Items Sold', value: formatQty(stats.total_items) },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">{item.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7-Day Activity */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">7-Day Transaction Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Transactions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="amount" name="Revenue (₦)" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {showReceiptDetail && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Receipt Details</h2>
              <button onClick={() => setShowReceiptDetail(false)} className="text-white hover:text-pink-100 transition"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-pink-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Receipt Number</p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white mt-1">{selectedReceipt.receipt_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Date & Time</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(selectedReceipt.created_at)} {formatTime(selectedReceipt.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Payment Method</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 capitalize">{selectedReceipt.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Outside Jalingo</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{selectedReceipt.sold_outside_jalingo ? '✅ Yes' : '❌ No'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border-l-4 border-blue-500">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Generated By</h3>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">{staffMap[selectedReceipt.staff_id]?.full_name?.charAt(0) || 'S'}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{staffMap[selectedReceipt.staff_id]?.full_name || 'Unknown Staff'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">@{staffMap[selectedReceipt.staff_id]?.username || 'unknown'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Items ({formatQty((selectedReceipt.receipt_items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0))})</h3>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {selectedReceipt.receipt_items && selectedReceipt.receipt_items.length > 0 ? (
                    selectedReceipt.receipt_items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {typeof item.item_id === 'object' && item.item_id?.name ? item.item_id.name : 'Unknown Item'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Qty: {formatQty(item.quantity)} × ₦{(item.unit_price || 0).toLocaleString()}</p>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">₦{((item.unit_price || 0) * item.quantity).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-600 dark:text-gray-400 py-4">No items found</p>
                  )}
                </div>
              </div>
              <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900 dark:to-pink-800 rounded-lg p-4 border-l-4 border-pink-500">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300 uppercase font-semibold mb-2">Total Amount</p>
                  <p className="text-4xl font-bold text-pink-600 dark:text-pink-300">₦{selectedReceipt.total_amount.toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setShowReceiptDetail(false)} className="w-full px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
