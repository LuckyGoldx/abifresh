'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Send, Plus, Minus, Trash2, Users, CheckCircle, AlertCircle, ShoppingBag, X, Search, History, BarChart, CheckCircle2, XCircle, Clock, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';
import { SkeletonTwoColumnPage, SkeletonTable } from '@/components/Skeleton';

interface PostedHistoryItem {
  id: string;
  created_at: string;
  quantity: number;
  unit_price: number;
  status: 'pending' | 'accepted' | 'rejected';
  reject_reason?: string;
  item: {
    name: string;
    sku: string;
  };
  staff: {
    full_name: string;
    username: string;
  };
  poster: {
    full_name: string;
    username: string;
  };
}

/**
 * Convert any image URL (old Supabase public URL or new proxy path) to a working proxy URL.
 */
function getImageUrl(url: string | undefined | null): string | null {
  // Return Supabase CDN URL directly (proxy endpoint was removed for security)
  if (!url) return null;
  // Already a Supabase public URL or full URL
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return url;
  // If it's just a path, assume it's a Supabase public URL
  return url;
}

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

import type { Item, Staff } from '@/types';

interface CartItem extends Item {
  post_quantity: number;
}

export default function AdminPostItemsPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'post' | 'history'>('post');
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
  const [isPosting, setIsPosting] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  
  // Helper to check if selected staff is commission-based
  const selectedStaffObj = staffList.find(s => s.id === selectedStaff);
  const isSelectedStaffCommission = !!selectedStaffObj && 
    selectedStaffObj.role.includes('commission') && 
    !selectedStaffObj.role.includes('non');

  const [selectedLocation, setSelectedLocation] = useState<string>('Inside Jalingo');

  // Effect to reset location if non-commission staff is selected
  useEffect(() => {
    if (selectedStaff && !isSelectedStaffCommission && selectedLocation === 'Outside Jalingo') {
      setSelectedLocation('Inside Jalingo');
    }
  }, [selectedStaff, isSelectedStaffCommission, selectedLocation]);
  
  // History states
  const [history, setHistory] = useState<PostedHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    posterId: '',
    staffId: '',
    status: '',
    itemSearch: '',
  });

  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 10;

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
      setIsLoading(true);
      await Promise.all([
        fetchItems(),
        fetchStaff(),
        fetchHistory(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const response = await api.get('/api/admin/post-items');
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsHistoryLoading(false);
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
      
      // Filter to show ONLY commission_staff and non_commission_staff
      const filteredStaff = response.data.filter((s: Staff) => {
        const role = s.role?.toLowerCase() || '';
        const isCommissionStaff = role === 'commission_staff' || role === 'staff_commission';
        const isNonCommissionStaff = role === 'non_commission_staff' || role === 'staff_non_commission';
        return isCommissionStaff || isNonCommissionStaff;
      });
      
      console.log('✅ Filtered staff (commission & non-commission only):', filteredStaff);
      setStaffList(filteredStaff);
      
      if (filteredStaff.length === 0) {
        setToast({ message: 'No staff members available to post to. Please create commission or non-commission staff first.', type: 'error' });
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch staff:', error);
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
    // Clear the raw input so it shows the committed value
    setQuantityInputs(prev => { const next = { ...prev }; delete next[itemId]; return next; });
  };

  // Handle raw text input for quantity (allows clearing the box)
  const handleQuantityInputChange = (id: string, rawValue: string) => {
    setQuantityInputs(prev => ({ ...prev, [id]: rawValue }));
  };

  // Commit quantity on blur: validate and apply
  const handleQuantityBlur = (id: string, maxQty: number) => {
    const raw = quantityInputs[id];
    if (raw === undefined) return;
    const parsed = parseFloat(raw);
    if (!parsed || parsed < 0.5) {
      setCart(cart.map(c =>
        c.id === id ? { ...c, post_quantity: 0.5 } : c
      ));
    } else {
      // Snap to nearest 0.5 and clamp to max
      const snapped = Math.round(Math.min(parsed, maxQty) * 2) / 2;
      setCart(cart.map(c =>
        c.id === id ? { ...c, post_quantity: Math.max(0.5, snapped) } : c
      ));
    }
    setQuantityInputs(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handlePostItems = async () => {
    if (!selectedStaff || cart.length === 0) {
      setToast({ message: 'Please select a staff member and add items', type: 'error' });
      return;
    }
    const invalidItem = cart.find(item => !item.post_quantity || item.post_quantity < 1);
    if (invalidItem || Object.keys(quantityInputs).length > 0) {
      setToast({ message: 'Please enter valid quantities for all items', type: 'error' });
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  const confirmPostItems = async () => {
    if (isPosting) return;
    setIsPosting(true);
    try {
      const postData = {
        staff_id: selectedStaff,
        location: selectedLocation.trim(),
        items: cart.map(item => {
          const unitPrice = selectedLocation === 'Outside Jalingo' 
            ? (item.price_outside || item.price_jalingo || 0)
            : (item.price_jalingo || 0);
          return {
            item_id: item.id,
            quantity: item.post_quantity,
            unit_price: unitPrice,
          };
        }),
        total_items: cart.reduce((sum, item) => sum + item.post_quantity, 0),
      };

      console.log('📤 [Admin] Posting items with data:', postData);
      alert(`ADMIN POSTING: Target location is "${postData.location}"`);

      await api.post('/api/sales/post-items', postData, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const staffName = staffList.find(s => s.id === selectedStaff)?.full_name || 'Staff';
      setToast({ message: `${cart.length} item(s) successfully posted to ${staffName}!`, type: 'success' });
      setCart([]);
      setSelectedStaff('');
      setShowConfirmation(false);
      setShowMobileCart(false);
      await Promise.all([fetchItems(), fetchHistory()]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to post items';
      setToast({ message: errorMsg, type: 'error' });
      setShowConfirmation(false);
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilters]);

  if (!mounted || isLoading) {
    return (
      <div className="p-4 md:p-6">
        <SkeletonTwoColumnPage />
      </div>
    );
  }

  const totalValue = cart.reduce((sum, item) => {
    const price = selectedLocation === 'Outside Jalingo'
      ? (item.price_outside || item.price_jalingo || 0)
      : (item.price_jalingo || 0);
    return sum + (price * item.post_quantity);
  }, 0);

  // History Stats
  const historyStats = {
    totalPosts: history.length,
    totalQty: history.reduce((sum, item) => sum + item.quantity, 0),
    accepted: history.filter(item => item.status === 'accepted').length,
    acceptedValue: history.filter(item => item.status === 'accepted').reduce((sum, item) => sum + (item.quantity * item.unit_price), 0),
    rejected: history.filter(item => item.status === 'rejected').length,
    pending: history.filter(item => item.status === 'pending').length,
    acceptanceRate: history.length > 0 ? (history.filter(item => item.status === 'accepted').length / history.length) * 100 : 0,
    rejectionRate: history.length > 0 ? (history.filter(item => item.status === 'rejected').length / history.length) * 100 : 0,
    uniqueStaff: new Set(history.map(item => item.staff?.username)).size,
  };

  const filteredHistory = history.filter(item => {
    const matchesPoster = !historyFilters.posterId || item.poster?.username === historyFilters.posterId;
    const matchesStaff = !historyFilters.staffId || item.staff?.username === historyFilters.staffId;
    const matchesStatus = !historyFilters.status || item.status === historyFilters.status;
    const matchesItem = !historyFilters.itemSearch || 
      item.item?.name.toLowerCase().includes(historyFilters.itemSearch.toLowerCase()) ||
      item.item?.sku.toLowerCase().includes(historyFilters.itemSearch.toLowerCase());
    
    const itemDateStr = item.created_at.split('T')[0];
    let matchesDate = true;
    if (historyFilters.startDate && historyFilters.endDate) {
      matchesDate = itemDateStr >= historyFilters.startDate && itemDateStr <= historyFilters.endDate;
    } else if (historyFilters.startDate) {
      matchesDate = itemDateStr === historyFilters.startDate;
    } else if (historyFilters.endDate) {
      matchesDate = itemDateStr === historyFilters.endDate;
    }
    
    return matchesPoster && matchesStaff && matchesStatus && matchesItem && matchesDate;
  });

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / historyPerPage));
  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * historyPerPage,
    historyPage * historyPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Send className="w-8 h-8 text-pink-500" />
          Posting Management
        </h1>
        
        <div className="flex justify-center w-full md:w-auto">
          <div className="inline-flex p-1.5 bg-gray-100/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl gap-1 border border-gray-200/50 dark:border-gray-700/40 shadow-sm self-stretch md:self-auto">
            <button
              onClick={() => setActiveTab('post')}
              className={`py-2 px-6 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'post'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25'
                  : 'text-gray-500 hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400'
              }`}
            >
              <Plus className={`w-4 h-4 transition-colors ${activeTab === 'post' ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
              <span>Post Items</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-6 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25'
                  : 'text-gray-500 hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400'
              }`}
            >
              <History className={`w-4 h-4 transition-colors ${activeTab === 'history' ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
              <span>Post History</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'post' ? (

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search Box */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="🔍 Search by item name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Found {filteredItems.length} item(s)
              </p>
            )}
            {filteredItems.length === 0 && searchQuery && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">No items match your search</p>
            )}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition overflow-hidden flex flex-col h-full">
                {/* Product Image Section */}
                <div className="relative bg-gray-100 dark:bg-gray-700 h-48 flex items-center justify-center overflow-hidden cursor-pointer group">
                  {item.image_url ? (
                    <img 
                      src={getImageUrl(item.image_url) || ''} 
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                      onClick={() => setFullscreenImage(getImageUrl(item.image_url) || '')}
                      onError={(e) => {
                        console.error(`❌ Image failed to load: ${item.image_url}`);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-white opacity-80">
                          {item.name.toUpperCase().substring(0, 2)}
                        </div>
                        <p className="text-xs text-white opacity-60 mt-1">No image</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Info Section */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-2 mb-2">{item.name}</h3>
                  
                  {item.brand && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">🏷️ {item.brand}</p>
                  )}
                  
                  {item.package_type && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📦 {item.package_type}</p>
                  )}
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{item.category} • {item.sku}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-2">📊 Stock: {formatQty(item.active_store_quantity)}</p>
                  
                  <p className="text-lg font-bold text-pink-600 mt-auto pt-2">₦{(item.price_jalingo || 0).toLocaleString()}</p>
                </div>

                <button
                  onClick={() => addToCart(item)}
                  disabled={item.active_store_quantity === 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                >
                  + Add to Post
                </button>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && !searchQuery && (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              No available items in stock
            </div>
          )}
        </div>

        {/* Posting Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-0 flex flex-col max-h-[calc(100vh-8rem)] border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 flex-shrink-0">
              <Users className="w-5 h-5 text-pink-500" />
              Post Summary
            </h2>

            {/* Staff Selection */}
            <div className="space-y-2 mb-4 flex-shrink-0">
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
              <div className="space-y-2 mb-4 flex-shrink-0">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Designated Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-pink-500 transition"
                >
                  <option value="Inside Jalingo">🏙️ Inside Jalingo</option>
                  {isSelectedStaffCommission && (
                    <option value="Outside Jalingo">🚚 Outside Jalingo</option>
                  )}
                </select>
              </div>
            )}

            {/* Items in Cart */}
            <div className="flex-1 min-h-[80px] overflow-y-auto pr-1 mb-4 scrollbar-thin scrollbar-thumb-pink-500">
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
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            ₦{(selectedLocation === 'Outside Jalingo' 
                              ? (item.price_outside || item.price_jalingo || 0) 
                              : (item.price_jalingo || 0)).toLocaleString()}
                          </p>
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
                          onClick={() => updateQuantity(item.id, item.post_quantity - 0.5)}
                          className="text-gray-600 dark:text-gray-300 hover:text-pink-600 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={quantityInputs[item.id] ?? item.post_quantity}
                          onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                          onBlur={() => handleQuantityBlur(item.id, item.active_store_quantity)}
                          className="w-12 lg:w-14 text-center bg-transparent text-gray-900 dark:text-white font-semibold"
                          min="0.5"
                          max={item.active_store_quantity}
                          step="0.5"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.post_quantity + 0.5)}
                          disabled={item.post_quantity >= item.active_store_quantity}
                          className="text-gray-600 dark:text-gray-300 hover:text-pink-600 disabled:opacity-50 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-right text-sm font-semibold text-gray-900 dark:text-white mt-1">
                        ₦{((selectedLocation === 'Outside Jalingo' 
                          ? (item.price_outside || item.price_jalingo || 0) 
                          : (item.price_jalingo || 0)) * item.post_quantity).toLocaleString()}
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
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 flex-shrink-0">
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
              className="btn-primary w-full mt-4 flex-shrink-0 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Post Items to Staff
            </button>
          </div>
        </div>
      </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* History Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Items Posted', value: historyStats.totalPosts.toLocaleString(), icon: <ShoppingBag className="text-blue-500" />, color: 'blue' },
              { label: 'Total Quantities', value: formatQty(historyStats.totalQty), icon: <BarChart className="text-pink-500" />, color: 'pink' },
              { label: 'Accepted Value', value: `₦${historyStats.acceptedValue.toLocaleString()}`, icon: <CheckCircle2 className="text-green-500" />, color: 'green' },
              { label: 'Staff Reached', value: historyStats.uniqueStaff.toLocaleString(), icon: <Users className="text-purple-500" />, color: 'purple' },
              { label: 'Acceptance Rate', value: `${historyStats.acceptanceRate.toFixed(1)}%`, icon: <CheckCircle2 className="text-blue-500" />, color: 'blue' },
              { label: 'Rejection Rate', value: `${historyStats.rejectionRate.toFixed(1)}%`, icon: <XCircle className="text-red-500" />, color: 'red' },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider break-words">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white break-words">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-1 sm:gap-0 text-center sm:text-left">
                <span className="text-sm font-bold text-yellow-600 flex items-center gap-2">
                   <Clock size={18} /> Pending
                </span>
                <span className="text-xl font-black text-gray-900 dark:text-white">{historyStats.pending}</span>
             </div>
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-1 sm:gap-0 text-center sm:text-left">
                <span className="text-sm font-bold text-red-600 flex items-center gap-2">
                   <XCircle size={18} /> Rejected
                </span>
                <span className="text-xl font-black text-gray-900 dark:text-white">{historyStats.rejected}</span>
             </div>
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-1 sm:gap-0 text-center sm:text-left">
                <span className="text-sm font-bold text-green-600 flex items-center gap-2">
                   <CheckCircle2 size={18} /> Accepted
                </span>
                <span className="text-xl font-black text-gray-900 dark:text-white">{historyStats.accepted}</span>
             </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-4">
               <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-pink-500" />
                    Post History
                  </h2>
                  <button 
                    onClick={fetchHistory}
                    disabled={isHistoryLoading}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-500"
                  >
                    <RefreshCcw size={18} className={isHistoryLoading ? 'animate-spin' : ''} />
                  </button>
               </div>

               {/* Filter Bar */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search item or SKU..."
                      value={historyFilters.itemSearch}
                      onChange={(e) => setHistoryFilters({...historyFilters, itemSearch: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <select
                    value={historyFilters.posterId}
                    onChange={(e) => setHistoryFilters({...historyFilters, posterId: e.target.value})}
                    className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Posters</option>
                    {Array.from(new Set(history.map(h => JSON.stringify({id: h.poster?.username, name: h.poster?.full_name}))))
                      .map(s => JSON.parse(s))
                      .map(poster => (
                        <option key={poster.id} value={poster.id}>{poster.name}</option>
                      ))
                    }
                  </select>
                  <select
                    value={historyFilters.staffId}
                    onChange={(e) => setHistoryFilters({...historyFilters, staffId: e.target.value})}
                    className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Recipients</option>
                    {Array.from(new Set(history.map(h => JSON.stringify({id: h.staff?.username, name: h.staff?.full_name}))))
                      .map(s => JSON.parse(s))
                      .map(staff => (
                        <option key={staff.id} value={staff.id}>{staff.name}</option>
                      ))
                    }
                  </select>
                  <select
                    value={historyFilters.status}
                    onChange={(e) => setHistoryFilters({...historyFilters, status: e.target.value})}
                    className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) => setHistoryFilters({...historyFilters, startDate: e.target.value})}
                    className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) => setHistoryFilters({...historyFilters, endDate: e.target.value})}
                    className="py-2 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
               </div>
            </div>
            
            {/* Table view */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">From (Poster)</th>
                    <th className="px-6 py-4">To (Staff)</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4">Value</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading history...</td>
                    </tr>
                  ) : paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No matching history found</td>
                    </tr>
                  ) : (
                    paginatedHistory.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 dark:text-white whitespace-normal break-words max-w-[200px]">{post.item?.name}</p>
                          <p className="text-xs text-gray-500">{post.item?.sku}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs flex-shrink-0">
                              {post.poster?.full_name?.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{post.poster?.full_name}</p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-tighter">@{post.poster?.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-xs flex-shrink-0">
                              {post.staff?.full_name?.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{post.staff?.full_name}</p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-tighter">@{post.staff?.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-gray-900 dark:text-white">
                          {formatQty(post.quantity)}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          ₦{(post.quantity * post.unit_price).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900 dark:text-white whitespace-nowrap">{new Date(post.created_at).toLocaleDateString()}</p>
                          <p className="text-[10px] text-gray-500">{new Date(post.created_at).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          {post.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold uppercase">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                          {post.status === 'accepted' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase">
                              <CheckCircle2 size={12} /> Accepted
                            </span>
                          )}
                          {post.status === 'rejected' && (
                            <div className="flex flex-col gap-1">
                               <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase w-fit">
                                <XCircle size={12} /> Rejected
                              </span>
                              {post.reject_reason && <p className="text-[10px] text-red-500 italic max-w-[150px] break-words">"{post.reject_reason}"</p>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalHistoryPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 dark:border-gray-700 gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                    disabled={historyPage <= 1}
                    className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {Array.from({ length: totalHistoryPages }, (_, i) => i + 1)
                    .filter(p => {
                      const half = 2;
                      return p === 1 || p === totalHistoryPages || (p >= historyPage - half && p <= historyPage + half);
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0) {
                        const prev = arr[idx - 1];
                        if (p - prev > 1) acc.push('ellipsis');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">...</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setHistoryPage(item)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                            historyPage === item
                              ? 'bg-pink-500 text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => setHistoryPage(Math.min(totalHistoryPages, historyPage + 1))}
                    disabled={historyPage >= totalHistoryPages}
                    className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {selectedStaff && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Designated Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="Inside Jalingo">🏙️ Inside Jalingo</option>
                      {isSelectedStaffCommission && (
                        <option value="Outside Jalingo">🚚 Outside Jalingo</option>
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ₦{(selectedLocation === 'Outside Jalingo' 
                            ? (item.price_outside || item.price_jalingo || 0) 
                            : (item.price_jalingo || 0)).toLocaleString()}
                        </p>
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
                        onClick={() => updateQuantity(item.id, item.post_quantity - 0.5)}
                        className="text-gray-600 dark:text-gray-300 hover:text-pink-600"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        value={quantityInputs[item.id] ?? item.post_quantity}
                        onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                        onBlur={() => handleQuantityBlur(item.id, item.active_store_quantity)}
                        className="w-12 text-center bg-transparent text-gray-900 dark:text-white font-semibold text-lg"
                        min="0.5"
                        max={item.active_store_quantity}
                        step="0.5"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.post_quantity + 0.5)}
                        disabled={item.post_quantity >= item.active_store_quantity}
                        className="text-gray-600 dark:text-gray-300 hover:text-pink-600 disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-right text-lg font-semibold text-gray-900 dark:text-white mt-2">
                      ₦{((selectedLocation === 'Outside Jalingo' 
                        ? (item.price_outside || item.price_jalingo || 0) 
                        : (item.price_jalingo || 0)) * item.post_quantity).toLocaleString()}
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

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-[61]"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={fullscreenImage}
            alt="Product"
            className="max-w-full max-h-full object-contain"
          />
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
              {/* Staff Info & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 border-2 border-pink-200 dark:border-pink-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Posting to:</p>
                  <p className="text-xl font-bold text-pink-600 dark:text-pink-400">
                    {staffList.find(s => s.id === selectedStaff)?.full_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {displayRoleName(staffList.find(s => s.id === selectedStaff)?.role || '')}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Target Location:</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedLocation === 'Inside Jalingo' ? '🏙️ Inside Jalingo' : '🚚 Outside Jalingo'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Items will be restricted to this location
                  </p>
                </div>
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
                        ₦{((item.price_jalingo || 0) * item.post_quantity).toLocaleString()}
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
                  disabled={isPosting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPostItems}
                  disabled={isPosting}
                  className="flex-1 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {isPosting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Confirm & Post
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
