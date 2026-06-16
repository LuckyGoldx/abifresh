'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { FileText, Download, Printer, Search, Filter, Eye, X, ChevronDown } from 'lucide-react';
import { printReceipt, downloadReceiptAsPDF } from '@/lib/receipt-utils';
import { formatQty } from '@/lib/format-quantity';
import { formatReceiptDate, formatReceiptTime } from '@/lib/format-date';
import type { Receipt, ReceiptItem } from '@/types';
import { AbifreshLoading } from '@/components/AbifreshLoading';
import { useAlert } from '@/context/AlertContext';

export default function AdminReceiptsPage() {
  const { user, token } = useAuthStore();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | 'cash' | 'pos' | 'transfer'>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'location-inside' | 'location-outside'>('date-desc');
  const [mounted, setMounted] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [itemNames, setItemNames] = useState<{ [key: string]: string }>({});
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const { alert: showAlert, confirm: showConfirm } = useAlert();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user && token) {
      fetchReceiptsAndStaff();
      fetchInventory();
    }
  }, [mounted, user, token]);

  const fetchReceiptsAndStaff = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all receipts
      const receiptsResponse = await api.get('/api/receipts/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const receiptsData = receiptsResponse.data || [];
      
      // Extract unique staff IDs and fetch staff details
      const staffIds = Array.from(
        new Map(receiptsData.map((r: Receipt) => [r.staff_id, r.staff_id])).values()
      );
      
      if (staffIds.length > 0) {
        try {
          const staffResponse = await api.get('/api/admin/staff', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const allStaff = staffResponse.data || [];
          
          // Create staff map
          const staffMap: { [key: string]: string } = {};
          allStaff.forEach((staff: any) => {
            staffMap[staff.id] = staff.full_name;
          });
          
          // Add staff names to receipts
          const receiptsWithStaff = receiptsData.map((receipt: Receipt) => ({
            ...receipt,
            staff_name: staffMap[receipt.staff_id!] || 'Unknown',
          }));
          
          setAllReceipts(receiptsWithStaff);
          setReceipts(receiptsWithStaff);
          
          // Build staff list for filter
          const uniqueStaff = allStaff.filter((staff: any) =>
            staffIds.includes(staff.id)
          );
          setStaffList(uniqueStaff);
        } catch (staffError) {
          console.error('Error fetching staff:', staffError);
          setAllReceipts(receiptsData);
          setReceipts(receiptsData);
        }
      } else {
        setAllReceipts([]);
        setReceipts([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const itemsResponse = await api.get('/api/inventory/active-store', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const itemMap: { [key: string]: string } = {};
      itemsResponse.data?.forEach((item: any) => {
        itemMap[item.id] = item.name;
      });
      setItemNames(itemMap);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = allReceipts;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter((receipt) =>
        receipt.receipt_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply payment method filter
    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter((receipt) => receipt.payment_method === filterPaymentMethod);
    }

    // Apply staff filter
    if (filterStaff !== 'all') {
      filtered = filtered.filter((receipt) => receipt.staff_id === filterStaff);
    }

    // Apply date range filter
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(
        (receipt) => new Date(receipt.created_at) >= start
      );
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (receipt) => new Date(receipt.created_at) <= end
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount-desc':
          return b.total_amount - a.total_amount;
        case 'amount-asc':
          return a.total_amount - b.total_amount;
        case 'location-inside':
          // Inside Jalingo first (sold_outside_jalingo === false/undefined first)
          return (a.sold_outside_jalingo ? 1 : 0) - (b.sold_outside_jalingo ? 1 : 0);
        case 'location-outside':
          // Outside Jalingo first
          return (b.sold_outside_jalingo ? 1 : 0) - (a.sold_outside_jalingo ? 1 : 0);
        default:
          return 0;
      }
    });

    setReceipts(sorted);
    setCurrentPage(1);
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filterPaymentMethod, filterStaff, startDate, endDate, sortBy, allReceipts]);

  const handleDownloadReceipt = async (receipt: Receipt) => {
    try {
      const items =
        receipt.receipt_items?.map((item) => {
          const itemName =
            typeof item.item_id === 'object'
              ? item.item_id.name
              : itemNames[item.item_id] || 'Item';
          const correctPrice =
            receipt.sold_outside_jalingo &&
            typeof item.item_id === 'object' &&
            item.item_id?.price_outside
              ? item.item_id.price_outside
              : typeof item.item_id === 'object' && item.item_id?.price_jalingo
              ? item.item_id.price_jalingo
              : item.unit_price || 0;
          return {
            name: itemName,
            sale_quantity: item.quantity,
            price: correctPrice,
          };
        }) || [];

      const receiptData = {
        receipt_number: receipt.receipt_number,
        timestamp: receipt.created_at,
        staff_name: receipt.staff_name || 'Unknown',
        payment_method: receipt.payment_method,
        items,
        total_amount: receipt.total_amount,
      };

      await downloadReceiptAsPDF(receiptData);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      showAlert('Failed to download receipt. Please try again.');
    }
  };

  const handlePrintReceipt = async (receipt: Receipt) => {
    try {
      const items =
        receipt.receipt_items?.map((item) => {
          const itemName =
            typeof item.item_id === 'object'
              ? item.item_id.name
              : itemNames[item.item_id] || 'Item';
          const correctPrice =
            receipt.sold_outside_jalingo &&
            typeof item.item_id === 'object' &&
            item.item_id?.price_outside
              ? item.item_id.price_outside
              : typeof item.item_id === 'object' && item.item_id?.price_jalingo
              ? item.item_id.price_jalingo
              : item.unit_price || 0;
          return {
            name: itemName,
            sale_quantity: item.quantity,
            price: correctPrice,
          };
        }) || [];

      const receiptData = {
        receipt_number: receipt.receipt_number,
        timestamp: receipt.created_at,
        staff_name: receipt.staff_name || 'Unknown',
        payment_method: receipt.payment_method,
        items,
        total_amount: receipt.total_amount,
      };

      await printReceipt(receiptData);
    } catch (error) {
      console.error('Error printing receipt:', error);
      showAlert('Failed to print receipt. Please try again.');
    }
  };

  const handleViewReceipt = async (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowDetails(true);
  };

  // Pagination
  const totalPages = Math.ceil(receipts.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const displayedReceipts = receipts.slice(startIdx, endIdx);

  // Statistics
  const stats = {
    total: receipts.length,
    totalAmount: receipts.reduce((sum, r) => sum + r.total_amount, 0),
    cash: receipts.filter((r) => r.payment_method === 'cash').length,
    pos: receipts.filter((r) => r.payment_method === 'pos').length,
    transfer: receipts.filter((r) => r.payment_method === 'transfer').length,
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Receipts History</h1>
        <p className="text-gray-600 dark:text-gray-400">Track all receipts from all staff members in real-time</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow overflow-hidden">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Receipts</p>
          <p className="break-words text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow overflow-hidden">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
          <p className="break-words text-2xl font-bold text-pink-600">₦{stats.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow overflow-hidden">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cash</p>
          <p className="break-words text-2xl font-bold text-green-600">{stats.cash}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow overflow-hidden">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">POS</p>
          <p className="break-words text-2xl font-bold text-blue-600">{stats.pos}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow overflow-hidden">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transfer</p>
          <p className="break-words text-2xl font-bold text-purple-600">{stats.transfer}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Filters & Search</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Receipt #
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="e.g., RCP-001"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="pos">POS</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {/* Staff */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Staff Member
            </label>
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Staff</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount (High to Low)</option>
              <option value="amount-asc">Amount (Low to High)</option>
              <option value="location-inside">Location: Inside Jalingo First</option>
              <option value="location-outside">Location: Outside Jalingo First</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Clear Filters */}
          {(searchQuery || filterPaymentMethod !== 'all' || filterStaff !== 'all' || startDate || endDate) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterPaymentMethod('all');
                  setFilterStaff('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 font-medium transition"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {displayedReceipts.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>No receipts found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Receipt #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Staff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Location
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 dark:text-white uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedReceipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {receipt.receipt_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {receipt.staff_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatReceiptDate(receipt.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatReceiptTime(receipt.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            receipt.payment_method === 'cash'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : receipt.payment_method === 'pos'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}
                        >
                          {receipt.payment_method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right">
                        ₦{receipt.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold text-xs">
                          {receipt.items_count ?? receipt.receipt_items?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {receipt.sold_outside_jalingo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 whitespace-nowrap">
                            Outside Jalingo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap">
                            Inside Jalingo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewReceipt(receipt)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownloadReceipt(receipt)}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(receipt)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {startIdx + 1} to {Math.min(endIdx, receipts.length)} of {receipts.length} receipts
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded transition ${
                          currentPage === pageNum
                            ? 'bg-pink-600 text-white'
                            : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Receipt Details Modal */}
      {showDetails && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Receipt #{selectedReceipt.receipt_number}
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Receipt Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Staff</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedReceipt.staff_name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment Method</p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">
                    {selectedReceipt.payment_method}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatReceiptDate(selectedReceipt.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatReceiptTime(selectedReceipt.created_at)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sale Location</p>
                  {selectedReceipt.sold_outside_jalingo ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      📍 Outside Jalingo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      📍 Inside Jalingo
                    </span>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Items</h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 dark:bg-gray-700 font-semibold text-sm text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                    <div>Item</div>
                    <div className="text-center">Qty</div>
                    <div className="text-right">Price</div>
                    <div className="text-right">Total</div>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                    {selectedReceipt.receipt_items?.map((item, idx) => {
                      const itemName =
                        typeof item.item_id === 'object'
                          ? item.item_id.name
                          : itemNames[item.item_id] || 'Item';
                      const correctPrice =
                        selectedReceipt.sold_outside_jalingo &&
                        typeof item.item_id === 'object' &&
                        item.item_id?.price_outside
                          ? item.item_id.price_outside
                          : typeof item.item_id === 'object' &&
                            item.item_id?.price_jalingo
                          ? item.item_id.price_jalingo
                          : item.unit_price || 0;
                      return (
                        <div key={idx} className="grid grid-cols-4 gap-4 p-4 text-sm text-gray-700 dark:text-gray-300">
                          <div>{itemName}</div>
                          <div className="text-center">{formatQty(item.quantity)}</div>
                          <div className="text-right">₦{correctPrice.toLocaleString()}</div>
                          <div className="text-right font-semibold text-gray-900 dark:text-white">
                            ₦{(correctPrice * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    Total Amount:
                  </span>
                  <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    ₦{selectedReceipt.total_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownloadReceipt(selectedReceipt);
                  setShowDetails(false);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium transition"
              >
                <Download size={18} /> Download
              </button>
              <button
                onClick={() => {
                  handlePrintReceipt(selectedReceipt);
                  setShowDetails(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium transition"
              >
                <Printer size={18} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
