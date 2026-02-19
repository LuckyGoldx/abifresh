'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Plus, Trash2, X, Check, Clock, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AvailableItem {
  id: string;
  name: string;
  unit_price: number;
  available_quantity: number;
}

interface ReturnRequest {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  status: 'pending' | 'accepted' | 'rejected';
  reject_reason?: string;
  receiver_name: string;
  created_at: string;
  updated_at: string;
  item_id: string;
}

interface SalesStaff {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Stats {
  total_returned: number;
  pending_to_accept: number;
  available_for_return: number;
}

export default function ReturnItemsPage() {
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<ReturnRequest | null>(null);
  const [stats, setStats] = useState<Stats>({
    total_returned: 0,
    pending_to_accept: 0,
    available_for_return: 0,
  });
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [salesStaff, setSalesStaff] = useState<any[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);

  // Form state
  const [selectedSalesStaff, setSelectedSalesStaff] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    Array<{ item_id: string; quantity: number; unit_price: number }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
      // REMOVED: Auto-refresh interval. Now manual refresh only via button.
    }
  }, [mounted]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch stats
      const statsRes = await api.get('/api/staff/returns/stats');
      setStats(statsRes.data);

      // Fetch available items for return (excludes pending/accepted items)
      const itemsRes = await api.get('/api/staff/available-items-for-return');
      setAvailableItems(itemsRes.data);

      // Fetch all return requests (for status tracking)
      const returnsRes = await api.get('/api/staff/returns');
      setReturnRequests(returnsRes.data);

      // Fetch sales staff only (role = 'sales' or 'sales_staff')
      try {
        const staffRes = await api.get('/api/staff/sales-staff');
        setSalesStaff(staffRes.data || []);
      } catch (staffError: any) {
        console.error('❌ Error fetching sales staff:', staffError?.response?.data || staffError?.message);
        setSalesStaff([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate remaining available quantity for an item after selections
  const getRemainingAvailable = (itemId: string): number => {
    const item = availableItems.find((i) => i.id === itemId);
    if (!item) return 0;
    
    const selectedQty = selectedItems
      .filter((i) => i.item_id === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    
    return item.available_quantity - selectedQty;
  };

  const handleAddItem = (itemId: string, isChecked: boolean) => {
    if (isChecked) {
      // Add item with default quantity of 1
      const item = availableItems.find((i) => i.id === itemId);
      if (!item) return;

      const existing = selectedItems.find((i) => i.item_id === itemId);
      if (!existing) {
        setSelectedItems([
          ...selectedItems,
          {
            item_id: itemId,
            quantity: 1,
            unit_price: item.unit_price,
          },
        ]);
      }
    } else {
      // Remove item when unchecked
      handleRemoveItem(itemId);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.item_id !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const item = availableItems.find((i) => i.id === itemId);
    if (!item) return;

    // Validate: quantity must be between 1 and available_quantity
    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    if (quantity > item.available_quantity) {
      toast.error(`Maximum available: ${item.available_quantity}`);
      return;
    }

    setSelectedItems(
      selectedItems.map((i) =>
        i.item_id === itemId ? { ...i, quantity } : i
      )
    );
  };

  const handleSubmitReturn = async () => {
    try {
      if (!selectedSalesStaff) {
        toast.error('Please select a sales staff');
        return;
      }

      if (selectedItems.length === 0) {
        toast.error('Please select at least one item');
        return;
      }

      setIsSubmitting(true);

      await api.post('/api/staff/returns', {
        receiver_staff_id: selectedSalesStaff,
        items: selectedItems,
      });

      toast.success('✅ Return request created successfully');
      setSelectedSalesStaff('');
      setSelectedItems([]);
      setShowAddModal(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetailModal = (request: ReturnRequest) => {
    setSelectedDetailRequest(request);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Trash2 className="w-10 h-10 text-red-500" />
            Return Items
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Return unsold items back to sales staff
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2 transition shadow-lg hover:shadow-xl"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center gap-2 transition shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Request Return
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Returned Items
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.total_returned}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            ✓ Successfully returned to active store
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Pending Accept/Reject
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.pending_to_accept}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            ⏳ Awaiting sales staff review
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Available for Return
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.available_for_return}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            📦 Items in your store
          </p>
        </div>
      </div>

      {/* Return Requests List */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Your Return Requests
        </h2>

        {isLoading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            Loading return requests...
          </div>
        ) : returnRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No return requests yet. Request returns to get started!
            </p>
          </div>
        ) : (
          <div>
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-semibold">ℹ️ Important:</span> Items with status <span className="font-semibold text-yellow-600 dark:text-yellow-300">Pending</span> or <span className="font-semibold text-green-600 dark:text-green-300">Accepted</span> cannot be sold or resent. They are locked in the return process until the sales staff accepts or rejects them.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Sent To
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Sent Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {returnRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {request.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {request.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {request.receiver_name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {request.status === 'pending' && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200">
                            <Clock size={16} />
                            Pending
                          </span>
                        )}
                        {request.status === 'accepted' && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                            <Check size={16} />
                            Accepted
                          </span>
                        )}
                        {request.status === 'rejected' && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
                            <AlertCircle size={16} />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => openDetailModal(request)}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Add Return Request Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Request Return
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedSalesStaff('');
                  setSelectedItems([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            {/* Sales Staff Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Send Return Request To *
              </label>
              {salesStaff.length === 0 ? (
                <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 font-medium">
                    ❌ No sales staff available
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    There are no sales staff members in the system. Please contact an administrator.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedSalesStaff}
                  onChange={(e) => setSelectedSalesStaff(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Select Sales Staff --</option>
                  {salesStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name} ({staff.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Items Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Items to Return
              </h3>

              {availableItems.length === 0 ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                    ℹ️ No items available for return
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    All your items are either:
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 list-disc pl-5 space-y-1">
                    <li>Already pending return (awaiting sales staff review)</li>
                    <li>Already accepted and moved to active store</li>
                    <li>Not in your store inventory</li>
                  </ul>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    Items pending return cannot be resent or sold until the sales staff accepts or rejects them.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  {availableItems.map((item) => {
                    const selectedItem = selectedItems.find((i) => i.item_id === item.id);
                    const remainingQuantity = item.available_quantity - (selectedItem?.quantity || 0);
                    
                    // Only show items with remaining quantity > 0
                    if (remainingQuantity <= 0) return null;
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedItem}
                          onChange={(e) => handleAddItem(item.id, e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ₦{item.unit_price.toLocaleString()} | Available: {remainingQuantity}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Items to Return ({selectedItems.length})
                </h3>
                <div className="space-y-3 border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {selectedItems.map((selectedItem) => {
                    const item = availableItems.find((i) => i.id === selectedItem.item_id);
                    return (
                      <div
                        key={selectedItem.item_id}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900 rounded"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            max={item?.available_quantity || 1}
                            value={selectedItem.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                selectedItem.item_id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            / {item?.available_quantity}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(selectedItem.item_id)}
                            className="p-2 text-red-600 hover:bg-red-200 dark:hover:bg-red-900 rounded transition"
                            title="Remove item"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary */}
            {selectedItems.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total items to return: <span className="font-bold text-gray-900 dark:text-white">{selectedItems.reduce((sum, i) => sum + i.quantity, 0)}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total value: <span className="font-bold text-gray-900 dark:text-white">₦{selectedItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0).toLocaleString()}</span>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedSalesStaff('');
                  setSelectedItems([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={isSubmitting || !selectedSalesStaff || selectedItems.length === 0}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDetailRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Return Request Details
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDetailRequest(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Grid */}
            <div className="space-y-4 mb-6">
              {/* Item Information Section */}
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  Item Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Item Name
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedDetailRequest.item_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Quantity
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedDetailRequest.quantity} units
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Unit Price
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₦{selectedDetailRequest.unit_price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Total Value
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₦{(selectedDetailRequest.quantity * selectedDetailRequest.unit_price).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Information Section */}
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  Request Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Sent To
                    </p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {selectedDetailRequest.receiver_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <div className="mt-1">
                      {selectedDetailRequest.status === 'pending' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200">
                          <Clock size={16} />
                          Pending
                        </span>
                      )}
                      {selectedDetailRequest.status === 'accepted' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                          <Check size={16} />
                          Accepted
                        </span>
                      )}
                      {selectedDetailRequest.status === 'rejected' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
                          <AlertCircle size={16} />
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                        Request Created
                      </p>
                      <p className="text-base text-gray-900 dark:text-white mt-1">
                        {formatDate(selectedDetailRequest.created_at)}
                      </p>
                    </div>
                  </div>
                  {selectedDetailRequest.status !== 'pending' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                          Last Updated
                        </p>
                        <p className="text-base text-gray-900 dark:text-white mt-1">
                          {formatDate(selectedDetailRequest.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Reason Section - Only show if rejected */}
              {selectedDetailRequest.status === 'rejected' && selectedDetailRequest.reject_reason && (
                <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 dark:bg-red-900 rounded">
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-200 uppercase mb-2">
                    Rejection Reason
                  </h3>
                  <p className="text-base text-red-800 dark:text-red-100">
                    {selectedDetailRequest.reject_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDetailRequest(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition"
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
