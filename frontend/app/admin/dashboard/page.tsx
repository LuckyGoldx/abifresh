'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { Users, DollarSign, Package, TrendingUp, Search, Eye, X, ShoppingCart, Wallet, Clock, Banknote, ArrowRightLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

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
}

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    today_sales: 0,
    today_amount: 0,
    total_sales: 0,
    total_amount: 0,
    total_items: 0,
    total_staff: 0,
    pending_approvals: 0,
    pending_amount: 0,
  });
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [staffMap, setStaffMap] = useState<{ [key: string]: StaffInfo }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptDetail, setShowReceiptDetail] = useState(false);
  const [filterType, setFilterType] = useState<'none' | 'date' | 'range'>('none');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>(''); // Staff filter
  const [staffWithReceipts, setStaffWithReceipts] = useState<StaffInfo[]>([]); // Staff who have generated receipts
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📊 Admin Dashboard: Fetching data with token:', token ? 'yes' : 'no');
        
        // Fetch receipts and staff data
        const [paymentRes, receiptsRes, staffRes] = await Promise.all([
          api.get('/api/admin/payments/pending', { headers: { 'Authorization': `Bearer ${token}` } }).catch(err => {
            console.warn('⚠️ Failed to fetch pending payments:', err);
            return { data: [] };
          }),
          api.get('/api/receipts/all', { headers: { 'Authorization': `Bearer ${token}` } }).catch(err => {
            console.warn('⚠️ Failed to fetch receipts:', err);
            return { data: [] };
          }),
          api.get('/api/admin/staff', { headers: { 'Authorization': `Bearer ${token}` } }).catch(err => {
            console.warn('⚠️ Failed to fetch staff:', err);
            return { data: [] };
          }),
        ]);

        const allReceipts = receiptsRes.data || [];
        console.log('📋 All Receipts loaded:', allReceipts.length, allReceipts);
        console.log('📋 First receipt sample:', allReceipts[0]);
        
        // Create staff map for quick lookup
        const staffMapData: { [key: string]: StaffInfo } = {};
        (staffRes.data || []).forEach((staff: StaffInfo) => {
          staffMapData[staff.id] = staff;
        });
        setStaffMap(staffMapData);
        
        // Get today's date (without time) in local timezone
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Filter receipts created today
        const todayReceipts = allReceipts.filter((receipt: any) => {
          const receiptDate = new Date(receipt.created_at);
          return receiptDate >= today && receiptDate < tomorrow;
        });
        
        console.log('📅 Today Receipts:', todayReceipts.length);
        console.log('📅 Today Receipts sample:', todayReceipts[0]);
        
        // Calculate today's stats
        const todayStats = todayReceipts.reduce((acc: any, receipt: any) => ({
          sales: acc.sales + 1,
          amount: acc.amount + (receipt.total_amount || 0),
          items: acc.items + (receipt.items_count || 0),
        }), { sales: 0, amount: 0, items: 0 });
        
        // Calculate all-time stats
        const allTimeStats = allReceipts.reduce((acc: any, receipt: any) => ({
          sales: acc.sales + 1,
          items: acc.items + (receipt.items_count || 0),
          amount: acc.amount + (receipt.total_amount || 0),
        }), { sales: 0, items: 0, amount: 0 });

        console.log('📊 Today Stats Calculated:', todayStats);
        console.log('📊 All-Time Stats Calculated:', allTimeStats);
        console.log('📊 Items breakdown - Today items:', todayStats.items, 'All-time items:', allTimeStats.items);

        // Calculate pending amount
        const pendingAmount = (paymentRes.data || []).reduce((sum: number, payment: any) => {
          return sum + (payment.amount || 0);
        }, 0);

        setStats({
          today_sales: todayStats.sales,
          today_amount: todayStats.amount,
          total_sales: allTimeStats.sales,
          total_amount: allTimeStats.amount,
          total_items: allTimeStats.items,
          total_staff: 0,
          pending_approvals: paymentRes.data?.length || 0,
          pending_amount: pendingAmount,
          today_items: todayStats.items,
        });
        
        setReceipts(allReceipts);
        
        // Extract unique staff members who have generated receipts
        const uniqueStaffMap = new Map<string, StaffInfo>();
        (allReceipts || []).forEach((receipt: any) => {
          if (receipt.staff_id && staffMapData[receipt.staff_id]) {
            uniqueStaffMap.set(receipt.staff_id, staffMapData[receipt.staff_id]);
          }
        });
        const staffList = Array.from(uniqueStaffMap.values()).sort((a, b) => 
          a.full_name.localeCompare(b.full_name)
        );
        setStaffWithReceipts(staffList);
      } catch (error) {
        console.error('❌ Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
        setReceiptsLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const StatCard = ({ icon: Icon, title, value, color, onClick, additionalInfo }: any) => (
    <div 
      className={`card flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`${color} p-3 rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        {additionalInfo && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{additionalInfo}</p>}
      </div>
    </div>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  // Filter and sort receipts based on search, date filters, and sort order
  const filteredReceipts = receipts
    .filter(receipt => {
      // Search filter
      if (!receipt.receipt_number.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Date filter (specific date)
      if (filterType === 'date' && selectedDate) {
        const receiptDate = new Date(receipt.created_at).toISOString().split('T')[0];
        if (receiptDate !== selectedDate) {
          return false;
        }
      }

      // Date range filter
      if (filterType === 'range' && dateRangeStart && dateRangeEnd) {
        const receiptDate = new Date(receipt.created_at);
        const startDate = new Date(dateRangeStart);
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        if (receiptDate < startDate || receiptDate > endDate) {
          return false;
        }
      }

      // Staff filter
      if (selectedStaff && receipt.staff_id !== selectedStaff) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(startIndex, endIndex);

  // Reset to page 1 when search query, sort, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder, filterType, selectedDate, dateRangeStart, dateRangeEnd, selectedStaff]);

  if (isLoading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>

      {/* Today's Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Today's Sales</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Banknote}
            title="Today's Sales Amount"
            value={`₦${stats.today_amount.toLocaleString()}`}
            color="bg-emerald-600"
          />
          <StatCard
            icon={ArrowRightLeft}
            title="Today's Transactions"
            value={stats.today_sales}
            color="bg-cyan-500"
          />
          <StatCard
            icon={Package}
            title="Today's Items Sold"
            value={stats.today_items || 0}
            color="bg-indigo-500"
          />
        </div>
      </div>

      {/* All-Time Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">All-Time Sales</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Wallet}
            title="Total Sales Amount"
            value={`₦${stats.total_amount.toLocaleString()}`}
            color="bg-green-600"
          />
          <StatCard
            icon={ShoppingCart}
            title="Total Items Sold"
            value={stats.total_items}
            color="bg-sky-500"
          />
          <StatCard
            icon={TrendingUp}
            title="Total Transactions"
            value={stats.total_sales}
            color="bg-violet-500"
          />
          <StatCard
            icon={Clock}
            title="Pending Approvals"
            value={stats.pending_approvals}
            color="bg-orange-500"
            onClick={() => router.push('/admin/payments')}
            additionalInfo={`Pending: ₦${stats.pending_amount.toLocaleString()}`}
          />
        </div>
      </div>

      {/* Sales Receipts Section */}
      <div className="card space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sales Receipts (Real-time)</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total: {receipts.length}</div>
        </div>

        {/* Search and Sort */}
        <div className="space-y-3">
          {/* Row 1: Search, Sort, and Staff Filter */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by receipt number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white whitespace-nowrap"
            >
              <option value="">All Staff</option>
              {staffWithReceipts.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white whitespace-nowrap"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Row 2: Date Filter Type */}
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as 'none' | 'date' | 'range');
                setSelectedDate('');
                setDateRangeStart('');
                setDateRangeEnd('');
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white"
            >
              <option value="none">No Date Filter</option>
              <option value="date">Filter by Specific Date</option>
              <option value="range">Filter by Date Range</option>
            </select>

            {/* Specific Date Picker */}
            {filterType === 'date' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white"
              />
            )}

            {/* Date Range Pickers */}
            {filterType === 'range' && (
              <div className="flex flex-col md:flex-row gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white"
                  />
                </div>
              </div>
            )}

            {/* Clear Filter Button */}
            {(filterType !== 'none' || selectedStaff) && (
              <button
                onClick={() => {
                  setFilterType('none');
                  setSelectedDate('');
                  setDateRangeStart('');
                  setDateRangeEnd('');
                  setSelectedStaff('');
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition whitespace-nowrap"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Receipts Table */}
        {receiptsLoading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading receipts...</div>
        ) : filteredReceipts.length > 0 ? (
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
                {paginatedReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-pink-600 dark:text-pink-400">{receipt.receipt_number}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <div className="text-sm">{formatDate(receipt.created_at)}</div>
                      <div className="text-xs text-gray-500">{formatTime(receipt.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <div className="font-medium">{staffMap[receipt.staff_id]?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{staffMap[receipt.staff_id]?.username || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold capitalize">
                        {receipt.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{receipt.items_count}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                      ₦{receipt.total_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setShowReceiptDetail(true);
                        }}
                        className="inline-flex items-center justify-center px-3 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition"
                        title="View receipt details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            {searchQuery ? 'No receipts match your search' : 'No sales receipts yet'}
          </div>
        )}
        
        {/* Pagination Controls */}
        {filteredReceipts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredReceipts.length)} of {filteredReceipts.length} receipts
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded transition ${
                      currentPage === page
                        ? 'bg-pink-600 text-white font-semibold'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[
              { name: 'Today', value: stats.today_amount },
              { name: 'Total', value: stats.total_amount }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#ec4899" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Items Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Today', value: stats.today_sales },
              { name: 'Total', value: stats.total_items }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#ec4899" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Receipt Detail Modal */}
      {showReceiptDetail && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Receipt Details</h2>
              <button
                onClick={() => setShowReceiptDetail(false)}
                className="text-white hover:text-pink-100 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Receipt Header Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-pink-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Receipt Number</p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white mt-1">{selectedReceipt.receipt_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Date & Time</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {formatDate(selectedReceipt.created_at)} {formatTime(selectedReceipt.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Payment Method</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 capitalize">
                      {selectedReceipt.payment_method}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Sold Outside Jalingo</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                      {selectedReceipt.sold_outside_jalingo ? '✅ Yes' : '❌ No'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Staff Information */}
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border-l-4 border-blue-500">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Generated By</h3>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {staffMap[selectedReceipt.staff_id]?.full_name?.charAt(0) || 'S'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {staffMap[selectedReceipt.staff_id]?.full_name || 'Unknown Staff'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      @{staffMap[selectedReceipt.staff_id]?.username || 'unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                      {staffMap[selectedReceipt.staff_id]?.role || 'Staff'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt Items */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Items ({selectedReceipt.items_count})</h3>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {selectedReceipt.receipt_items && selectedReceipt.receipt_items.length > 0 ? (
                    selectedReceipt.receipt_items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {typeof item.item_id === 'object' && item.item_id?.name 
                              ? item.item_id.name 
                              : 'Unknown Item'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Qty: {item.quantity} × ₦{(
                              selectedReceipt.sold_outside_jalingo && typeof item.item_id === 'object' && item.item_id?.price_outside
                                ? item.item_id.price_outside
                                : typeof item.item_id === 'object' && item.item_id?.price_jalingo
                                ? item.item_id.price_jalingo
                                : item.unit_price || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            ₦{(
                              (selectedReceipt.sold_outside_jalingo && typeof item.item_id === 'object' && item.item_id?.price_outside
                                ? item.item_id.price_outside
                                : typeof item.item_id === 'object' && item.item_id?.price_jalingo
                                ? item.item_id.price_jalingo
                                : item.unit_price || 0) * item.quantity
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-600 dark:text-gray-400 py-4">No items found</p>
                  )}
                </div>
              </div>

              {/* Total Amount */}
              <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900 dark:to-pink-800 rounded-lg p-4 border-l-4 border-pink-500">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300 uppercase font-semibold mb-2">Total Amount</p>
                  <p className="text-4xl font-bold text-pink-600 dark:text-pink-300">
                    ₦{selectedReceipt.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowReceiptDetail(false)}
                className="w-full px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
