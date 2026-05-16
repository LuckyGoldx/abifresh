'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Search, Package, ArrowLeftRight, User, RefreshCcw, CheckCircle2, ChevronRight, Store, AlertCircle, X, Calendar } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';
import { Toast, CreditTabs } from '@/components/credits';

export default function CreditStorePage() {
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedForReturn, setSelectedForReturn] = useState<string[]>([]);
  const [isReturning, setIsReturning] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreItems();
  }, []);

  const fetchStoreItems = async (retryCount = 0) => {
    try {
      const { data } = await api.get('/api/credits/store');
      setStoreItems(data.filter((item: any) => item.status !== 'paid'));
      setToast(null);
      setIsLoading(false);
    } catch (error: any) {
      if (retryCount < 2) {
        // Silent retry after 1.5s
        setTimeout(() => fetchStoreItems(retryCount + 1), 1500);
      } else {
        setToast({ message: 'Connection interrupted. Retrying...', type: 'error' });
        setIsLoading(false);
      }
    }
  };

  const filteredItems = storeItems.filter(item => 
    item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.creditors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Items available for return (must not be already returned/paid, AND either marked returnable OR from cancelled sale)
  const returnableItems = storeItems.filter(item => {
    if (item.status === 'returned' || item.status === 'paid') return false;
    const isSaleCancelled = item.credit_sale_items?.credit_sales?.status === 'cancelled';
    return item.status === 'available for return' || isSaleCancelled;
  });

  const handleReturn = async () => {
    setIsReturning(true);
    const previousItems = [...storeItems];
    
    try {
      const itemsToReturn = returnableItems
        .filter(item => selectedForReturn.includes(item.id))
        .map(item => ({
          id: item.id,
          item_id: item.item_id,
          quantity: item.quantity
        }));

      const res = await api.post('/api/credits/store', { items: itemsToReturn });
      
      setToast({ message: 'Items successfully returned to active store', type: 'success' });
      
      if (res.data?.updatedStore) {
        setStoreItems(res.data.updatedStore);
      }
      
      setSelectedForReturn([]);
      setShowConfirmModal(false);
      setShowReturnModal(false);
    } catch (error: any) {
      // ROLLBACK: If it fails, bring the items back
      setStoreItems(previousItems);
      setToast({ message: error.response?.data?.error || 'Failed to return items. Please check your connection.', type: 'error' });
    } finally {
      setIsReturning(false);
    }
  };

  const handleViewReceipt = async (item: any) => {
    const saleId = item.credit_sale_id;
    if (!saleId) return;
    
    setHighlightedItemId(item.credit_sale_item_id || item.id);
    setShowReceiptModal(true);
    setIsModalLoading(true);

    try {
      const res = await api.get(`/api/credits/sales/${saleId}`);
      setSelectedReceipt(res.data);
    } catch (error: any) {
      setToast({ message: 'Failed to load receipt details', type: 'error' });
      setShowReceiptModal(false);
    } finally {
      setIsModalLoading(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <CreditTabs />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Credit Store</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Track items currently held by creditors and manage inventory returns</p>
          </div>
          <button 
            onClick={() => setShowReturnModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-xl font-black hover:bg-pink-700 transition-all shadow-xl shadow-pink-200"
          >
            <RefreshCcw size={18} />
            RETURN TO SHOP
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-12 h-12 bg-pink-50 dark:bg-pink-900/30 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400 mb-4">
              <Package size={24} />
            </div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Items on Credit</p>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
              {formatQty(storeItems.filter(i => i.status === 'active').reduce((acc, curr) => acc + curr.quantity, 0))}
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <User size={24} />
            </div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Active Creditors</p>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
              {new Set(storeItems.filter(i => i.status === 'active').map(i => i.creditor_id)).size}
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
              <Store size={24} />
            </div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Returned to Shop</p>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
              {storeItems.filter(i => i.status === 'returned').length}
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 mb-8 border-b border-gray-100 dark:border-gray-700">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 text-sm font-black transition-all relative ${
              activeTab === 'inventory' ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            CURRENT INVENTORY
            {activeTab === 'inventory' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-600 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-4 text-sm font-black transition-all relative ${
              activeTab === 'history' ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            RETURN HISTORY
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-600 rounded-full" />}
          </button>
        </div>

        {/* Main List */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
          {activeTab === 'inventory' ? (
            <>
          <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items or creditors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-pink-500 font-medium text-sm transition-all text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[10px] font-black tracking-widest uppercase">Live View</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b dark:border-gray-700">
                  <th className="py-4 px-6">Item Details</th>
                  <th className="py-4 px-6">Creditor</th>
                  <th className="py-4 px-6">Quantity</th>
                  <th className="py-4 px-6">Source Receipt</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredItems.filter(i => i.status !== 'returned').map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-all">
                          <Package size={20} />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">{item.item_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        <User size={14} className="text-gray-400 dark:text-gray-500" />
                        {item.creditors?.full_name}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-black text-gray-900 dark:text-white">
                        {formatQty(item.quantity)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => handleViewReceipt(item)}
                        className="text-xs font-black text-pink-600 hover:underline decoration-2 underline-offset-4"
                      >
                        {item.credit_sale_items?.credit_sales?.receipt_number || 'N/A'}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                        (item.status === 'active' && item.credit_sale_items?.credit_sales?.status !== 'cancelled') ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        (item.status === 'available for return' || item.credit_sale_items?.credit_sales?.status === 'cancelled') ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' :
                        item.status === 'returned' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {item.credit_sale_items?.credit_sales?.status === 'cancelled' 
                          ? 'Available for Return' 
                          : item.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.filter(i => i.status !== 'returned').length === 0 && (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                </div>
                <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-xs tracking-widest">No active items in credit store</p>
              </div>
            )}
          </div>
          </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b dark:border-gray-700">
                    <th className="py-4 px-6">Return Date</th>
                    <th className="py-4 px-6">Item</th>
                    <th className="py-4 px-6">Creditor</th>
                    <th className="py-4 px-6">Quantity</th>
                    <th className="py-4 px-6">Source Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {storeItems.filter(i => i.status === 'returned').map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                          <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
                          {new Date(item.updated_at || item.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-gray-900 dark:text-white">{item.item_name}</span>
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-gray-600 dark:text-gray-400">
                        {item.creditors?.full_name}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-black">
                          {formatQty(item.quantity)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button 
                          onClick={() => handleViewReceipt(item)}
                          className="text-xs font-black text-pink-600 hover:underline decoration-2 underline-offset-4"
                        >
                          {item.credit_sale_items?.credit_sales?.receipt_number || 'N/A'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {storeItems.filter(i => i.status === 'returned').length === 0 && (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RefreshCcw className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-xs tracking-widest">No return history found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RETURN MODAL */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in duration-200 border dark:border-gray-700">
              <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">Return to Active Store</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Select items from cancelled sales to move back to inventory</p>
                </div>
                <button onClick={() => setShowReturnModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X size={24} className="text-gray-400 dark:text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {returnableItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-gray-300 dark:text-gray-700" />
                    </div>
                    <p className="text-gray-400 dark:text-gray-500 font-bold">No items currently available for return</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Items must come from a CANCELLED sale to be returnable</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {returnableItems.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setSelectedForReturn(prev => 
                            prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                          );
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                          selectedForReturn.includes(item.id) 
                            ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-900/20' 
                            : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            selectedForReturn.includes(item.id) ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}>
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{item.item_name}</p>
                            <div className="flex gap-2 items-center mt-0.5">
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Qty: {formatQty(item.quantity)} • From: {item.creditors?.full_name}</p>
                              <span className="text-[10px] bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded font-mono font-bold">
                                {item.credit_sale_items?.credit_sales?.receipt_number}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedForReturn.includes(item.id) && <CheckCircle2 className="text-pink-500" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-8 bg-pink-50 dark:bg-pink-900/10 rounded-b-3xl border-t dark:border-gray-700">
                <button 
                  disabled={selectedForReturn.length === 0}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full py-4 bg-pink-600 text-white rounded-2xl font-black text-lg hover:bg-pink-700 transition-all shadow-xl shadow-pink-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  PROCESS RETURN ({selectedForReturn.length})
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL (STYLISH) */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-10 shadow-2xl text-center animate-in slide-in-from-bottom duration-300 border dark:border-gray-700">
              <div className="w-20 h-20 bg-pink-50 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCcw className={`w-10 h-10 text-pink-600 dark:text-pink-400 ${isReturning ? 'animate-spin' : ''}`} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Are you sure?</h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-8">
                You are about to return <span className="font-black text-pink-600 dark:text-pink-400">{selectedForReturn.length}</span> items to your active inventory. This action will update your shop stock.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={handleReturn}
                  disabled={isReturning}
                  className="w-full py-4 bg-pink-600 text-white rounded-2xl font-black text-lg hover:bg-pink-700 shadow-xl shadow-pink-200 transition-all disabled:opacity-50"
                >
                  {isReturning ? 'RETURNING...' : 'YES, RETURN TO SHOP'}
                </button>
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isReturning}
                  className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-pink-600 dark:text-pink-400 rounded-2xl font-bold hover:text-pink-700 dark:hover:text-pink-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  GO BACK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECEIPT MODAL */}
        {showReceiptModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in duration-200 border dark:border-gray-700">
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
              >
                <X size={24} className="text-gray-400 dark:text-gray-500" />
              </button>
              
              <div className="p-8">
                <div className="bg-pink-600 p-8 text-center rounded-2xl mb-8">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Abifresh & Kiddies Ventures</h2>
                  <p className="text-pink-100 text-sm font-bold uppercase tracking-widest mt-2">Source Credit Receipt</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Receipt Number</p>
                    <p className="font-mono font-bold text-gray-900 dark:text-white">{selectedReceipt.receipt_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Creditor</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedReceipt.creditors?.full_name}</p>
                  </div>
                </div>

                {isModalLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-pink-100 border-t-pink-600 rounded-full animate-spin"></div>
                    <p className="text-xs font-black text-pink-600 uppercase tracking-widest animate-pulse">Fetching full receipt...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <div className="bg-pink-50 dark:bg-pink-900/20 px-4 py-3 flex justify-between text-[10px] font-black text-pink-700 dark:text-pink-400 uppercase tracking-widest rounded-t-xl">
                        <span className="flex-1">Item Description</span>
                        <span className="w-24 text-right">Qty</span>
                        <span className="w-24 text-right">Price</span>
                        <span className="w-24 text-right">Total</span>
                      </div>
                      <div className="border border-pink-50 dark:border-pink-900/30 rounded-b-xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
                        {selectedReceipt.credit_sale_items?.map((item: any) => {
                          const isHighlighted = String(item.id) === String(highlightedItemId);
                          return (
                            <div 
                              key={item.id} 
                              className={`px-4 py-4 flex justify-between items-center transition-all ${
                                isHighlighted ? 'bg-pink-50/70 dark:bg-pink-900/20 border-l-4 border-l-pink-600' : 'bg-white dark:bg-gray-800'
                              }`}
                            >
                              <div className="flex-1">
                                <span className="font-black text-gray-900 dark:text-white">{item.item_name}</span>
                                {isHighlighted && (
                                  <span className="block text-[8px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-tighter mt-0.5">Currently Viewing This Item</span>
                                )}
                              </div>
                              <span className="w-24 text-right font-bold text-gray-600 dark:text-gray-400">{formatQty(item.quantity)}</span>
                              <span className="w-24 text-right font-bold text-gray-600 dark:text-gray-400">₦{item.unit_price?.toLocaleString()}</span>
                              <span className="w-24 text-right font-black text-gray-900 dark:text-white">₦{(item.quantity * item.unit_price).toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-pink-50 dark:bg-pink-900/10 rounded-2xl p-6 border border-pink-100 dark:border-pink-900/30 flex justify-between items-center">
                      <span className="text-pink-700 dark:text-pink-400 font-black uppercase tracking-widest">Transaction Total</span>
                      <span className="text-3xl font-black text-pink-600 dark:text-pink-400">₦{Number(selectedReceipt.total_amount).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
