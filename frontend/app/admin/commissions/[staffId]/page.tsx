'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import LoadingLogo from '@/components/LoadingLogo';
import { formatQty } from '@/lib/format-quantity';

interface Staff {
  id: string;
  full_name: string;
  email: string;
  username: string;
  role: string;
}

interface ReceiptItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_per_unit: number;
  total_commission: number;
}

interface Receipt {
  id: string;
  receipt_number: string;
  total_amount: number;
  payment_method: string;
  sold_outside_jalingo: boolean;
  created_at: string;
  commission: number;
  items: ReceiptItem[];
}

interface CommissionByItem {
  item_id: string;
  item_name: string;
  category: string;
  quantity_sold: number;
  total_sales: number;
  commission_per_unit: number;
  total_commission: number;
}

interface StaffCommissionDetails {
  staff: Staff;
  total_commission: number;
  total_sales: number;
  total_items_sold: number;
  receipts: Receipt[];
  commission_by_item: CommissionByItem[];
}

const getDateRange = (period: string): { start: string; end: string } => {
  const now = new Date();
  let start = new Date();

  switch (period) {
    case '1h':
      start.setHours(now.getHours() - 1);
      break;
    case '12h':
      start.setHours(now.getHours() - 12);
      break;
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'lastyear':
      start.setFullYear(now.getFullYear() - 1);
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      now.setFullYear(now.getFullYear() - 1);
      now.setMonth(11, 31);
      now.setHours(23, 59, 59, 999);
      return {
        start: start.toISOString(),
        end: now.toISOString(),
      };
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
};

export default function StaffCommissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.staffId as string;
  
  const [details, setDetails] = useState<StaffCommissionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [viewMode, setViewMode] = useState<'receipts' | 'items'>('receipts');
  
  const token = useAuthStore((state) => state.token);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

  useEffect(() => {
    if (staffId) {
      fetchDetails();
    }
  }, [staffId, startDate, endDate]);

  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period);
    if (period === 'all') {
      setStartDate('');
      setEndDate('');
    } else {
      const { start, end } = getDateRange(period);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get(
        `${API_BASE_URL}/api/admin/commissions/staff/${staffId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );
      setDetails(response.data);
    } catch (error) {
      console.error('Error fetching staff commission details:', error);
      alert('Error loading commission details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <LoadingLogo fullScreen text="Loading commission details..." />;
  }

  if (!details) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No commission data found</p>
          <button
            onClick={() => router.push('/admin/commissions')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Back to Commissions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => router.push('/admin/commissions')}
            className="text-blue-600 hover:text-blue-700 mb-2 flex items-center text-sm"
          >
            ← Back to Commissions
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
            Commission Details: {details.staff.full_name}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {details.staff.email} • @{details.staff.username}
          </p>
        </div>
        <button
          onClick={fetchDetails}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Date Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Filter by Period</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '1 Hour', value: '1h' },
              { label: '12 Hours', value: '12h' },
              { label: 'Today', value: 'today' },
              { label: 'This Week', value: 'week' },
              { label: 'This Month', value: 'month' },
              { label: 'This Year', value: 'year' },
              { label: 'Last Year', value: 'lastyear' },
              { label: 'All Time', value: 'all' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handlePeriodSelect(option.value)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  selectedPeriod === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom Date Range</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={startDate ? new Date(startDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  setSelectedPeriod('');
                  setStartDate(e.target.value ? new Date(e.target.value).toISOString() : '');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={endDate ? new Date(endDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  setSelectedPeriod('');
                  setEndDate(e.target.value ? new Date(e.target.value).toISOString() : '');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            {(startDate || endDate) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedPeriod('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 sm:p-6 text-white overflow-hidden">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex-1 min-w-0">
              <p className="text-green-100 text-xs sm:text-sm truncate">Total Commission</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 truncate">{formatCurrency(details.total_commission)}</p>
            </div>
            <div className="text-2xl sm:text-4xl opacity-80 text-right">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 sm:p-6 text-white overflow-hidden">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex-1 min-w-0">
              <p className="text-blue-100 text-xs sm:text-sm truncate">Total Sales</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 truncate">{formatCurrency(details.total_sales)}</p>
            </div>
            <div className="text-2xl sm:text-4xl opacity-80 text-right">💵</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 sm:p-6 text-white overflow-hidden">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex-1 min-w-0">
              <p className="text-purple-100 text-xs sm:text-sm truncate">Items Sold</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 truncate">{formatQty(details.total_items_sold)}</p>
            </div>
            <div className="text-2xl sm:text-4xl opacity-80 text-right">📦</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 sm:p-6 text-white overflow-hidden">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex-1 min-w-0">
              <p className="text-orange-100 text-xs sm:text-sm truncate">Avg Commission/Item</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 truncate">
                {details.total_items_sold > 0
                  ? formatCurrency(details.total_commission / details.total_items_sold)
                  : '₦0.00'}
              </p>
            </div>
            <div className="text-2xl sm:text-4xl opacity-80 text-right">📊</div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('receipts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'receipts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📄 Receipts ({details.receipts.length})
          </button>
          <button
            onClick={() => setViewMode('items')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'items'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📦 Items ({details.commission_by_item.length})
          </button>
        </nav>
      </div>

      {/* Receipts View */}
      {viewMode === 'receipts' && (
        <div className="space-y-4">
          {details.receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {receipt.receipt_number}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(receipt.created_at)} • {receipt.payment_method?.toUpperCase() || 'N/A'}
                      {receipt.sold_outside_jalingo && ' • Outside Jalingo'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Receipt Total</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(receipt.total_amount)}
                    </p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Commission: {formatCurrency(receipt.commission)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Comm./Unit
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Commission
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {receipt.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.item_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                          {formatQty(item.quantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.total_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-600 dark:text-blue-400">
                          {formatCurrency(item.commission_per_unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(item.total_commission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {details.receipts.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No receipts found for the selected period</p>
            </div>
          )}
        </div>
      )}

      {/* Items View */}
      {viewMode === 'items' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Commission by Item
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity Sold
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Sales
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commission/Unit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Commission
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {details.commission_by_item
                  .sort((a, b) => b.total_commission - a.total_commission)
                  .map((item) => (
                    <tr key={item.item_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.item_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        {formatQty(item.quantity_sold)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(item.total_sales)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-600 dark:text-blue-400">
                        {formatCurrency(item.commission_per_unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(item.total_commission)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                    TOTAL:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(details.commission_by_item.reduce((sum, item) => sum + item.total_sales, 0))}
                  </td>
                  <td></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(details.commission_by_item.reduce((sum, item) => sum + item.total_commission, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
            {details.commission_by_item.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No items found for the selected period
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
