'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Package, CheckCircle, XCircle, MessageSquare, User, Calendar } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';

interface PostedItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  status: 'pending' | 'accepted' | 'rejected';
  posted_at: string;
  posted_by: string;
  staff_comment: string | null;
  notes: string | null;
}

export default function PostedItemsPage() {
  const [items, setItems] = useState<PostedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PostedItem | null>(null);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPostedItems();
  }, []);

  const fetchPostedItems = async () => {
    try {
      const response = await api.get('/api/staff/posted-items');
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
    if (!selectedItem || !actionType) return;

    setProcessing(true);
    try {
      await api.post(`/api/staff/posted-items/${selectedItem.id}/${actionType}`, {
        comment: comment.trim() || null,
      });

      alert(`Item ${actionType}ed successfully!`);
      setSelectedItem(null);
      setActionType(null);
      setComment('');
      fetchPostedItems();
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to ${actionType} item`);
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
    return <div className="text-center py-12">Loading posted items...</div>;
  }

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500">
          <p className="text-sm text-yellow-700 dark:text-yellow-200">Pending</p>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{pendingItems.length}</p>
        </div>
        <div className="card bg-green-50 dark:bg-green-900 border-l-4 border-green-500">
          <p className="text-sm text-green-700 dark:text-green-200">Accepted</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">{acceptedItems.length}</p>
        </div>
        <div className="card bg-red-50 dark:bg-red-900 border-l-4 border-red-500">
          <p className="text-sm text-red-700 dark:text-red-200">Rejected</p>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100">{rejectedItems.length}</p>
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
                <th className="text-left py-3 px-4">Posted By</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {new Date(item.posted_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{item.item_name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded font-semibold">
                      {formatQty(item.quantity)}
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
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(item, 'reject')}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm flex items-center gap-1"
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <strong>Quantity:</strong> {formatQty(selectedItem.quantity)}
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
