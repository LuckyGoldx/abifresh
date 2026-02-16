'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Send, Plus, Minus, Trash2, Users, CheckCircle, AlertCircle, ShoppingBag, X } from 'lucide-react';

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 z-50 animate-pulse`}>
      {icon}
      <span>{message}</span>
    </div>
  );
};

// Helper function to display role names nicely
const displayRoleName = (role: string): string => {
  const roleMap: { [key: string]: string } = {
    'commission_staff': 'Commission Staff',
    'non_commission_staff': 'Non-commission Staff',
    'sales_staff': 'Sales Staff',
    'sales': 'Sales',
  };
  return roleMap[role] || role.replace(/_/g, ' ');
};

interface Item {
  id: string;
  name: string;
  sku: string;
  price_jalingo: number;
  unit_price?: number;
  active_store_quantity: number;
  commission: number;
  category: string;
  brand?: string;
  package_type?: string;
  price_outside?: number;
  image_url?: string;
}

interface CartItem extends Item {
  post_quantity: number;
}

interface Staff {
  id: string;
  full_name: string;
  username: string;
  role: string;
}

export default function PostItemsPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user && token) {
      loadAllData();
    }
  }, [mounted, user, token]);

  const loadAllData = async () => {
    try {
      await Promise.all([
        fetchItems(),
        fetchStaff(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/active-store', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // Only show available items (active_store_quantity > 0)
      const available = response.data.filter((item: Item) => item.active_store_quantity > 0);
      setItems(available);
      setFilteredItems(available);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      console.log('🔍 Fetching staff list...');
      const response = await api.get('/api/admin/staff', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('✅ Staff response:', response.data);
      console.log('✅ All roles found:', response.data.map((s: Staff) => s.role));
      
      // Filter to show ONLY commission_staff and non_commission_staff
      const filteredStaff = response.data.filter((s: Staff) => {
        const role = s.role?.toLowerCase() || '';
        const isCommissionStaff = role === 'commission_staff' || role === 'staff_commission';
        const isNonCommissionStaff = role === 'non_commission_staff' || role === 'staff_non_commission';
        const notCurrentUser = s.id !== user?.id;
        return (isCommissionStaff || isNonCommissionStaff) && notCurrentUser;
      });
      
      console.log('✅ Filtered staff (commission & non-commission only):', filteredStaff);
      setStaffList(filteredStaff);
      
      if (filteredStaff.length === 0) {
        console.warn('⚠️ No commission or non-commission staff found');
        console.warn('⚠️ Total users in response:', response.data.length);
        console.warn('⚠️ Current user ID:', user?.id);
        setToast({ message: 'No staff members available to post to. Please create commission or non-commission staff first.', type: 'error' });
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch staff:', error);
      console.error('❌ Error details:', error.response?.data);
      setToast({ message: 'Failed to load staff list: ' + (error.response?.data?.error || error.message), type: 'error' });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.sku.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  };

  const addToCart = (item: Item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing && existing.post_quantity < item.active_store_quantity) {
      setCart(cart.map(c => c.id === item.id ? { ...c, post_quantity: c.post_quantity + 1 } : c));
      setToast({ message: `${item.name} quantity increased`, type: 'success' });
    } else if (!existing) {
      setCart([...cart, { ...item, post_quantity: 1 }]);
      setToast({ message: `${item.name} added`, type: 'success' });
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.id !== itemId));
    setToast({ message: 'Item removed from posting', type: 'success' });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(c => c.id === itemId ? { ...c, post_quantity: quantity } : c));
    }
  };

  const handlePostItems = async () => {
    if (!selectedStaff || cart.length === 0) {
      setToast({ message: 'Please select a staff member and add items', type: 'error' });
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  const confirmPostItems = async () => {
    try {
      const postData = {
        staff_id: selectedStaff,
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.post_quantity,
          unit_price: item.price_jalingo || 0,
        })),
        total_items: cart.reduce((sum, item) => sum + item.post_quantity, 0),
      };

      await api.post('/api/sales/post-items', postData, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const staffName = staffList.find(s => s.id === selectedStaff)?.full_name || 'Staff';
      setToast({ message: `${cart.length} item(s) successfully posted to ${staffName}!`, type: 'success' });
      setCart([]);
      setSelectedStaff('');
      setShowConfirmation(false);
      setShowMobileCart(false);
      await loadAllData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to post items';
      setToast({ message: errorMsg, type: 'error' });
      setShowConfirmation(false);
    }
  };

  if (!mounted || isLoading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div>;
  }

  const totalValue = cart.reduce((sum, item) => sum + ((item.price_jalingo || 0) * item.post_quantity), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Send className="w-8 h-8 text-pink-500" />
          Post Items to Staff
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search Box */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <input
              type="text"
              placeholder="Search items by name, SKU or category..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition cursor-pointer group"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-pink-600 transition">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
                  </div>
                  <p className="text-lg font-bold text-pink-600 dark:text-pink-400 mb-2">
                    ₦{(item.price_jalingo || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Available: {item.active_store_quantity}
                  </p>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-2 lg:col-span-3 text-center py-12 text-gray-600 dark:text-gray-400">
                <p>No available items found</p>
              </div>
            )}
          </div>
        </div>

        {/* Posting Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-4 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-500" />
              Post Summary
            </h2>

            {/* Staff Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Select Staff to Post To
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-pink-500 transition"
              >
                <option value="">Choose a staff member...</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name} ({displayRoleName(staff.role)})
                  </option>
                ))}
              </select>
            </div>

            {selectedStaff && (
              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 border border-pink-200 dark:border-pink-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Selected:</strong> {staffList.find(s => s.id === selectedStaff)?.full_name}
                </p>
              </div>
            )}

            {/* Items in Cart */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Items to Post ({cart.length})
              </h3>
              {cart.length > 0 ? (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">₦{(item.price_jalingo || 0).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-600 rounded px-2 py-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.post_quantity - 1)}
                          className="text-gray-600 dark:text-gray-300 hover:text-pink-600 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.post_quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-8 text-center bg-transparent text-gray-900 dark:text-white font-semibold"
                          min="1"
                          max={item.active_store_quantity}
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.post_quantity + 1)}
                          disabled={item.post_quantity >= item.active_store_quantity}
                          className="text-gray-600 dark:text-gray-300 hover:text-pink-600 disabled:opacity-50 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-right text-sm font-semibold text-gray-900 dark:text-white mt-1">
                        ₦{(item.unit_price * item.post_quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 py-4 text-center">No items added yet</p>
              )}
            </div>

            {/* Summary */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {cart.reduce((sum, item) => sum + item.post_quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                  <span className="font-bold text-pink-600 dark:text-pink-400">
                    ₦{totalValue.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Post Button */}
            <button
              onClick={handlePostItems}
              disabled={cart.length === 0 || !selectedStaff}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Post Items to Staff
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Mobile Floating Cart Button */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowMobileCart(true)}
            className="bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-full shadow-lg transition relative"
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {cart.length}
            </span>
          </button>
        </div>
      )}

      {/* Mobile Cart Modal */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white dark:bg-gray-800 rounded-t-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Items to Post ({cart.length})</h2>
              <button
                onClick={() => setShowMobileCart(false)}
                className="text-white hover:text-pink-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Staff Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Select Staff to Post To
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Choose a staff member...</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name} ({displayRoleName(staff.role)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">₦{(item.price_jalingo || 0).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-600 rounded px-3 py-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.post_quantity - 1)}
                        className="text-gray-600 dark:text-gray-300 hover:text-pink-600"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        value={item.post_quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-12 text-center bg-transparent text-gray-900 dark:text-white font-semibold text-lg"
                        min="1"
                        max={item.active_store_quantity}
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.post_quantity + 1)}
                        disabled={item.post_quantity >= item.active_store_quantity}
                        className="text-gray-600 dark:text-gray-300 hover:text-pink-600 disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-right text-lg font-semibold text-gray-900 dark:text-white mt-2">
                      ₦{(item.unit_price * item.post_quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {cart.reduce((sum, item) => sum + item.post_quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                  <span className="font-bold text-pink-600 dark:text-pink-400 text-xl">
                    ₦{totalValue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Post Button */}
              <button
                onClick={handlePostItems}
                disabled={cart.length === 0 || !selectedStaff}
                className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Post Items to Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white">Confirm Posting</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Staff Info */}
              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 border-2 border-pink-200 dark:border-pink-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Posting to:</p>
                <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {staffList.find(s => s.id === selectedStaff)?.full_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {displayRoleName(staffList.find(s => s.id === selectedStaff)?.role || '')}
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items to Post:</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                  {cart.map((item, index) => (
                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {index + 1}. {item.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.post_quantity} × ₦{(item.price_jalingo || 0).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-bold text-pink-600 dark:text-pink-400 text-lg">
                        ₦{(item.unit_price * item.post_quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {cart.reduce((sum, item) => sum + item.post_quantity, 0)} items
                  </span>
                </div>
                <div className="flex justify-between items-center text-xl pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Value:</span>
                  <span className="font-bold text-pink-600 dark:text-pink-400">
                    ₦{totalValue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPostItems}
                  className="flex-1 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Confirm & Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
