'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { ShoppingCart, Plus, Minus, Trash2, X, Search, Send, Printer, Download, CheckCircle, AlertCircle, Building2, Truck, ShoppingBag } from 'lucide-react';
import { printReceipt, downloadReceiptAsPDF } from '@/lib/receipt-utils';
import { formatQty } from '@/lib/format-quantity';
import { SkeletonTwoColumnPage } from '@/components/Skeleton';

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

import type { Item, Staff } from '@/types';

interface CartItem extends Item {
  sale_quantity: number;
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

export default function MakeSalePage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  
  // Check if user is commission staff - only they can use outside Jalingo
  const isCommissionStaff = ['commission_staff', 'staff_commission'].includes(user?.role || '');
  
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [logisticPrice, setLogisticPrice] = useState(0);
  const [selectedStaffForPost, setSelectedStaffForPost] = useState<string | null>(null);
  const [selectedLocationForPost, setSelectedLocationForPost] = useState<'Inside Jalingo' | 'Outside Jalingo'>('Inside Jalingo');
  const [showPostModal, setShowPostModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Cart-level settings (consolidated - not per item)
  const [globalPaymentMethod, setGlobalPaymentMethod] = useState<'cash' | 'pos' | 'transfer'>('cash');
  const [globalOutsideJalingo, setGlobalOutsideJalingo] = useState(false);
  
  // Receipt state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  
  // Cart preview modal state
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [showMobileCartModal, setShowMobileCartModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});

  // Helper to check if selected staff for posting is commission-based
  const selectedStaffObjForPost = staffList.find(s => s.id === selectedStaffForPost);
  const isSelectedStaffCommissionForPost = !!selectedStaffObjForPost && 
    selectedStaffObjForPost.role.includes('commission') && 
    !selectedStaffObjForPost.role.includes('non');

