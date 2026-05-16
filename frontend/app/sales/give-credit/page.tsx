'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import {
  Search, Trash2, X, ShoppingCart, Printer, Download, Plus
} from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';
import { printReceipt, downloadReceiptAsPDF } from '@/lib/receipt-utils';
import { Toast, getImageUrl, CreditTabs } from '@/components/credits';

export default function GiveCreditPage() {
  const user = useAuthStore((state) => state.user);
  const [creditors, setCreditors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCreditor, setSelectedCreditor] = useState<string>('');
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [showMobileCartModal, setShowMobileCartModal] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (retryCount = 0) => {
    try {
      const [creditorsRes, itemsRes] = await Promise.all([
        api.get('/api/credits/creditors'),
        api.get('/api/sales/items/available'),
      ]);
      setCreditors(creditorsRes.data || []);
      setItems(itemsRes.data || []);
      setToast(null);
      setIsLoading(false);
    } catch (error: any) {
      if (retryCount < 2) {
        // Silent retry after 1.5s
        setTimeout(() => fetchData(retryCount + 1), 1500);
      } else {
        setToast({ message: 'Connection interrupted. Retrying...', type: 'error' });
        setIsLoading(false);
      }
    }
  };

  const filteredItems = items.filter((item: any) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItemToCart = (item: any) => {
    const existingItem = cart.find((i) => i.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + 0.5, item.active_store_quantity) }
            : i
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          itemId: item.id,
          itemName: item.name,
          quantity: Math.min(0.5, item.active_store_quantity),
          unitPrice: Number(item.price_jalingo) || 0,
          maxQuantity: item.active_store_quantity,
          name: item.name,
          price_jalingo: item.price_jalingo,
          image_url: item.image_url,
          active_store_quantity: item.active_store_quantity,
        },
      ]);
    }
  };

  const removeItemFromCart = (itemId: string) => {
    setCart(cart.filter((i) => i.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, qty: number) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;
    if (qty <= 0) {
      setCart(cart.filter((i) => i.id !== itemId));
      return;
    }
    if (qty > item.maxQuantity) qty = item.maxQuantity;
    setCart(cart.map((i) => (i.id === itemId ? { ...i, quantity: Number(qty.toFixed(2)) } : i)));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async () => {
    if (!selectedCreditor || cart.length === 0) {
      setToast({ message: 'Please select a creditor and add items', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/credits/sales', {
        creditorId: selectedCreditor,
        items: cart.map((item) => ({
          itemId: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes,
      });

      const receiptData = {
        receipt_number: res.data.receipt_number,
        timestamp: new Date().toISOString(),
        staff_name: user?.full_name || 'Staff',
        payment_method: 'Credit',
        items: cart.map(item => ({
          name: item.itemName,
          sale_quantity: item.quantity,
          price: item.unitPrice,
        })),
        total_amount: res.data.total_amount,
        creditor: res.data.creditor
      };

      setLastReceipt(receiptData);
      setShowReceiptModal(true);

      setToast({ message: 'Credit given successfully!', type: 'success' });
      setCart([]);
      setSelectedCreditor('');
      setNotes('');
      setShowMobileCartModal(false);
    } catch (error: any) {
      setToast({ message: 'Failed to give credit: ' + (error.response?.data?.error || error.message), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartContent = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select Creditor</label>
        <select
          value={selectedCreditor}
          onChange={(e) => setSelectedCreditor(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">-- Choose Creditor --</option>
          {creditors.map((creditor: any) => (
            <option key={creditor.id} value={creditor.id}>
              {creditor.full_name} ({creditor.unique_code})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {cart.map((item) => (
          <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800/50">
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.itemName}</p>
              <button onClick={() => removeItemFromCart(item.id)} className="text-red-500 hover:text-red-700 dark:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateItemQuantity(item.id, item.quantity - 0.5)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600">-</button>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                className="w-16 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                min="0.5"
                step="0.5"
                max={item.maxQuantity}
              />
              <button onClick={() => updateItemQuantity(item.id, item.quantity + 0.5)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600">+</button>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-auto">₦{(item.quantity * item.unitPrice).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
          rows={2}
          placeholder="Add any notes..."
        />
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded mb-4 space-y-2 border dark:border-gray-700">
        <div className="flex justify-between">
          <span className="text-gray-700 dark:text-gray-400">Total Quantity:</span>
          <span className="font-bold text-gray-900 dark:text-white">{formatQty(totalQuantity)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700 dark:text-gray-400">Total Amount:</span>
          <span className="font-bold text-gray-900 dark:text-white">₦{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={() => setShowReviewModal(true)}
        disabled={!selectedCreditor || cart.length === 0}
        className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold hover:bg-pink-600 disabled:opacity-50 transition-colors shadow-md"
      >
        Review & Give Credit
      </button>
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto text-center py-8 dark:text-gray-400">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <CreditTabs />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Give Credit</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Issue credit items to creditors</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                />
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Found {filteredItems.length} item(s)</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item: any) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col h-full">
                  <div className="relative bg-gray-100 dark:bg-gray-900 h-36 flex items-center justify-center overflow-hidden cursor-pointer">
                    {item.image_url ? (
                      <img
                        src={getImageUrl(item.image_url) || ''}
                        alt={item.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                        onClick={() => setFullscreenImage(getImageUrl(item.image_url) || '')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white opacity-80">
                            {item.name.toUpperCase().substring(0, 2)}
                          </div>
                          <p className="text-xs text-white opacity-60 mt-1">No image</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">{item.name}</h3>
                    {item.brand && <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">🏷️ {item.brand}</p>}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{item.category} • {formatQty(item.active_store_quantity)} in stock</p>
                    <p className="text-base font-bold text-pink-600 dark:text-pink-400 mt-auto pt-2">₦{Number(item.price_jalingo).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => addItemToCart(item)}
                    disabled={item.active_store_quantity === 0}
                    className="w-full bg-pink-500 text-white py-2 text-sm font-semibold hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add to Cart
                  </button>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && !searchQuery && (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">No available items in stock</div>
            )}
          </div>

          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 sticky top-4">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Credit Cart ({cart.length})</h3>
              {renderCartContent()}
            </div>
          </div>
        </div>

        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-6 right-6 z-40">
            <button
              onClick={() => setShowMobileCartModal(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center w-16 h-16 transition-transform hover:scale-110"
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {cart.length}
              </span>
            </button>
          </div>
        )}

        {showMobileCartModal && (
          <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-h-[90vh] overflow-y-auto border-t dark:border-gray-700">
              <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-pink-600 px-4 py-4 flex justify-between items-center shadow-lg">
                <h2 className="text-xl font-bold text-white">Credit Cart ({cart.length})</h2>
                <button onClick={() => setShowMobileCartModal(false)} className="text-white hover:text-pink-100">
                  <X size={24} />
                </button>
              </div>
              <div className="p-4">{renderCartContent()}</div>
            </div>
          </div>
        )}

        {fullscreenImage && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setFullscreenImage(null)}>
            <img src={fullscreenImage} alt="Full size" className="max-w-full max-h-full object-contain" />
          </div>
        )}

        {showReceiptModal && lastReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto shadow-2xl border dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Receipt</h2>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div id="receipt-content" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border dark:border-gray-700">
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-8 text-center">
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">ABIFRESH & KIDDIES VENTURES</h1>
                  <p className="text-pink-100 text-sm font-semibold">Credit Receipt #{lastReceipt.receipt_number}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="border-r border-gray-200 dark:border-gray-700 pr-4">
                      <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">{new Date(lastReceipt.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="pl-4">
                      <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Time</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">{new Date(lastReceipt.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="border-r border-gray-200 dark:border-gray-700 pr-4 mt-2 pt-2 border-t">
                      <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Creditor</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">{lastReceipt.creditor?.name || 'N/A'}</p>
                    </div>
                    <div className="pl-4 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Staff</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">{lastReceipt.staff_name}</p>
                    </div>
                  </div>
                  <div className="border-t-2 border-b-2 border-pink-300 dark:border-pink-900/30">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-t-lg">
                      <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                        <span className="flex-1">Item</span>
                        <span className="w-16 text-right">Qty</span>
                        <span className="w-20 text-right">Price</span>
                        <span className="w-24 text-right">Total</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {lastReceipt.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                          <span className="flex-1 font-medium">{item.name}</span>
                          <span className="w-16 text-right">{formatQty(item.sale_quantity)}</span>
                          <span className="w-20 text-right">₦{item.price.toLocaleString()}</span>
                          <span className="w-24 text-right font-bold text-gray-900 dark:text-white">₦{(item.price * item.sale_quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/10 dark:to-pink-900/20 rounded-lg p-6 border border-pink-200 dark:border-pink-900/30">
                    <div className="flex justify-end">
                      <div className="text-right">
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Credit Amount</p>
                        <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                          ₦{lastReceipt.total_amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowReceiptModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
                <button onClick={() => printReceipt(lastReceipt)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg transition-colors">
                  <Printer size={18} /> Print
                </button>
                <button onClick={() => downloadReceiptAsPDF(lastReceipt)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg transition-colors">
                  <Download size={18} /> Download
                </button>
              </div>
            </div>
          </div>
        )}

        {showReviewModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review Credit</h2>
                <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Creditor Details</p>
                  <p className="font-semibold text-lg text-gray-900 dark:text-white">
                    {creditors.find((c: any) => c.id === selectedCreditor)?.full_name || 'Unknown'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-2">Items to Issue</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{item.itemName} (x{formatQty(item.quantity)})</span>
                        <span className="font-bold text-gray-900 dark:text-white">₦{(item.quantity * item.unitPrice).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-700 flex justify-between">
                    <span className="font-bold text-gray-700 dark:text-gray-400">Total Quantity:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatQty(totalQuantity)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="font-bold text-gray-700 dark:text-gray-400">Total Amount:</span>
                    <span className="font-bold text-pink-600 dark:text-pink-400 text-lg">₦{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                    <p className="text-sm text-yellow-800 dark:text-yellow-400 uppercase font-bold tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-yellow-900 dark:text-yellow-200">{notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowReviewModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Back to Edit
                </button>
                <button
                  onClick={() => { setShowReviewModal(false); handleSubmit(); }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Give Credit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
