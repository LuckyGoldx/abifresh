'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Package, CheckCircle, XCircle, MessageSquare, User, Calendar, Truck, Building2, Clock } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';

import type { PostedItem } from '@/types';

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 z-[100] animate-pulse`}>
      {icon}
      <span>{message}</span>
    </div>
  );
};

export default function PostedItemsPage() {
  const [items, setItems] = useState<PostedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PostedItem | null>(null);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPostedItems();
  }, []);

  const fetchPostedItems = async () => {
    try {
      const response = await api.get('/api/staff/posted-items');
      console.log('📦 [Staff] Received posted items:', response.data);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch posted items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (item: PostedItem, action: 'accept' | 'reject') => {
    setSelectedItem(item);
    setActionType(action);
    setComment(item.staff_comment || '');
  };

  const confirmAction = async () => {
    if (!selectedItem || !actionType || processing) return;

    setProcessing(true);
    try {
      await api.post(`/api/staff/posted-items/${selectedItem.id}/${actionType}`, {
        comment: comment.trim() || null,
      });

      setToast({ message: `Item ${actionType}ed successfully!`, type: 'success' });
      // Optimistically remove the item from the list so it disappears instantly
      const processedId = selectedItem.id;
      setItems(prev => prev.filter(item => item.id !== processedId));
      
      setSelectedItem(null);
      setActionType(null);
      setComment('');
      fetchPostedItems();
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || `Failed to ${actionType} item`, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full text-xs flex items-center gap-1 font-semibold">
            <CheckCircle className="w-3 h-3" /> Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 rounded-full text-xs flex items-center gap-1 font-semibold">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 rounded-full text-xs font-semibold">
            Pending
          </span>
        );
    }
  };

  const pendingItems = items.filter(i => i.status === 'pending');
  const acceptedItems = items.filter(i => i.status === 'accepted');
  const rejectedItems = items.filter(i => i.status === 'rejected');

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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Package className="w-8 h-8 text-pink-500" />
          Posted Items
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Items posted to you by sales personnel
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 overflow-hidden">
          <p className="text-sm text-yellow-700 dark:text-yellow-200">Pending</p>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 break-words">{pendingItems.length}</p>
        </div>
        <div className="card bg-green-50 dark:bg-green-900 border-l-4 border-green-500 overflow-hidden">
          <p className="text-sm text-green-700 dark:text-green-200">Accepted</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100 break-words">{acceptedItems.length}</p>
        </div>
        <div className="card bg-red-50 dark:bg-red-900 border-l-4 border-red-500 overflow-hidden">
          <p className="text-sm text-red-700 dark:text-red-200">Rejected</p>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100 break-words">{rejectedItems.length}</p>
        </div>
      </div>

      {/* Posted Items Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Item Name</th>
                <th className="text-left py-3 px-4">Quantity</th>
                <th className="text-left py-3 px-4">Location</th>
                <th className="text-left py-3 px-4">Posted By</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(item.posted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.posted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{item.item_name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded font-semibold">
                      {formatQty(item.quantity)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs ${item.location === 'Outside Jalingo' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                      {item.location === 'Outside Jalingo' ? (
                        <><Truck className="w-3.5 h-3.5" /> Outside Jalingo</>
                      ) : (
                        <><Building2 className="w-3.5 h-3.5" /> Inside Jalingo</>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      {item.posted_by}
                    </div>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4">
                    {item.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(item, 'accept')}
                          disabled={processing}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(item, 'reject')}
                          disabled={processing}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {item.staff_comment && (
                          <div className="flex items-start gap-1">
                            <MessageSquare className="w-4 h-4 mt-0.5" />
                            <span className="italic">"{item.staff_comment}"</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No posted items yet</p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedItem && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {actionType === 'accept' ? 'Accept' : 'Reject'} Item
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Item:</strong> {selectedItem.item_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Quantity:</strong> {formatQty(selectedItem.quantity)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <strong>Location:</strong> {selectedItem.location || 'Inside Jalingo'}
              </p>
              
              <label className="block text-sm font-medium mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Add Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Add any notes or comments..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmAction}
                disabled={processing}
                className={`flex-1 py-2 px-4 rounded font-semibold text-white ${
                  actionType === 'accept'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}
              >
                {processing ? 'Processing...' : `Confirm ${actionType === 'accept' ? 'Accept' : 'Reject'}`}
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setActionType(null);
                  setComment('');
                }}
                disabled={processing}
                className="flex-1 py-2 px-4 rounded font-semibold bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
