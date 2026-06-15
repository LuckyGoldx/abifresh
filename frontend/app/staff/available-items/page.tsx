'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Package, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';

import type { PostedItem } from '@/types';

export default function AvailableItemsPage() {
  const [postedItems, setPostedItems] = useState<PostedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPostedItems();
  }, []);

  const fetchPostedItems = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/staff/posted-items');
      setPostedItems(response.data || []);
    } catch (error: any) {
      console.error('Error fetching posted items:', error);
      setError('Failed to load posted items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      setIsUpdating(id);
      setError('');
      setSuccess('');

      await api.post(`/api/staff/posted-items/${id}/accept`);
      
      setSuccess('Item accepted! You can now sell it.');
      fetchPostedItems();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to accept item');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    try {
      setIsUpdating(id);
      setError('');
      setSuccess('');

      await api.post(`/api/staff/posted-items/${id}/reject`, { reason });
      
      setSuccess('Item rejected.');
      fetchPostedItems();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to reject item');
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Accepted
          </div>
        );
      case 'pending':
        return (
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Pending Review
          </div>
        );
      case 'rejected':
        return (
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Rejected
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) return <AbifreshLoading />;

  const pendingItems = postedItems.filter(i => i.status === 'pending');
  const acceptedItems = postedItems.filter(i => i.status === 'accepted');
  const rejectedItems = postedItems.filter(i => i.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="w-8 h-8 text-pink-500" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Items Posted to You</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 overflow-hidden">
          <p className="text-sm text-yellow-700 dark:text-yellow-200">Pending Review</p>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 break-words">{pendingItems.length}</p>
        </div>

        <div className="card bg-green-50 dark:bg-green-900 border-l-4 border-green-500 overflow-hidden">
          <p className="text-sm text-green-700 dark:text-green-200">Accepted & Ready to Sell</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100 break-words">{acceptedItems.length}</p>
          <p className="text-xs text-green-600 dark:text-green-300 mt-1">
            Total qty: {acceptedItems.reduce((sum, i) => sum + i.quantity, 0)}
          </p>
        </div>

        <div className="card bg-red-50 dark:bg-red-900 border-l-4 border-red-500 overflow-hidden">
          <p className="text-sm text-red-700 dark:text-red-200">Rejected</p>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100 break-words">{rejectedItems.length}</p>
        </div>
      </div>

      {/* Pending Items */}
      {pendingItems.length > 0 && (
        <div className="card border-2 border-yellow-200 dark:border-yellow-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
            <Clock className="w-5 h-5" />
            Pending Review
          </h2>

          <div className="space-y-3">
            {pendingItems.map((item) => (
              <div key={item.id} className="border dark:border-gray-700 p-4 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 dark:text-white">{item.item_name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Posted by: {item.posted_by}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quantity: <span className="font-bold">{formatQty(item.quantity)}</span>
                  </p>
                  {item.notes && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                      Notes: {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(item.id)}
                    disabled={isUpdating === item.id}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium disabled:opacity-50"
                  >
                    {isUpdating === item.id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={isUpdating === item.id}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium disabled:opacity-50"
                  >
                    {isUpdating === item.id ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Items */}
      {acceptedItems.length > 0 && (
        <div className="card border-2 border-green-200 dark:border-green-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-900 dark:text-green-100">
            <CheckCircle className="w-5 h-5" />
            Ready to Sell
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4">Item</th>
                  <th className="text-left py-3 px-4">Quantity</th>
                  <th className="text-left py-3 px-4">Posted By</th>
                  <th className="text-left py-3 px-4">Accepted Date</th>
                  <th className="text-left py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {acceptedItems.map((item) => (
                  <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4 font-medium">{item.item_name}</td>
                    <td className="py-3 px-4 font-bold">{formatQty(item.quantity)}</td>
                    <td className="py-3 px-4 text-sm">{item.posted_by}</td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(item.posted_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <a href="/staff/make-sale" className="text-blue-600 dark:text-blue-400 hover:underline">
                        Make Sale
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejected Items */}
      {rejectedItems.length > 0 && (
        <div className="card border-2 border-red-200 dark:border-red-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-900 dark:text-red-100">
            <XCircle className="w-5 h-5" />
            Rejected
          </h2>

          <div className="space-y-3">
            {rejectedItems.map((item) => (
              <div key={item.id} className="border dark:border-gray-700 p-4 rounded">
                <h3 className="font-bold text-gray-800 dark:text-white">{item.item_name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quantity: {formatQty(item.quantity)}</p>
                {item.staff_comment && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                    Reason: {item.staff_comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {postedItems.length === 0 && (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No items have been posted to you yet</p>
        </div>
      )}
    </div>
  );
}
