'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { Package, TrendingUp, Users, ShoppingCart, BarChart3, Eye } from 'lucide-react';
import Link from 'next/link';
import { formatQty } from '@/lib/format-quantity';

interface StaffStoreItem {
  id: string;
  staff_id: string;
  item_id: string;
  quantity: number;
  quantity_sold: number;
  quantity_available: number;
  posted_date: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  items?: {
    id: string;
    name: string;
    sku: string;
    category: string;
    unit_price: number;
  };
}

interface StaffStoreStats {
  staff_id: string;
  staff_name: string;
  staff_role: string;
  total_items: number;
  total_quantity: number;
  total_sold: number;
  available: number;
  total_amount_sold: number;
  sell_through_rate: string;
}

export default function AdminStaffStorePage() {
  const [storesSummary, setStoresSummary] = useState<any[]>([]);
  const [storesStats, setStoresStats] = useState<StaffStoreStats[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [staffDetails, setStaffDetails] = useState<any>(null);
  const [loadingStaffId, setLoadingStaffId] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [staffTypeFilter, setStaffTypeFilter] = useState<'all' | 'commission' | 'non-commission'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('📥 Fetching staff stores data...');
      const [summaryRes, statsRes] = await Promise.all([
        api.get('/api/admin/staff-stores'),
        api.get('/api/admin/staff-stores-stats'),
      ]);

      console.log('📊 Summary Response:', summaryRes.data);
      console.log('📊 Stats Response:', statsRes.data);

      setStoresSummary(summaryRes.data || []);
      setStoresStats(statsRes.data || []);
      setError('');
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Failed to load staff stores data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStaff = async (staffId: string) => {
    // If already selected, close the details
    if (selectedStaff === staffId) {
      setSelectedStaff(null);
      setStaffDetails(null);
      setLoadingStaffId(null);
      return;
    }

    try {
      setLoadingStaffId(staffId);
      console.log(`👁️ Fetching details for staff: ${staffId}`);
      const response = await api.get(`/api/admin/staff-stores/${staffId}`);
      console.log('👁️ Staff details response:', response.data);
      setSelectedStaff(staffId);
      setStaffDetails(response.data);
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error: any) {
      console.error('❌ Error fetching staff details:', error);
      console.error('Error details:', error.response?.data);
      setError('Failed to load staff store details');
    } finally {
      setLoadingStaffId(null);
    }
  };

  const filteredByType = storesStats.filter(stat => {
    if (staffTypeFilter === 'all') return true;
    if (staffTypeFilter === 'commission') return stat.staff_role === 'commission_staff';
    if (staffTypeFilter === 'non-commission') return stat.staff_role === 'non_commission_staff';
    return true;
  });

  const filteredStats = filteredByType.filter(stat =>
    stat.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stat.staff_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedStats = [...filteredStats].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.staff_name.localeCompare(b.staff_name);
      case 'quantity':
        return b.total_quantity - a.total_quantity;
      case 'sold':
        return b.total_sold - a.total_sold;
      case 'available':
        return b.available - a.available;
      default:
        return 0;
    }
  });

  // Calculate totals for all staff (not filtered by type)
  const allStaffTotals = {
    total_staff: storesStats.length,
    total_items_count: storesStats.reduce((sum, s) => sum + (isNaN(s.total_items) ? 0 : s.total_items), 0),
    total_quantity: storesStats.reduce((sum, s) => sum + (isNaN(s.total_quantity) ? 0 : s.total_quantity), 0),
    total_sold: storesStats.reduce((sum, s) => sum + (isNaN(s.total_sold) ? 0 : s.total_sold), 0),
    total_available: storesStats.reduce((sum, s) => sum + (isNaN(s.available) ? 0 : s.available), 0),
    total_amount_sold: storesStats.reduce((sum, s) => sum + (isNaN(s.total_amount_sold) ? 0 : s.total_amount_sold), 0),
  };

  // Calculate totals by staff type
  const commissionStaffTotals = {
    total_staff: storesStats.filter(s => s.staff_role === 'commission_staff').length,
    total_amount_sold: storesStats
      .filter(s => s.staff_role === 'commission_staff')
      .reduce((sum, s) => sum + (isNaN(s.total_amount_sold) ? 0 : s.total_amount_sold), 0),
  };

  const nonCommissionStaffTotals = {
    total_staff: storesStats.filter(s => s.staff_role === 'non_commission_staff').length,
    total_amount_sold: storesStats
      .filter(s => s.staff_role === 'non_commission_staff')
      .reduce((sum, s) => sum + (isNaN(s.total_amount_sold) ? 0 : s.total_amount_sold), 0),
  };

  // Filtered totals (based on current filter)
  const totalStats = {
    total_staff: filteredByType.length,
    total_items_count: filteredByType.reduce((sum, s) => sum + (isNaN(s.total_items) ? 0 : s.total_items), 0),
    total_quantity: filteredByType.reduce((sum, s) => sum + (isNaN(s.total_quantity) ? 0 : s.total_quantity), 0),
    total_sold: filteredByType.reduce((sum, s) => sum + (isNaN(s.total_sold) ? 0 : s.total_sold), 0),
    total_available: filteredByType.reduce((sum, s) => sum + (isNaN(s.available) ? 0 : s.available), 0),
    total_amount_sold: filteredByType.reduce((sum, s) => sum + (isNaN(s.total_amount_sold) ? 0 : s.total_amount_sold), 0),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <img src="/favicon.svg" alt="" className="w-20 h-20" />
          </div>
          <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
            <div className="w-5 h-5 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-bold">Abifreshing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Package className="w-8 h-8 text-pink-500" />
          Staff Store Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor inventory in staff stores across all commission and non-commission staff
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded">
          {error}
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Staff</p>
              <p className="break-words text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{totalStats.total_staff}</p>
            </div>
            <Users className="w-8 h-8 text-blue-300 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Total Items</p>
              <p className="break-words text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{totalStats.total_items_count}</p>
            </div>
            <Package className="w-8 h-8 text-purple-300 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Total Quantity</p>
              <p className="break-words text-3xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">{totalStats.total_quantity.toLocaleString()}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-yellow-300 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">Sold</p>
              <p className="break-words text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{totalStats.total_sold.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-300 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Total Amount Sold (All Staff)</p>
              <p className="break-words text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">₦{allStaffTotals.total_amount_sold.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              <div className="mt-2 text-xs space-y-1">
                <p className="text-indigo-700 dark:text-indigo-300">
                  <span className="font-semibold">Commission:</span> ₦{commissionStaffTotals.total_amount_sold.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-indigo-700 dark:text-indigo-300">
                  <span className="font-semibold">Non-Commission:</span> ₦{nonCommissionStaffTotals.total_amount_sold.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-indigo-300 opacity-50" />
          </div>
        </div>
      </div>

      {/* Staff Stores Table */}
      <div className="card">
        {/* Filter Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setStaffTypeFilter('all')}
              className={`px-4 py-2 rounded font-medium transition ${
                staffTypeFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All Staff
            </button>
            <button
              onClick={() => setStaffTypeFilter('commission')}
              className={`px-4 py-2 rounded font-medium transition ${
                staffTypeFilter === 'commission'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Commission Staff
            </button>
            <button
              onClick={() => setStaffTypeFilter('non-commission')}
              className={`px-4 py-2 rounded font-medium transition ${
                staffTypeFilter === 'non-commission'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Non-Commission Staff
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by staff name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 input"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input"
          >
            <option value="name">Sort by Name</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="sold">Sort by Sold</option>
            <option value="available">Sort by Available</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 font-semibold">Staff Member</th>
                <th className="text-left py-3 px-4 font-semibold">Role</th>
                <th className="text-right py-3 px-4 font-semibold">Items</th>
                <th className="text-right py-3 px-4 font-semibold">Total Quantity</th>
                <th className="text-right py-3 px-4 font-semibold">Sold</th>
                <th className="text-right py-3 px-4 font-semibold">Available</th>
                <th className="text-right py-3 px-4 font-semibold">Amount Sold</th>
                <th className="text-right py-3 px-4 font-semibold">Sell Through %</th>
                <th className="text-center py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((stat) => (
                <tr key={stat.staff_id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{stat.staff_name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {stat.staff_role === 'commission_staff' ? 'Commission' : 'Non-Commission'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">{formatQty(stat.total_items)}</td>
                  <td className="py-3 px-4 text-right font-semibold">{formatQty(stat.total_quantity)}</td>
                  <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-semibold">{formatQty(stat.total_sold)}</td>
                  <td className="py-3 px-4 text-right text-orange-600 dark:text-orange-400 font-semibold">{formatQty(stat.available)}</td>
                  <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold">₦{(stat.total_amount_sold || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 h-2 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-400 to-pink-600"
                          style={{ width: `${Math.min(parseFloat(stat.sell_through_rate), 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold min-w-12 text-right">{stat.sell_through_rate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleSelectStaff(stat.staff_id)}
                      disabled={loadingStaffId === stat.staff_id}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                        selectedStaff === stat.staff_id
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-75'
                      }`}
                    >
                      {loadingStaffId === stat.staff_id ? (
                        <>
                          <span className="inline-block animate-spin">⟳</span>
                          Loading...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          {selectedStaff === stat.staff_id ? 'Hide' : 'View'}
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedStats.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No staff stores found</p>
          </div>
        )}
      </div>

      {/* Staff Details Modal */}
      {selectedStaff && staffDetails && (
        <div ref={detailsRef} className="card border-2 border-pink-200 dark:border-pink-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Store Details: {staffDetails.items?.[0]?.users?.full_name || 'Staff'}
            </h2>
            <button
              onClick={() => {
                setSelectedStaff(null);
                setStaffDetails(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* Staff Store Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b dark:border-gray-700">
            <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded overflow-hidden">
              <p className="text-xs text-blue-700 dark:text-blue-300">Total Items</p>
              <p className="break-words text-2xl font-bold text-blue-900 dark:text-blue-100">{formatQty(staffDetails.total_items || 0)}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900 p-3 rounded overflow-hidden">
              <p className="text-xs text-purple-700 dark:text-purple-300">Total Quantity</p>
              <p className="break-words text-2xl font-bold text-purple-900 dark:text-purple-100">{formatQty(staffDetails.total_quantity || 0)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900 p-3 rounded overflow-hidden">
              <p className="text-xs text-green-700 dark:text-green-300">Sold</p>
              <p className="break-words text-2xl font-bold text-green-900 dark:text-green-100">{(staffDetails.total_sold || 0).toLocaleString()}</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900 p-3 rounded overflow-hidden">
              <p className="text-xs text-indigo-700 dark:text-indigo-300">Amount Sold</p>
              <p className="break-words text-2xl font-bold text-indigo-900 dark:text-indigo-100">₦{(staffDetails.total_amount_sold || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          {/* Commission Cards - Only for Commission Staff */}
          {selectedStaff && staffDetails.items && staffDetails.items[0]?.users?.role === 'commission_staff' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Actual Commission Earned */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded border-2 border-green-200 dark:border-green-700 overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300 font-bold">✅ Total Commission Earned</p>
                    <p className="break-words text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
                      ₦{(staffDetails.total_commission_earned || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      From {staffDetails.receipts_count || 0} sales receipts
                    </p>
                  </div>
                </div>
              </div>

              {/* Potential Commission */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 p-4 rounded border-2 border-amber-200 dark:border-amber-700 overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 font-bold">🎯 Potential Commission (Remaining)</p>
                    <p className="break-words text-3xl font-bold text-amber-900 dark:text-amber-100 mt-2">
                      ₦{staffDetails.items?.reduce((sum: number, item: any) => {
                        const commission = item.items?.commission || 0;
                        const remainingQty = (item.quantity || 0) - (item.quantity_sold || 0);
                        return sum + (commission * remainingQty);
                      }, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                      From {staffDetails.items?.length || 0} stock items × available qty
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <h3 className="text-lg font-bold mb-4">Items in Store</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-left py-2 px-3">SKU</th>
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-right py-2 px-3">Price</th>
                  <th className="text-left py-2 px-3">Location</th>
                  <th className="text-right py-2 px-3">Quantity</th>
                  <th className="text-right py-2 px-3">Sold</th>
                  <th className="text-right py-2 px-3">Available</th>
                </tr>
              </thead>
              <tbody>
                {staffDetails.items?.map((item: any) => (
                  <tr key={item.id} className="border-b dark:border-gray-700">
                    <td className="py-2 px-3 font-medium">{item.items?.name || 'N/A'}</td>
                    <td className="py-2 px-3">{item.items?.sku || 'N/A'}</td>
                    <td className="py-2 px-3">{item.items?.category || 'N/A'}</td>
                    <td className="py-2 px-3 text-right">
                      {/* For non-commission staff: show price_jalingo only */}
                      {item.users?.role !== 'commission_staff' ? (
                        <div>₦{(item.items?.price_jalingo || 0).toLocaleString()}</div>
                      ) : (
                        /* For commission staff: show both prices */
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600 dark:text-gray-400">In Jalingo:</div>
                          <div>₦{(item.items?.price_jalingo || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Outside Jalingo:</div>
                          <div>₦{(item.items?.price_outside || 0).toLocaleString()}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${item.location === 'Outside Jalingo' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {item.location === 'Outside Jalingo' ? 'Outside' : 'Inside'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">{formatQty(item.quantity || 0)}</td>
                    <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">{formatQty(item.quantity_sold || 0)}</td>
                    <td className="py-2 px-3 text-right text-orange-600 dark:text-orange-400 font-semibold">{formatQty(item.quantity_available || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