  // Effect to reset location if non-commission staff is selected in the post modal
  useEffect(() => {
    if (selectedStaffForPost && !isSelectedStaffCommissionForPost && selectedLocationForPost === 'Outside Jalingo') {
      setSelectedLocationForPost('Inside Jalingo');
    }
  }, [selectedStaffForPost, isSelectedStaffCommissionForPost, selectedLocationForPost]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && token) {
      fetchItems();
      fetchStaff();
      fetchLogisticPrice();
    }
  }, [mounted, token]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/active-store', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const availableItems = response.data.filter((item: Item) => item.active_store_quantity > 0);
      setItems(availableItems);
      setFilteredItems(availableItems);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/admin/staff', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // Filter for commission and non-commission staff only
      const filtered = response.data.filter((s: Staff) => 
        s.id !== user?.id && 
        (s.role.includes('commission') || s.role.includes('non_commission'))
      );
      setStaffList(filtered);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchLogisticPrice = async () => {
    try {
      const response = await api.get('/api/admin/settings/logistics-price', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setLogisticPrice(response.data?.price || 0);
    } catch (error) {
      console.error('Failed to fetch logistics price:', error);
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
    if (existing && existing.sale_quantity < item.active_store_quantity) {
      setCart(cart.map(c => c.id === item.id ? { ...c, sale_quantity: c.sale_quantity + 1 } : c));
      setToast({ message: `${item.name} quantity increased`, type: 'success' });
    } else if (!existing) {
      setCart([...cart, { ...item, sale_quantity: 0.5 }]);
      setToast({ message: `${item.name} added to cart`, type: 'success' });
    } else {
      setToast({ message: `Maximum stock reached for ${item.name}`, type: 'error' });
    }
  };

  const updateQuantity = (id: string, newQty: number | string) => {
    let qty = typeof newQty === 'string' ? parseFloat(newQty) || 0 : newQty;
    // Snap to nearest 0.5
    qty = Math.round(qty * 2) / 2;
    const item = items.find(i => i.id === id);
    const maxQty = item?.active_store_quantity || 0;
    
    if (qty < 0) qty = 0;
    if (qty > maxQty) qty = maxQty;
    
    if (qty === 0) {
      setCart(cart.filter(c => c.id !== id));
    } else {
      setCart(cart.map(cartItem => 
        cartItem.id === id ? { ...cartItem, sale_quantity: qty } : cartItem
      ));
    }
    // Clear the raw input so it shows the committed value
    setQuantityInputs(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  // Handle raw text input for quantity (allows clearing the box)
  const handleQuantityInputChange = (id: string, rawValue: string) => {
    setQuantityInputs(prev => ({ ...prev, [id]: rawValue }));
  };

  // Commit quantity on blur: validate and apply
  const handleQuantityBlur = (id: string, maxQty: number) => {
    const raw = quantityInputs[id];
    if (raw === undefined) return; // no pending edit
    const parsed = parseFloat(raw);
    if (!parsed || parsed < 0.5) {
      setCart(cart.map(cartItem =>
        cartItem.id === id ? { ...cartItem, sale_quantity: 0.5 } : cartItem
      ));
    } else {
      // Snap to nearest 0.5, clamped to max
      const snapped = Math.round(Math.min(parsed, maxQty) * 2) / 2;
      setCart(cart.map(cartItem =>
        cartItem.id === id ? { ...cartItem, sale_quantity: Math.max(0.5, snapped) } : cartItem
      ));
    }
    setQuantityInputs(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const removeFromCart = (id: string) => {
    const item = cart.find(c => c.id === id);
    setCart(cart.filter(item => item.id !== id));
    if (item) {
      setToast({ message: `${item.name} removed from cart`, type: 'success' });
    }
  };

  // Helper function to get the correct price based on globalOutsideJalingo flag
  const getCartItemPrice = (item: CartItem): number => {
    if (globalOutsideJalingo) {
      return (item.price_outside || item.price_jalingo || 0);
    }
    return (item.price_jalingo || 0);
  };

  // Helper to get receipt item price based on the receipt's own outside_jalingo flag
  const getReceiptItemPrice = (item: CartItem): number => {
    if (lastReceipt?.outside_jalingo) {
      return (item.price_outside || item.price_jalingo || 0);
    }
    return (item.price_jalingo || 0);
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => {
      let itemTotal = getCartItemPrice(item) * item.sale_quantity;
      if (globalOutsideJalingo) {
        itemTotal += logisticPrice * item.sale_quantity;
      }
      return sum + itemTotal;
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setToast({ message: 'Cart is empty', type: 'error' });
      return;
    }
    // Check for any invalid quantities (empty inputs or zero)
    const invalidItem = cart.find(item => !item.sale_quantity || item.sale_quantity < 0.5);
    if (invalidItem || Object.keys(quantityInputs).length > 0) {
      setToast({ message: 'Please enter valid quantities for all items', type: 'error' });
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const receiptNumber = `RCP-${Date.now()}`;
      
      // First, save the receipt to database
      const receiptData = {
        receipt_number: receiptNumber,
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.sale_quantity,
          unit_price: getCartItemPrice(item),
          total_price: getCartItemPrice(item) * item.sale_quantity,
        })),
        total_amount: calculateCartTotal(),
        payment_method: globalPaymentMethod,
        sold_outside_jalingo: globalOutsideJalingo,
      };

      // Save receipt
      await api.post('/api/receipts/create', receiptData, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Then create the sale
      const saleData = {
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.sale_quantity,
          unit_price: getCartItemPrice(item),
          payment_method: globalPaymentMethod,
          sold_outside_jalingo: globalOutsideJalingo,
          logistics_fee: globalOutsideJalingo ? logisticPrice : 0,
        })),
        total_amount: calculateCartTotal(),
        payment_method: globalPaymentMethod,
        sold_outside_jalingo: globalOutsideJalingo,
      };

      await api.post('/api/sales/create-sale', saleData, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Generate receipt display
      setLastReceipt({
        receipt_number: receiptNumber,
        items: cart,
        total_amount: calculateCartTotal(),
        timestamp: new Date().toISOString(),
        staff_name: user?.full_name || '',
        payment_method: globalPaymentMethod,
        outside_jalingo: globalOutsideJalingo,
      });
      setShowReceiptModal(true);
      setShowMobileCartModal(false);

      setCart([]);
      setGlobalOutsideJalingo(false);
      setGlobalPaymentMethod('cash');
      setToast({ message: 'Sale completed successfully! Receipt generated.', type: 'success' });
      await fetchItems();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to complete sale';
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePostItems = async () => {
    if (isPosting) return;
    if (!selectedStaffForPost || cart.length === 0) {
      setToast({ message: 'Please select a staff member and add items', type: 'error' });
      return;
    }
    const invalidPost = cart.find(item => !item.sale_quantity || item.sale_quantity < 0.5 || item.sale_quantity % 0.5 !== 0);
    if (invalidPost || Object.keys(quantityInputs).length > 0) {
      setToast({ message: 'Items must be posted in multiples of 0.5 bags', type: 'error' });
      return;
    }

    setIsPosting(true);
    try {
      const postData = {
        staff_id: selectedStaffForPost,
        location: selectedLocationForPost,
        items: cart.map(item => {
          const unitPrice = selectedLocationForPost === 'Outside Jalingo'
            ? (item.price_outside || item.price_jalingo || 0)
            : (item.price_jalingo || 0);
          return {
            item_id: item.id,
            name: item.name,
            quantity: item.sale_quantity,
            unit_price: unitPrice,
          };
        }),
      };

      await api.post('/api/sales/post-items', postData, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setToast({ message: 'Items posted successfully. Staff will receive a notification.', type: 'success' });
      setCart([]);
      setSelectedStaffForPost(null);
      setShowPostModal(false);
      setShowMobileCartModal(false);
      setGlobalOutsideJalingo(false);
      setGlobalPaymentMethod('cash');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to post items';
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setIsPosting(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="p-4 md:p-6">
        <SkeletonTwoColumnPage />
      </div>
    );
  }

  // Render function for cart content (called as function, not as <Component/>, to preserve scroll position)
  const renderCartContent = (showSettings: boolean, desktopLayout: boolean) => (
    <>
      <div className={`space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-gray-200 dark:scrollbar-track-gray-700 ${desktopLayout ? 'flex-1 min-h-0' : 'max-h-96'}`}>
        {cart.map((item) => (
          <div key={item.id} className="border-b dark:border-gray-700 pb-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <span className="font-semibold text-gray-900 dark:text-white">{item.name}</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">₦{getCartItemPrice(item).toLocaleString()}/bag</p>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 ml-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Quantity Controls with Text Input */}
            <div className="flex items-center gap-2 mb-3">
              <button 
                onClick={() => updateQuantity(item.id, item.sale_quantity - 0.5)} 
                className="p-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={quantityInputs[item.id] ?? item.sale_quantity}
                onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                onBlur={() => handleQuantityBlur(item.id, item.active_store_quantity)}
                min="0.5"
                step="0.5"
                max={item.active_store_quantity}
                className="flex-1 text-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
              />
              <button 
                onClick={() => updateQuantity(item.id, item.sale_quantity + 0.5)} 
                className="p-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Item Total */}
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ₦{(getCartItemPrice(item) * item.sale_quantity).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Compact Payment Method and Location Settings */}
      {showSettings && cart.length > 0 && (
        <div className={`flex items-center gap-3 py-2 mt-2 border-t dark:border-gray-700 ${desktopLayout ? 'flex-shrink-0' : ''}`}>
          <select
            value={globalPaymentMethod}
            onChange={(e) => setGlobalPaymentMethod(e.target.value as any)}
            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-pink-500"
          >
            <option value="cash">💰 Cash</option>
            <option value="pos">🏦 POS</option>
            <option value="transfer">📱 Transfer</option>
          </select>

          {isCommissionStaff && (
            <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={globalOutsideJalingo}
                onChange={(e) => setGlobalOutsideJalingo(e.target.checked)}
                className="rounded w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Outside Jalingo
              </span>
            </label>
          )}
        </div>
      )}

      {cart.length > 0 ? (
        <div className={desktopLayout ? 'flex-shrink-0' : ''}>
          <div className="border-t dark:border-gray-700 pt-3 mb-3">
            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
              <span>Total:</span>
              <span className="text-pink-600">₦{calculateCartTotal().toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => setShowCartPreview(true)} 
              disabled={isProcessing}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '⏳ Processing...' : '✓ Review & Complete Sale'}
            </button>
            <button 
              onClick={() => setShowPostModal(true)}
              disabled={isProcessing}
              className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} /> Post to Staff
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Cart is empty</p>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-pink-500" />
          Make Sale
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items Section */}
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

          {/* Available Items */}
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
                  
                  <p className="text-lg font-bold text-pink-600 mt-auto pt-2">₦{getCartItemPrice(item as CartItem).toLocaleString()}</p>
                </div>

                <button
                  onClick={() => addToCart(item)}
                  disabled={item.active_store_quantity === 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                >
                  + Add to Cart
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

        {/* Cart Section - Desktop */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow sticky top-4 p-4 flex flex-col max-h-[calc(100vh-10rem)] border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex-shrink-0">
              Cart ({cart.length} items)
            </h2>
            {renderCartContent(true, true)}
          </div>
        </div>
      </div>

      {/* Floating Cart Button - Mobile */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowMobileCartModal(true)}
            className="relative bg-pink-600 hover:bg-pink-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center w-16 h-16 transition-transform hover:scale-110"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {cart.length}
            </span>
          </button>
        </div>
      )}

      {/* Mobile Cart Modal */}
      {showMobileCartModal && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white dark:bg-gray-800 rounded-t-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-pink-600 px-4 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Your Cart</h2>
              <button
                onClick={() => setShowMobileCartModal(false)}
                className="text-white hover:text-pink-100 text-2xl"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              {renderCartContent(true, false)}
            </div>
          </div>
        </div>
      )}

      {/* Cart Preview/Confirmation Modal */}
      {showCartPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex justify-between items-center sticky top-0">
              <h2 className="text-2xl font-bold text-white">Review Your Order</h2>
              <button 
                onClick={() => setShowCartPreview(false)} 
                className="text-white hover:text-pink-100 text-2xl"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Cart Items with Edit/Delete */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Items in Cart ({cart.length})</h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center gap-4"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ₦{getCartItemPrice(item).toLocaleString()} × {formatQty(item.sale_quantity)}
                        </p>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.sale_quantity - 0.5)}
                          className="p-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={quantityInputs[item.id] ?? item.sale_quantity}
                          onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                          onBlur={() => handleQuantityBlur(item.id, item.active_store_quantity)}
                          min="0.5"
                          step="0.5"
                          max={item.active_store_quantity}
                          className="w-16 text-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.sale_quantity + 0.5)}
                          className="p-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-right min-w-[100px]">
                        <p className="font-bold text-gray-900 dark:text-white">
                          ₦{(getCartItemPrice(item) * item.sale_quantity).toLocaleString()}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">
                    {globalPaymentMethod}
                  </span>
                </div>
                {globalOutsideJalingo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Logistics Fee:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₦{logisticPrice.toLocaleString()}/item
                    </span>
                  </div>
                )}
                <div className="border-t dark:border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount:</span>
                    <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                      ₦{calculateCartTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCartPreview(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back to Edit
                </button>
                <button
                  onClick={() => {
                    setShowCartPreview(false);
                    handleCheckout();
                  }}
                  disabled={cart.length === 0 || isProcessing}
                  className="flex-1 px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Generating Receipt...
                    </span>
                  ) : '✓ Generate Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Items Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Post Items to Staff</h2>
              <button onClick={() => setShowPostModal(false)} className="text-gray-500 dark:text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Staff Member
                </label>
                <select
                  value={selectedStaffForPost || ''}
                  onChange={(e) => setSelectedStaffForPost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Choose a staff...</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name} ({staff.role.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              {selectedStaffForPost && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Posting Location
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedLocationForPost('Inside Jalingo')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${
                        selectedLocationForPost === 'Inside Jalingo'
                          ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm font-bold">Inside Jalingo</span>
                    </button>
                    {isSelectedStaffCommissionForPost && (
                      <button
                        onClick={() => setSelectedLocationForPost('Outside Jalingo')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${
                          selectedLocationForPost === 'Outside Jalingo'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-blue-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        <span className="text-sm font-bold">Outside Jalingo</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Items to Post:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const price = selectedLocationForPost === 'Outside Jalingo'
                      ? (item.price_outside || item.price_jalingo || 0)
                      : (item.price_jalingo || 0);
                    return (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-600 pb-1 last:border-0">
                        <div className="text-gray-700 dark:text-gray-300">
                          <span className="font-bold tracking-tighter"> {item.name} </span>
                          <span className="text-[10px] opacity-75 ml-1">×{formatQty(item.sale_quantity)}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900 dark:text-white">₦{(price * item.sale_quantity).toLocaleString()}</p>
                          <p className="text-[9px] text-gray-500 uppercase tracking-tighter">@ ₦{price.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Total for Post Modal */}
                <div className="mt-3 pt-2 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-gray-500">Post Total</span>
                  <span className="text-lg font-black text-pink-600 dark:text-pink-400">
                    ₦{cart.reduce((sum, item) => {
                      const price = selectedLocationForPost === 'Outside Jalingo'
                        ? (item.price_outside || item.price_jalingo || 0)
                        : (item.price_jalingo || 0);
                      return sum + (price * item.sale_quantity);
                    }, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPostModal(false)}
                  disabled={isPosting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostItems}
                  disabled={!selectedStaffForPost || isPosting}
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPosting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Posting...
                    </>
                  ) : 'Post Items'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Receipt</h2>
              <button 
                onClick={() => setShowReceiptModal(false)} 
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Receipt Content */}
            <div id="receipt-content" className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
              {/* Fancy Header with Pink Background */}
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">ABIFRESH & KIDDIES VENTURES</h1>
                <p className="text-pink-100 text-sm font-semibold">Receipt #{lastReceipt.receipt_number}</p>
              </div>

              {/* Receipt Body */}
              <div className="p-6 space-y-4">

                {/* Receipt Info */}
                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="border-r border-gray-200 dark:border-gray-700 pr-4">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{new Date(lastReceipt.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Time</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{new Date(lastReceipt.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="border-r border-gray-200 dark:border-gray-700 pr-4">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Staff</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{lastReceipt.staff_name}</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Payment</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1 capitalize">{lastReceipt.payment_method}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border-t-2 border-b-2 border-pink-300 dark:border-pink-400">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-t-lg">
                    <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                      <span className="flex-1">Item</span>
                      <span className="w-16 text-right">Qty</span>
                      <span className="w-20 text-right">Price</span>
                      <span className="w-24 text-right">Total</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {lastReceipt.items.map((item: CartItem, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                        <span className="flex-1 font-medium">{item.name}</span>
                        <span className="w-16 text-right">{formatQty(item.sale_quantity)}</span>
                        <span className="w-20 text-right">₦{getReceiptItemPrice(item).toLocaleString()}</span>
                        <span className="w-24 text-right font-bold text-gray-900 dark:text-white">₦{(getReceiptItemPrice(item) * item.sale_quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-lg p-6 border border-pink-200 dark:border-pink-700 overflow-hidden">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Amount Due</p>
                      <div className="break-words text-3xl font-bold text-pink-600 dark:text-pink-400">
                        ₦{lastReceipt.total_amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">Thank you for your purchase!</p>
                  <p className="text-xs">Visit us again soon</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const receiptData = {
                    receipt_number: lastReceipt.receipt_number,
                    timestamp: lastReceipt.timestamp,
                    staff_name: lastReceipt.staff_name,
                    payment_method: lastReceipt.payment_method,
                    items: lastReceipt.items.map((item: CartItem) => ({
                      name: item.name,
                      sale_quantity: item.sale_quantity,
                      price: getReceiptItemPrice(item),
                    })),
                    total_amount: lastReceipt.total_amount,
                  };
                  printReceipt(receiptData);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Print
              </button>
              <button
                onClick={() => {
                  const receiptData = {
                    receipt_number: lastReceipt.receipt_number,
                    timestamp: lastReceipt.timestamp,
                    staff_name: lastReceipt.staff_name,
                    payment_method: lastReceipt.payment_method,
                    items: lastReceipt.items.map((item: CartItem) => ({
                      name: item.name,
                      sale_quantity: item.sale_quantity,
                      price: getReceiptItemPrice(item),
                    })),
                    total_amount: lastReceipt.total_amount,
                  };
                  downloadReceiptAsPDF(receiptData);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Download size={18} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImage}
              alt="Fullscreen"
              className="max-w-full max-h-[85vh] object-contain"
              onError={(e) => {
                console.error('❌ Fullscreen image failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 transition"
              title="Close image"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
