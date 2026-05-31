'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Send, Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';
import type { Item, PostedItem, SalesStaff } from '@/types';

export default function PostItemsPage() {
  const [staffList, setStaffList] = useState<SalesStaff[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [postedItems, setPostedItems] = useState<PostedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [staffRes, itemsRes, postedRes] = await Promise.all([
        api.get('/api/sales/staff-list'),
        api.get('/api/sales/items/available'),
        api.get('/api/sales/posted-items'), // Get items posted by current user
      ]);

      setStaffList(staffRes.data || []);
      setAvailableItems(itemsRes.data || []);
      setPostedItems(postedRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedStaff || !selectedItem || !quantity) {
      setError('Please fill in all required fields');
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    const item = availableItems.find(i => i.id === selectedItem);
    if (!item || item.quantity < qty) {
      setError(`Not enough stock. Available: ${item?.quantity || 0}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/api/staff/post-items-to-staff', {
        staff_id: selectedStaff,
        item_id: selectedItem,
        quantity: qty,
        notes: notes || null,
      });

      setSuccess(`Successfully posted ${item.name} to staff member!`);
      
      // Reset form
      setSelectedStaff('');
      setSelectedItem('');
      setQuantity('');
      setNotes('');

      // Refresh data
      fetchData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to post items');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5" />;
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
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
      <div className="flex items-center gap-2">
        <Send className="w-8 h-8 text-pink-500" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Post Items to Staff</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Send Items to Staff</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Staff */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Staff Member *
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Choose a staff member...</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role_display})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Item */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Item *
                </label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Choose an item...</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - â‚¦{(item.price_jalingo || 0).toLocaleString()} (Available: {formatQty(item.quantity)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quantity to Post *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input"
                  min="1"
                  required
                  placeholder="Enter quantity"
                />
                {selectedItem && availableItems.find(i => i.id === selectedItem) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formatQty(availableItems.find(i => i.id === selectedItem)?.quantity || 0)}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Add any notes or instructions..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Items to Staff'}
              </button>
            </form>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="space-y-4">
          <div className="card bg-blue-50 dark:bg-blue-900">
            <p className="text-sm text-blue-700 dark:text-blue-200">Total Staff Members</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{staffList.length}</p>
          </div>

          <div className="card bg-purple-50 dark:bg-purple-900">
            <p className="text-sm text-purple-700 dark:text-purple-200">Items in Stock</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {formatQty(availableItems.reduce((sum, i) => sum + i.quantity, 0))}
            </p>
          </div>

          <div className="card bg-green-50 dark:bg-green-900">
            <p className="text-sm text-green-700 dark:text-green-200">Items Posted</p>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">{postedItems.length}</p>
          </div>
        </div>
      </div>

      {/* Posted Items History */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Items Posted by You</h2>

        {postedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No items posted yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4">Item</th>
                  <th className="text-left py-3 px-4">Staff Member</th>
                  <th className="text-left py-3 px-4">Quantity</th>
                  <th className="text-left py-3 px-4">Date Posted</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {postedItems.map((item) => (
                  <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4 font-medium">{item.item_name}</td>
                    <td className="py-3 px-4">{item.staff_name}</td>
                    <td className="py-3 px-4">{formatQty(item.quantity)}</td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(item.posted_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
