'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Send, Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';
import type { Item, PostedItem, SalesStaff } from '@/types';
import { AbifreshLoading } from '@/components/AbifreshLoading';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ itemName: string; staffName: string; quantity: number } | null>(null);

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

      const staffName = staffList.find(s => s.id === selectedStaff)?.name || 'Staff';
      setSuccessInfo({ itemName: item.name, staffName, quantity: qty });
      setShowSuccessModal(true);
      
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

  if (isLoading) return <AbifreshLoading />;

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
          <div className="card bg-blue-50 dark:bg-blue-900 overflow-hidden">
            <p className="text-sm text-blue-700 dark:text-blue-200">Total Staff Members</p>
            <p className="break-words text-3xl font-bold text-blue-900 dark:text-blue-100">{staffList.length}</p>
          </div>

          <div className="card bg-purple-50 dark:bg-purple-900 overflow-hidden">
            <p className="text-sm text-purple-700 dark:text-purple-200">Items in Stock</p>
            <p className="break-words text-3xl font-bold text-purple-900 dark:text-purple-100">
              {formatQty(availableItems.reduce((sum, i) => sum + i.quantity, 0))}
            </p>
          </div>

          <div className="card bg-green-50 dark:bg-green-900 overflow-hidden">
            <p className="text-sm text-green-700 dark:text-green-200">Items Posted</p>
            <p className="break-words text-3xl font-bold text-green-900 dark:text-green-100">{postedItems.length}</p>
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

      {/* SUCCESS MODAL */}
      {showSuccessModal && successInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl border dark:border-gray-700 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Posted Successfully!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              <strong className="text-gray-800 dark:text-gray-200">{successInfo.itemName}</strong> has been posted to <strong className="text-gray-800 dark:text-gray-200">{successInfo.staffName}</strong>
            </p>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 border border-green-200 dark:border-green-900/30 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Quantity</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatQty(successInfo.quantity)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessInfo(null);
              }}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3.5 rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
            >
              DONE
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
