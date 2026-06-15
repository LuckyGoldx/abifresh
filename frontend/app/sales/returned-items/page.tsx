'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Check, X, AlertCircle, CheckCircle, Clock, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatQty } from '@/lib/format-quantity';

interface ReturnedItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  requester_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  reject_reason?: string;
  created_at: string;
  updated_at: string;
}

export default function ReturnedItemsPage() {
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [returnedItems, setReturnedItems] = useState<ReturnedItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedRejectItem, setSelectedRejectItem] = useState<string>('');
  const [selectedAcceptItem, setSelectedAcceptItem] = useState<ReturnedItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<ReturnedItem | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const openDetailModal = (item: ReturnedItem) => {
    setSelectedDetailItem(item);
    setShowDetailModal(true);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/sales/returned-items');
      setReturnedItems(res.data);
    } catch (error) {
      console.error('Error fetching returned items:', error);
      toast.error('Failed to load returned items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptClick = (item: ReturnedItem) => {
    setSelectedAcceptItem(item);
    setShowAcceptModal(true);
  };

  const handleAcceptConfirm = async () => {
    if (!selectedAcceptItem) return;

    try {
      setIsSubmitting(true);
      await api.post(`/api/sales/returned-items/${selectedAcceptItem.id}/accept`);
      toast.success('✅ Returned item accepted and moved to active store');
      setShowAcceptModal(false);
      setSelectedAcceptItem(null);
      // If detail modal was open for this item, close it
      if (selectedDetailItem?.id === selectedAcceptItem.id) {
        setShowDetailModal(false);
        setSelectedDetailItem(null);
      }
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = (item: ReturnedItem) => {
    setSelectedRejectItem(item.id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/api/sales/returned-items/${selectedRejectItem}/reject`, {
        reject_reason: rejectionReason,
      });
      toast.success('✅ Item rejected and returned to requester');
      setShowRejectModal(false);
      // If detail modal was open for this item, close it
      if (selectedDetailItem?.id === selectedRejectItem) {
        setShowDetailModal(false);
        setSelectedDetailItem(null);
      }
      setSelectedRejectItem('');
      setRejectionReason('');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = returnedItems.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const pendingCount = returnedItems.filter((i) => i.status === 'pending').length;
  const acceptedCount = returnedItems.filter((i) => i.status === 'accepted').length;
  const rejectedCount = returnedItems.filter((i) => i.status === 'rejected').length;

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CheckCircle className="w-10 h-10 text-green-500" />
            Returned Items
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and manage items returned by staff members
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {pendingCount > 0 && (
            <div className="px-6 py-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg overflow-hidden">
              <p className="text-sm font-medium">Pending Review</p>
              <p className="break-words text-2xl font-bold">{pendingCount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {[
          { value: 'all' as const, label: 'All Items', count: returnedItems.length },
          { value: 'pending' as const, label: 'Pending', count: pendingCount },
          { value: 'accepted' as const, label: 'Accepted', count: acceptedCount },
          { value: 'rejected' as const, label: 'Rejected', count: rejectedCount },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === tab.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {filterStatus === 'all'
              ? 'No returned items yet'
              : `No ${filterStatus} items`}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    From (Requester)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total Value
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
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.item_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.requester_name}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatQty(item.quantity)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      ₦{item.unit_price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      ₦{(item.quantity * item.unit_price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200">
                          <Clock size={16} />
                          Pending
                        </span>
                      )}
                      {item.status === 'accepted' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                          <CheckCircle size={16} />
                          Accepted
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
                          <AlertCircle size={16} />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => openDetailModal(item)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                        >
                          <Eye size={16} />
                          View
                        </button>
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptClick(item)}
                              disabled={isSubmitting}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded font-medium transition flex items-center gap-1"
                              title="Accept to active store"
                            >
                              <Check size={16} />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectClick(item)}
                              disabled={isSubmitting}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded font-medium transition flex items-center gap-1"
                              title="Reject and return to requester"
                            >
                              <X size={16} />
                              Reject
                            </button>
                          </>
                        )}
                        {item.status === 'accepted' && (
                          <span className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-full">
                            Accepted
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full">
                            Rejected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accept Confirmation Modal */}
      {showAcceptModal && selectedAcceptItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Accept Returned Item
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Are you sure you want to accept this returned item? It will be moved to the active store.
            </p>

            <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 my-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Item</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAcceptItem.item_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Quantity</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatQty(selectedAcceptItem.quantity)} units</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">From</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAcceptItem.requester_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total Value</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">₦{(selectedAcceptItem.quantity * selectedAcceptItem.unit_price).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAcceptModal(false);
                  setSelectedAcceptItem(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptConfirm}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Accepting...' : <><Check size={18} /> Accept Item</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Reject Returned Item
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this returned item. The item will be returned
              to the requester's store.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Item is damaged, item is expired, etc."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRejectItem('');
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition"
              >
                {isSubmitting ? 'Submitting...' : 'Reject Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDetailItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Returned Item Details
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDetailItem(null);
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
                      {selectedDetailItem.item_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Quantity
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatQty(selectedDetailItem.quantity)} units
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Unit Price
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₦{selectedDetailItem.unit_price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Total Value
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₦{(selectedDetailItem.quantity * selectedDetailItem.unit_price).toLocaleString()}
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
                      From (Requester)
                    </p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {selectedDetailItem.requester_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <div className="mt-1">
                      {selectedDetailItem.status === 'pending' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200">
                          <Clock size={16} />
                          Pending
                        </span>
                      )}
                      {selectedDetailItem.status === 'accepted' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                          <CheckCircle size={16} />
                          Accepted
                        </span>
                      )}
                      {selectedDetailItem.status === 'rejected' && (
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
                        Return Sent
                      </p>
                      <p className="text-base text-gray-900 dark:text-white mt-1">
                        {formatDate(selectedDetailItem.created_at)}
                      </p>
                    </div>
                  </div>
                  {selectedDetailItem.status !== 'pending' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                          Last Updated
                        </p>
                        <p className="text-base text-gray-900 dark:text-white mt-1">
                          {formatDate(selectedDetailItem.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Reason Section - Only show if rejected */}
              {selectedDetailItem.status === 'rejected' && selectedDetailItem.reject_reason && (
                <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 dark:bg-red-900 rounded">
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-200 uppercase mb-2">
                    Rejection Reason
                  </h3>
                  <p className="text-base text-red-800 dark:text-red-100">
                    {selectedDetailItem.reject_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDetailItem(null);
                }}
                className={`${selectedDetailItem.status === 'pending' ? '' : 'flex-1'} px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition`}
              >
                Close
              </button>
              {selectedDetailItem.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAcceptClick(selectedDetailItem)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectClick(selectedDetailItem)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
