'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Search, Eye, X, DollarSign, CheckCircle, XCircle, AlertCircle, Package, Upload, FileText, Activity } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';
import { Toast, CreditTabs } from '@/components/credits';

export default function ManageCreditsPage() {
  const [creditSales, setCreditSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [viewSale, setViewSale] = useState<any>(null);
  const [paySale, setPaySale] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSale, setCancelSale] = useState<any>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelDoubleConfirm, setShowCancelDoubleConfirm] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [refNumber, setRefNumber] = useState('');
  const [note, setNote] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCreditSales();
  }, []);

  const fetchCreditSales = async (retryCount = 0) => {
    try {
      const res = await api.get('/api/credits/sales');
      setCreditSales(res.data || []);
      setToast(null);
      setIsLoading(false);
    } catch (error: any) {
      if (retryCount < 2) {
        // Silent retry after 1.5s
        setTimeout(() => fetchCreditSales(retryCount + 1), 1500);
      } else {
        setToast({ message: 'Connection interrupted. Retrying...', type: 'error' });
        setIsLoading(false);
      }
    }
  };

  const handleCancelCredit = async (saleId: string) => {
    setIsCancelling(true);
    try {
      await api.post(`/api/credits/sales/${saleId}/cancel`);
      setToast({ message: 'Credit cancelled successfully', type: 'success' });
      setShowCancelDoubleConfirm(false);
      setCancelSale(null);
      fetchCreditSales();
    } catch (error: any) {
      setToast({ message: 'Failed to cancel: ' + (error.response?.data?.error || error.message), type: 'error' });
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePayment = async (saleId: string) => {
    const currentSalePaid = paySale.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const currentSaleBalance = Number(paySale.total_amount) - currentSalePaid;

    const calculatedSum = selectedItemIds.length > 0 
      ? paySale.credit_sale_items
          .filter((i: any) => selectedItemIds.includes(i.id))
          .reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)
      : 0;

    const finalAmount = paymentAmount || calculatedSum;

    if (!finalAmount || Number(finalAmount) <= 0) {
      setToast({ message: 'Please enter a valid amount or select items', type: 'error' });
      return;
    }

    if (Number(finalAmount) > currentSaleBalance) {
      setToast({ message: `Amount cannot exceed balance (₦${currentSaleBalance.toLocaleString()})`, type: 'error' });
      return;
    }

    if ((paymentMethod === 'pos' || paymentMethod === 'online_transfer') && !receiptFile) {
      setToast({ message: 'Receipt upload is mandatory for POS/Transfer', type: 'error' });
      return;
    }

    setIsPaying(true);
    try {
      const formData = new FormData();
      formData.append('amount', String(finalAmount));
      formData.append('payment_method', paymentMethod);
      
      const generatedRef = paymentMethod === 'cash' && !refNumber ? `CASH-${Date.now()}` : refNumber;
      formData.append('reference_number', generatedRef);
      
      formData.append('note', note);
      formData.append('paid_items', JSON.stringify(selectedItemIds));
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const res = await api.post(`/api/credits/sales/${saleId}/payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setToast({ message: res.data.message || 'Payment recorded', type: 'success' });
      setPaySale(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setRefNumber('');
      setNote('');
      setReceiptFile(null);
      setSelectedItemIds([]);
      fetchCreditSales();
    } catch (error: any) {
      setToast({ message: 'Payment failed: ' + (error.response?.data?.error || error.message), type: 'error' });
    } finally {
      setIsPaying(false);
    }
  };

  const filteredSales = creditSales.filter(s => {
    const matchesSearch = s.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.creditors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && s.status !== 'paid'; // Automatically hide fully paid transactions
  });

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto text-center py-8">Loading manage credits...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto"><CreditTabs />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Credits</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View credit items, mark them as paid, or cancel credits</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by receipt number or creditor name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Receipt No.</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Creditor</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Amount</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Paid</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Balance</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Items</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const totalPaid = sale.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
                  const balance = Number(sale.total_amount) - totalPaid;
                  const isCancelled = sale.status === 'cancelled';
                  
                  return (
                    <tr key={sale.id} className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${isCancelled ? 'bg-gray-50 dark:bg-gray-900/40 opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{sale.receipt_number}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-200">{sale.creditors?.full_name}</td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">₦{Number(sale.total_amount).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-green-600">₦{totalPaid.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm font-bold text-red-600">
                        {isCancelled ? 'CANCELLED' : `₦${balance.toLocaleString()}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{sale.credit_sale_items?.length || 0}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex gap-3">
                          <button
                            onClick={() => setViewSale(sale)}
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-30"
                            title="View History"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {!isCancelled && balance > 0 && (
                            <button
                              onClick={() => { setPaySale(sale); setPaymentMethod('cash'); }}
                              className="text-green-600 hover:text-green-800"
                              title="Pay Now"
                            >
                              <DollarSign size={18} />
                            </button>
                          )}

                          {!isCancelled && sale.status !== 'paid' && totalPaid <= 0 && (
                            <button
                              onClick={() => { setCancelSale(sale); setShowCancelConfirm(true); }}
                              className="text-red-500 hover:text-red-700"
                              title="Cancel Credit"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CANCELLATION MODAL 1 */}
        {showCancelConfirm && cancelSale && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-200 border dark:border-gray-700">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white text-center mb-2">Cancel this Credit?</h2>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                You are about to cancel receipt <span className="font-bold text-red-600 dark:text-red-400">{cancelSale.receipt_number}</span>. This will reverse the debt for {cancelSale.creditors?.full_name}.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Wait, Go Back
                </button>
                <button 
                  onClick={() => { setShowCancelConfirm(false); setShowCancelDoubleConfirm(true); }}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                >
                  Yes, Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CANCELLATION MODAL 2 (DOUBLE CONFIRM) */}
        {showCancelDoubleConfirm && cancelSale && (
          <div className="fixed inset-0 bg-red-600/90 backdrop-blur-md flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 border dark:border-gray-700">
              <h2 className="text-3xl font-black text-red-600 dark:text-red-400 text-center mb-4">FINAL WARNING</h2>
              <p className="text-gray-800 dark:text-gray-200 text-center font-medium mb-8">
                This action is IRREVERSIBLE. Are you absolutely sure you want to cancel this credit transaction?
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => handleCancelCredit(cancelSale.id)}
                  disabled={isCancelling}
                  className="w-full px-6 py-4 rounded-xl bg-red-600 text-white font-black text-lg hover:bg-red-700 shadow-xl transition-all disabled:opacity-50"
                >
                  {isCancelling ? 'CANCELLING...' : 'CONFIRM CANCELLATION'}
                </button>
                <button 
                  onClick={() => setShowCancelDoubleConfirm(false)}
                  className="w-full px-6 py-3 rounded-xl border-2 border-gray-100 font-bold text-gray-400 hover:text-gray-600 transition-all"
                >
                  CANCEL REQUEST
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REVERTED VIEW MODAL (Eye Icon) */}
        {viewSale && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in duration-200 border dark:border-gray-700">
              {/* Header - Fixed */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400 font-black">
                    #
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">{viewSale.receipt_number}</h2>
                </div>
                <button onClick={() => setViewSale(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status Card */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Creditor</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{viewSale.creditors?.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(viewSale.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${
                    viewSale.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    viewSale.status === 'partially_paid' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                    viewSale.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  }`}>
                    {viewSale.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Items Section */}
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Package size={14} className="text-pink-500" />
                    Items Breakdown
                  </h3>
                  <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-800 space-y-3">
                    {viewSale.credit_sale_items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm items-center">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{item.item_name} <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold ml-1">x{formatQty(item.quantity)}</span></span>
                        <span className="font-bold text-gray-900 dark:text-white">₦{(item.quantity * item.unit_price).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-sm font-black text-gray-900 dark:text-white">Total Bill</span>
                      <span className="text-lg font-black text-pink-600 dark:text-pink-400">₦{Number(viewSale.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Payment History</h3>
                  <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                    {viewSale.payments?.length > 0 ? (
                      <div className="space-y-2">
                        {viewSale.payments.map((p: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs items-center p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-50 dark:border-gray-700 shadow-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-bold">{new Date(p.created_at).toLocaleDateString()}</span>
                            <span className="font-black text-green-600">+₦{Number(p.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-xs font-bold italic">
                        No payments recorded yet
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center px-1">
                      <span className="text-sm font-black text-gray-900 dark:text-white">Remaining Balance</span>
                      <span className="text-lg font-black text-red-600">₦{(Number(viewSale.total_amount) - (viewSale.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-2xl">
                <button
                  onClick={() => setViewSale(null)}
                  className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-black hover:bg-black transition-all shadow-lg"
                >
                  CLOSE VIEW
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SIMPLIFIED PAYMENT MODAL (Dollar Icon) */}
        {paySale && (() => {
          const currentSalePaid = paySale.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
          const currentSaleBalance = Number(paySale.total_amount) - currentSalePaid;
          
          const unpaidItems = paySale.credit_sale_items?.filter((item: any) => {
            const storeEntry = paySale.credit_store?.find((cs: any) => cs.credit_sale_item_id === item.id);
            return storeEntry?.status !== 'paid';
          }) || [];

          const effectiveAmount = paymentAmount !== '' ? Number(paymentAmount) : (
            selectedItemIds.length > 0 
              ? paySale.credit_sale_items
                  .filter((i: any) => selectedItemIds.includes(i.id))
                  .reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)
              : 0
          );
          const remainingAfter = currentSaleBalance - effectiveAmount;

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border dark:border-gray-700">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{paySale.receipt_number}</p>
                  </div>
                  <button 
                    onClick={() => { setPaySale(null); setPaymentAmount(''); setSelectedItemIds([]); }} 
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  {/* Section: Info */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 text-sm">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <p className="text-blue-600 dark:text-blue-400 font-bold uppercase text-[10px] mb-1">Creditor</p>
                      <p className="text-gray-900 dark:text-white font-bold truncate">{paySale.creditors?.full_name}</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                      <p className="text-red-600 dark:text-red-400 font-bold uppercase text-[10px] mb-1">Receipt Balance</p>
                      <p className="text-gray-900 dark:text-white font-bold">₦{currentSaleBalance.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                      <p className="text-green-600 dark:text-green-400 font-bold uppercase text-[10px] mb-1">Total Paid</p>
                      <p className="text-gray-900 dark:text-white font-bold">₦{currentSalePaid.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
                      <p className="text-orange-600 dark:text-orange-400 font-bold uppercase text-[10px] mb-1">Total Outstanding</p>
                      <p className="text-gray-900 dark:text-white font-bold">₦{(paySale.creditors?.outstanding || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] mb-1">Sale Date</p>
                      <p className="text-gray-900 dark:text-white font-bold">{new Date(paySale.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Section: Amount to Pay */}
                  <div className="mb-8 p-6 bg-pink-50/30 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/30 shadow-sm">
                    <label className="text-[11px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-[2px] block mb-3">Amount to Pay</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 dark:text-pink-600 font-black text-xl">₦</span>
                      <input 
                        type="number"
                        value={paymentAmount || (selectedItemIds.length > 0 
                          ? paySale.credit_sale_items
                              .filter((i: any) => selectedItemIds.includes(i.id))
                              .reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.unit_price)), 0)
                          : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = Number(val);
                          if (numVal > currentSaleBalance) {
                            setPaymentAmount(currentSaleBalance.toString());
                            setSelectedItemIds(unpaidItems.map((i: any) => i.id));
                            setToast({ message: `Amount cannot exceed balance (₦${currentSaleBalance.toLocaleString()})`, type: 'error' });
                          } else {
                            setPaymentAmount(val);
                            if (val === '' || numVal <= 0) {
                              setSelectedItemIds([]);
                            } else {
                              // FIFO Selection: Select items in receipt order until amount is covered
                              let runningSum = 0;
                              const newSelected: string[] = [];
                              
                              // unpaidItems are already in receipt order
                              for (const item of unpaidItems) {
                                if (runningSum >= numVal) break;
                                
                                const itemTotal = Number(item.quantity) * Number(item.unit_price);
                                // Check what's already paid for this item from the store status
                                const storeEntry = paySale.credit_store?.find((cs: any) => cs.credit_sale_item_id === item.id);
                                // If we have balance tracking, we use it, otherwise we assume itemTotal
                                const itemRemaining = itemTotal; // Simplified for UI selection
                                
                                newSelected.push(item.id);
                                runningSum += itemRemaining;
                              }
                              setSelectedItemIds(newSelected);
                            }
                          }
                        }}
                        placeholder="0.00"
                        className="w-full bg-white dark:bg-gray-700 border-2 border-pink-100 dark:border-pink-900/50 rounded-xl pl-10 pr-4 py-4 text-2xl focus:ring-4 focus:ring-pink-100 dark:focus:ring-pink-900/20 focus:border-pink-500 outline-none font-black text-gray-900 dark:text-white transition-all placeholder:text-pink-100 dark:placeholder:text-pink-900/30"
                      />
                    </div>
                    <div className="flex justify-between mt-2 px-1">
                      <p className={`text-xs font-black ${remainingAfter < 0 ? 'text-red-500' : 'text-green-600'}`}>
                        Remaining Balance: ₦{remainingAfter.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Section: Items Selection */}
                  <div className="mb-8">
                    <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[2px] mb-3 flex items-center gap-2">
                      <Package size={14} className="text-pink-500" />
                      Select Items to Pay
                    </h3>
                    <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                      {unpaidItems.length > 0 ? (
                        unpaidItems.map((item: any) => {
                          const isSelected = selectedItemIds.includes(item.id);
                          return (
                            <div 
                              key={item.id} 
                              onClick={() => {
                                let newSelected;
                                if (selectedItemIds.includes(item.id)) {
                                  newSelected = selectedItemIds.filter(id => id !== item.id);
                                } else {
                                  newSelected = [...selectedItemIds, item.id];
                                }
                                setSelectedItemIds(newSelected);
                                const newSum = paySale.credit_sale_items
                                  .filter((i: any) => newSelected.includes(i.id))
                                  .reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
                                setPaymentAmount(newSum > 0 ? newSum.toString() : '');
                              }}
                              className={`flex items-center justify-between p-4 cursor-pointer transition-all ${isSelected ? 'bg-pink-50/40 dark:bg-pink-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 border-2 rounded-lg transition-all flex items-center justify-center ${isSelected ? 'bg-pink-500 border-pink-500 shadow-lg shadow-pink-200 dark:shadow-none' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                  {isSelected && <CheckCircle size={16} className="text-white" />}
                                </div>
                                <span className={`text-sm font-bold ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{item.item_name} (x{formatQty(item.quantity)})</span>
                              </div>
                              <span className={`text-sm font-black ${isSelected ? 'text-pink-600 dark:text-pink-400' : 'text-gray-900 dark:text-white'}`}>₦{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <p className="text-sm font-medium">No unpaid items found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section: Payment Method & Details */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div>
                        <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">Payment Method</label>
                        <select 
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none font-bold text-gray-900 dark:text-white"
                        >
                          <option value="cash">Cash</option>
                          <option value="pos">POS Terminal</option>
                          <option value="online_transfer">Online Transfer</option>
                        </select>
                      </div>

                      {paymentMethod !== 'cash' && (
                        <div>
                          <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">Ref Number</label>
                          <input 
                            type="text"
                            value={refNumber}
                            onChange={(e) => setRefNumber(e.target.value)}
                            placeholder="Transaction ID"
                            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none font-bold text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {(paymentMethod === 'pos' || paymentMethod === 'online_transfer') && (
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2 text-pink-600 dark:text-pink-400">Upload Payment Receipt</label>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-pink-100 dark:border-pink-900/50 border-dashed rounded-xl bg-white dark:bg-gray-700">
                            <div className="space-y-1 text-center">
                              <Upload className="mx-auto h-12 w-12 text-pink-300 dark:text-pink-700" />
                              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-black text-pink-600 dark:text-pink-400 hover:text-pink-500">
                                  <span>{receiptFile ? receiptFile.name : 'Click to upload receipt image'}</span>
                                  <input 
                                    type="file" 
                                    className="sr-only" 
                                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                    accept="image/*"
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG up to 10MB</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section: Note */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">Note (Optional)</label>
                      <textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add any additional details about this payment..."
                        rows={2}
                        className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none font-medium resize-none text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex gap-3">
                  <button 
                    onClick={() => { setPaySale(null); setPaymentAmount(''); setSelectedItemIds([]); }}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handlePayment(paySale.id)}
                    disabled={isPaying || effectiveAmount <= 0}
                    className="flex-[2] px-4 py-2.5 rounded-lg bg-pink-600 text-white font-bold text-sm hover:bg-pink-700 shadow-lg shadow-pink-200 dark:shadow-none transition-all disabled:opacity-50"
                  >
                    {isPaying ? 'Processing...' : 'Complete Payment'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
