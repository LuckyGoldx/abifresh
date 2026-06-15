'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import {
  ArrowLeft,
  X,
  Eye,
  Printer,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Trash2,
  Package,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  TrendingUp
} from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';
import { printReceipt } from '@/lib/receipt-utils';
import { AbifreshLoading } from '@/components/AbifreshLoading';

// Toast component
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

export default function CreditorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [creditor, setCreditor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'cash' as 'cash' | 'pos' | 'online_transfer',
    amount: '',
    referenceNumber: '',
    notes: '',
    selectedItems: [] as string[],
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  
  const [showPaymentReceiptModal, setShowPaymentReceiptModal] = useState(false);
  const [selectedPaymentReceipt, setSelectedPaymentReceipt] = useState<any>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<'credit' | 'payment'>('credit');
  const [creditPage, setCreditPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchCreditorDetails();
  }, [params.id]);

  const fetchCreditorDetails = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/api/credits/creditors/${params.id}`);
      setCreditor(res.data);
    } catch (error: any) {
      setToast({ message: 'Failed to load creditor details', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPayment = (saleId?: string) => {
    setSelectedSaleId(saleId || creditor.credit_sales?.[0]?.id || null);
    setPaymentForm({
      paymentMethod: 'cash',
      amount: '',
      referenceNumber: '',
      notes: '',
      selectedItems: [],
    });
    setReceiptFile(null);
    setReceiptPreview(null);
    setShowPaymentModal(true);
  };

  // Auto-generate reference for cash, clear for pos/transfer
  useEffect(() => {
    if (!showPaymentModal) return;
    const now = new Date();
    const ts = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '-' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    if (paymentForm.paymentMethod === 'cash') {
      setPaymentForm(f => ({ ...f, referenceNumber: `CASH-${ts}` }));
    } else {
      setPaymentForm(f => ({ ...f, referenceNumber: '' }));
    }
  }, [paymentForm.paymentMethod, showPaymentModal]);

  const handleSubmitPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setToast({ message: 'Please enter a valid amount', type: 'error' });
      return;
    }

    // Validate against selected sale's balance
    if (selectedSaleId) {
      const sale = (creditor.credit_sales || []).find((s: any) => s.id === selectedSaleId);
      if (sale) {
        const salePayments = sale.payments || [];
        const currentSalePaid = salePayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        const currentSaleBalance = Number(sale.total_amount) - currentSalePaid;
        if (Number(paymentForm.amount) > currentSaleBalance) {
          setToast({ message: `Amount cannot exceed sale balance (₦${currentSaleBalance.toLocaleString()})`, type: 'error' });
          return;
        }
      }
    }

    // Require receipt for POS/Transfer
    if ((paymentForm.paymentMethod === 'pos' || paymentForm.paymentMethod === 'online_transfer') && !receiptFile) {
      setToast({ message: 'Receipt upload is mandatory for POS/Transfer', type: 'error' });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('amount', paymentForm.amount);
      formDataToSend.append('payment_method', paymentForm.paymentMethod);
      const ref = paymentForm.paymentMethod === 'cash' && !paymentForm.referenceNumber
        ? `CASH-${Date.now()}`
        : paymentForm.referenceNumber;
      formDataToSend.append('reference_number', ref);
      formDataToSend.append('note', paymentForm.notes);
      formDataToSend.append('paid_items', JSON.stringify(paymentForm.selectedItems));
      
      if (receiptFile) {
        formDataToSend.append('receipt', receiptFile);
      }

      await api.post(`/api/credits/sales/${selectedSaleId}/payment`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setToast({ message: 'Payment recorded successfully!', type: 'success' });
      setShowPaymentModal(false);
      fetchCreditorDetails();
    } catch (error: any) {
      setToast({ message: 'Failed to record payment: ' + (error.response?.data?.error || error.message), type: 'error' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleViewReceipt = (sale: any) => {
    const items = sale.credit_sale_items?.map((item: any) => {
      const paidQty = item.quantity_paid || 0;
      const totalQty = item.quantity || 0;
      let itemStatus = sale.status;

      if (paidQty >= totalQty && totalQty > 0) {
        itemStatus = 'paid';
      }

      return {
        name: item.item_name,
        sale_quantity: totalQty,
        paid_quantity: paidQty,
        price: item.item?.price_jalingo || item.unit_price,
        status: itemStatus,
        paid_percentage: item.paid_percentage || 0
      };
    }) || [];

    const allPaid = items.length > 0 && items.every((i: any) => i.paid_percentage >= 100);
    const hasPayment = items.some((i: any) => i.paid_quantity > 0);

    let receiptStatus = sale.status || 'active';
    if (receiptStatus !== 'cancelled') {
      if (allPaid) receiptStatus = 'paid';
      else if (hasPayment) receiptStatus = 'partially_paid';
    }

    const formattedReceipt = {
      receipt_number: sale.receipt_number,
      timestamp: sale.created_at,
      staff_name: sale.users?.full_name || 'Staff',
      payment_method: 'Credit',
      items,
      receipt_status: receiptStatus,
      total_amount: sale.total_amount,
      creditor: {
        name: creditor.full_name,
        phone: creditor.phone_number,
      }
    };
    setSelectedReceipt(formattedReceipt);
    setShowReceiptModal(true);
  };

  const handleViewPaymentReceipt = (payment: any) => {
    setSelectedPaymentReceipt(payment);
    setShowPaymentReceiptModal(true);
  };

  const handleCancelSale = async () => {
    if (!selectedSaleId) return;
    try {
      await api.post(`/api/credits/sales/${selectedSaleId}/cancel`);
      setToast({ message: 'Credit sale cancelled successfully!', type: 'success' });
      setShowCancelModal(false);
      fetchCreditorDetails();
    } catch (error: any) {
      setToast({ message: 'Failed to cancel credit: ' + (error.response?.data?.error || error.message), type: 'error' });
    }
  };

  if (isLoading) return <AbifreshLoading />;

  if (!creditor) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Creditor not found</h2>
        <button onClick={() => router.back()} className="mt-4 text-pink-500 font-semibold hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{creditor.full_name}</h1>
              <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{creditor.unique_code}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Row: Info & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-pink-500" />
                Creditor Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Phone Number</p>
                      <p className="text-gray-800 dark:text-gray-200 font-medium">{creditor.phone_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Email Address</p>
                      <p className="text-gray-800 dark:text-gray-200 font-medium">{creditor.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Address</p>
                      <p className="text-gray-800 dark:text-gray-200 font-medium">{creditor.address || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Registered Date</p>
                      <p className="text-gray-800 dark:text-gray-200 font-medium">{new Date(creditor.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Stats Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 h-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-pink-500" />
              Financial Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50 shadow-sm transition-all hover:shadow-md">
                <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Lifetime Quantity</p>
                <p className="text-xl font-black text-blue-900 dark:text-blue-100">{formatQty(creditor.total_quantity || 0)} Units</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 border border-orange-100 dark:border-orange-900/50 shadow-sm transition-all hover:shadow-md">
                <p className="text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Credit Qty</p>
                <p className="text-xl font-black text-orange-900 dark:text-orange-100">{formatQty(creditor.active_credit_quantity || 0)} Units</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 border border-green-100 dark:border-green-900/50 shadow-sm transition-all hover:shadow-md">
                <p className="text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Amount Paid</p>
                <p className="text-xl font-black text-green-900 dark:text-green-100">₦{(creditor.total_paid || 0).toLocaleString()}</p>
              </div>
              <div className="bg-pink-50 dark:bg-pink-900/30 rounded-xl p-4 border border-pink-100 dark:border-pink-900/50 shadow-sm transition-all hover:shadow-md">
                <p className="text-pink-600 dark:text-pink-400 text-[10px] font-black uppercase tracking-widest mb-1">Outstanding Balance</p>
                <p className="text-xl font-black text-pink-900 dark:text-pink-100">₦{(creditor.outstanding || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* History Section with Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex gap-2">
              <button
                onClick={() => { setHistoryTab('credit'); setCreditPage(1); }}
                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                  historyTab === 'credit' ? 'bg-pink-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Credit History
              </button>
              <button
                onClick={() => { setHistoryTab('payment'); setPaymentPage(1); }}
                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                  historyTab === 'payment' ? 'bg-pink-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Payment History
              </button>
            </div>
          </div>

          {historyTab === 'credit' ? (
          <div className="overflow-x-auto">
            {creditor.credit_sales && creditor.credit_sales.length > 0 ? (
              <>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b dark:border-gray-700">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Receipt</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Paid</th>
                    <th className="py-4 px-6">Balance</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {[...creditor.credit_sales].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice((creditPage - 1) * perPage, creditPage * perPage).map((sale: any) => {
                    const paid = Number(sale.paid_amount || 0);
                    const balance = Number(sale.total_amount) - paid;
                    return (
                      <tr key={sale.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-4 px-6 text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(sale.created_at).toLocaleString()}</td>
                        <td className="py-4 px-6 text-sm font-mono font-bold text-gray-900 dark:text-white">{sale.receipt_number}</td>
                        <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">₦{Number(sale.total_amount).toLocaleString()}</td>
                        <td className="py-4 px-6 text-sm font-bold text-green-600">₦{paid.toLocaleString()}</td>
                        <td className="py-4 px-6 text-sm font-bold text-red-600">₦{balance.toLocaleString()}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest ${
                            (sale.status || 'active') === 'active' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 
                            sale.status === 'paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 
                            sale.status === 'partially_paid' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                            'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                          }`}>
                            {sale.status === 'cancelled' && (sale.paid_amount || 0) > 0 
                              ? 'CANCELLED (PARTIALLY PAID)' 
                              : (sale.status || 'active').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleViewReceipt(sale)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Receipt"><Eye className="w-4 h-4" /></button>
                            {(sale.status === 'active' || sale.status === 'partially_paid') && (
                              <button onClick={() => handleOpenPayment(sale.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Record Payment"><span className="text-base font-black">₦</span></button>
                            )}
                            {sale.status !== 'cancelled' && sale.status !== 'paid' && (
                              <button onClick={() => { setSelectedSaleId(sale.id); setShowCancelModal(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel Credit"><X className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {Math.ceil(creditor.credit_sales.length / perPage) > 1 && (
                <div className="p-4 border-t dark:border-gray-700 flex justify-center gap-2">
                  <button disabled={creditPage === 1} onClick={() => setCreditPage(p => p - 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Previous</button>
                  <span className="px-4 py-2 text-xs font-black">Page {creditPage} of {Math.ceil(creditor.credit_sales.length / perPage)}</span>
                  <button disabled={creditPage >= Math.ceil(creditor.credit_sales.length / perPage)} onClick={() => setCreditPage(p => p + 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Next</button>
                </div>
              )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No credit sales history found for this creditor.</p>
              </div>
            )}
          </div>
          ) : (
          <div className="overflow-x-auto">
            {creditor.payment_history && creditor.payment_history.length > 0 ? (
              <>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b dark:border-gray-700">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Method</th>
                    <th className="py-4 px-6">Reference</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {creditor.payment_history.slice((paymentPage - 1) * perPage, paymentPage * perPage).map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(payment.created_at).toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">₦{Number(payment.amount).toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">{payment.payment_method?.replace(/_/g, ' ')}</td>
                      <td className="py-4 px-6 text-sm font-mono text-gray-500 dark:text-gray-400">{payment.reference_number || 'N/A'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest ${
                          payment.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                          payment.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                          'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                        }`}>
                          {(payment.status || 'pending').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button onClick={() => handleViewPaymentReceipt(payment)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Receipt">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {Math.ceil(creditor.payment_history.length / perPage) > 1 && (
                <div className="p-4 border-t dark:border-gray-700 flex justify-center gap-2">
                  <button disabled={paymentPage === 1} onClick={() => setPaymentPage(p => p - 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Previous</button>
                  <span className="px-4 py-2 text-xs font-black">Page {paymentPage} of {Math.ceil(creditor.payment_history.length / perPage)}</span>
                  <button disabled={paymentPage >= Math.ceil(creditor.payment_history.length / perPage)} onClick={() => setPaymentPage(p => p + 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Next</button>
                </div>
              )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <span className="w-12 h-12 mx-auto mb-4 opacity-20 text-3xl text-gray-400 dark:text-gray-500 font-black flex items-center justify-center">₦</span>
                <p>No payments recorded for this creditor.</p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-pink-50/30 dark:bg-pink-900/10">
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 text-pink-500 text-xl font-black flex items-center justify-center">₦</span>
                Record Payment
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto">
              {/* Section: Amount to Pay (Moved to Top) */}
              <div className="p-6 bg-pink-50/30 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/30 shadow-sm">
                <label className="text-[11px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-[2px] block mb-3">Amount to Pay</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 dark:text-pink-600 font-black text-xl">₦</span>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numVal = Number(val);
                       const maxOutstanding = Number(creditor.outstanding);
                       
                       let finalAmount = val;
                       if (numVal > maxOutstanding) {
                         finalAmount = maxOutstanding.toString();
                       }

                        // FIFO Selection across unpaid items
                        let runningSum = 0;
                        const newSelected: string[] = [];
                        
                        if (finalAmount !== '' && Number(finalAmount) > 0) {
                          const amt = Number(finalAmount);
                          const allUnpaidItems = (selectedSaleId
                            ? (creditor.credit_sales || []).filter((s: any) => s.id === selectedSaleId)
                            : creditor.credit_sales || []
                          )
                            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                            .flatMap((sale: any) => (sale.credit_sale_items || [])
                              .filter((item: any) => Number(item.quantity) > Number(item.quantity_paid))
                            );

                          for (const item of allUnpaidItems) {
                            if (runningSum >= amt) break;
                            
                            const remaining = item.remaining_amount ?? (() => {
                              const sellingPrice = item.item?.price_jalingo || item.unit_price;
                              const effectiveTotal = Number(item.quantity) * sellingPrice;
                              const alreadyPaidAmt = Number(item.quantity) > 0
                                ? (Number(item.quantity_paid) / Number(item.quantity)) * effectiveTotal
                                : 0;
                              return Math.max(0, effectiveTotal - alreadyPaidAmt);
                            })();

                            const payAmount = Math.min(remaining, amt - runningSum);
                            
                            newSelected.push(item.id);
                            runningSum += payAmount;
                          }
                        }

                      setPaymentForm({ 
                        ...paymentForm, 
                        amount: finalAmount,
                        selectedItems: newSelected
                      });
                    }}
                    className="w-full bg-white dark:bg-gray-700 border-2 border-pink-100 dark:border-pink-900/50 rounded-xl pl-10 pr-4 py-4 text-2xl focus:ring-4 focus:ring-pink-100 dark:focus:ring-pink-900/20 focus:border-pink-500 outline-none font-black text-gray-900 dark:text-white transition-all placeholder:text-pink-100 dark:placeholder:text-pink-900/30"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-between mt-2 px-1">
                  <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Outstanding: <span className="text-pink-600 dark:text-pink-400">₦{creditor.outstanding?.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Item Selection (Moved below Amount) */}
              {creditor.credit_sales && creditor.credit_sales.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[2px] mb-3 flex items-center gap-2">
                    <Package size={14} className="text-pink-500" />
                    Select items paying for (Optional)
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                    {(selectedSaleId 
                      ? creditor.credit_sales.filter((s: any) => s.id === selectedSaleId)
                      : creditor.credit_sales
                    ).flatMap((sale: any) => 
                      sale.credit_sale_items?.filter((item: any) => Number(item.quantity) > Number(item.quantity_paid)).map((item: any) => {
                              const isChecked = paymentForm.selectedItems.includes(item.id);
                              return (
                          <label key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                            isChecked ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-900/20 shadow-sm' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/50 hover:border-gray-200 dark:hover:border-gray-600'
                          }`}>
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                              isChecked ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-200 dark:shadow-none' : 'border-gray-200 dark:border-gray-700 text-transparent'
                            }`}>
                              <CheckCircle className="w-4 h-4" />
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let newSelected = [...paymentForm.selectedItems];
                                if (e.target.checked) {
                                  newSelected.push(item.id);
                                } else {
                                  newSelected = newSelected.filter((id: string) => id !== item.id);
                                }
                                const newAmount = newSelected.reduce((sum: number, id: string) => {
                                  const target = (selectedSaleId
                                    ? (creditor.credit_sales || []).filter((s: any) => s.id === selectedSaleId)
                                    : creditor.credit_sales || []
                                  ).flatMap((s: any) => s.credit_sale_items || []).find((i: any) => i.id === id);
                                  if (!target) return sum;
                                  const sellingPrice = target.item?.price_jalingo || target.unit_price;
                                  const effectiveTotal = Number(target.quantity) * sellingPrice;
                                  const alreadyPaidAmt = Number(target.quantity) > 0
                                    ? (Number(target.quantity_paid) / Number(target.quantity)) * effectiveTotal
                                    : 0;
                                  return sum + Math.max(0, effectiveTotal - alreadyPaidAmt);
                                }, 0);
                                setPaymentForm({ 
                                  ...paymentForm, 
                                  selectedItems: newSelected, 
                                  amount: newAmount > 0 ? newAmount.toString() : '' 
                                });
                              }}
                              className="hidden"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-black text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{item.item_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Remaining Qty:</span>
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{formatQty(Number(item.quantity) - Number(item.quantity_paid))}</span>
                              </div>
                            </div>
                             <div className="text-right">
                               <p className="text-sm font-black text-gray-900 dark:text-white">₦{(() => {
                                 if (item.remaining_amount != null) return Number(item.remaining_amount).toLocaleString();
                                 const sellingPrice = item.item?.price_jalingo || item.unit_price;
                                 const effectiveTotal = Number(item.quantity) * sellingPrice;
                                 const alreadyPaidAmt = Number(item.quantity) > 0
                                   ? (Number(item.quantity_paid) / Number(item.quantity)) * effectiveTotal
                                   : 0;
                                 return Math.max(0, effectiveTotal - alreadyPaidAmt).toLocaleString();
                               })()}</p>
                             </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase mb-2">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 font-bold transition-all text-gray-900 dark:text-white outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="pos">POS Terminal</option>
                    <option value="online_transfer">Online Transfer</option>
                  </select>
                </div>

                {paymentForm.paymentMethod !== 'cash' && (
                  <div>
                    <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase mb-2">Reference Number</label>
                    <input
                      type="text"
                      value={paymentForm.referenceNumber}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                      className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all font-mono text-gray-900 dark:text-white outline-none"
                      placeholder="TX-123456789"
                    />
                  </div>
                )}
              </div>

              {paymentForm.paymentMethod !== 'cash' && (
              <div>
                <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase mb-2">Upload Receipt</label>
                <div 
                  onClick={() => receiptInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center cursor-pointer hover:border-pink-500 dark:hover:border-pink-500 hover:bg-pink-50/30 dark:hover:bg-pink-900/10 transition-all group"
                >
                  <Upload className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600 group-hover:text-pink-500 transition-colors" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Drop receipt here or click to upload</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG or PDF up to 5MB</p>
                  {receiptFile && <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> {receiptFile.name}
                  </div>}
                </div>
                <input ref={receiptInputRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])} />
              </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex gap-4">
              <button
                disabled={isProcessingPayment}
                onClick={handleSubmitPayment}
                className="flex-1 bg-pink-600 text-white py-4 rounded-xl font-black hover:bg-pink-700 disabled:opacity-50 shadow-xl shadow-pink-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? <div className="w-5 h-5 border-2 border-white/30 border-b-white rounded-full animate-spin"></div> : 'RECORD PAYMENT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl border dark:border-gray-700">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Cancel Credit?</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                This will cancel the credit sale. Any items with partial payment (75% or less paid) will be returned to the active store (only the unpaid portion). Items with more than 75% payment cannot be returned.
              </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCancelSale}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-black hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                YES, CANCEL CREDIT
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                NO, KEEP IT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-pink-500" />
                Credit Receipt
              </h2>
              <button 
                onClick={() => setShowReceiptModal(false)} 
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-pink-100 dark:border-pink-900/30 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-8 text-center">
                  <h1 className="text-3xl font-black text-white tracking-tighter">ABIFRESH & KIDDIES VENTURES</h1>
                  <p className="text-pink-100 text-sm font-bold uppercase tracking-widest mt-1">Credit Sale Receipt</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-8">
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-3 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <p className="text-gray-400 dark:text-gray-500 font-black uppercase text-[8px] sm:text-[10px] mb-2 sm:mb-3 tracking-widest flex items-center gap-1 sm:gap-2">
                        <Clock className="w-3 h-3" /> Info
                      </p>
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] sm:text-sm">
                          <span className="text-gray-500 dark:text-gray-400 font-bold">No:</span>
                          <span className="text-gray-900 dark:text-white font-black font-mono truncate">{selectedReceipt.receipt_number}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] sm:text-sm">
                          <span className="text-gray-500 dark:text-gray-400 font-bold">Date:</span>
                          <span className="text-gray-900 dark:text-white font-black">{new Date(selectedReceipt.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] sm:text-sm">
                          <span className="text-gray-500 dark:text-gray-400 font-bold">Staff:</span>
                          <span className="text-gray-900 dark:text-white font-black uppercase tracking-tight">{selectedReceipt.staff_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-3 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-right relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-pink-500/5 -mr-6 -mt-6 sm:-mr-8 sm:-mt-8 rounded-full"></div>
                      <p className="text-gray-400 dark:text-gray-500 font-black uppercase text-[8px] sm:text-[10px] mb-2 sm:mb-3 tracking-widest flex items-center justify-end gap-1 sm:gap-2">
                        Creditor <MapPin className="w-3 h-3" />
                      </p>
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-gray-900 dark:text-white font-black text-sm sm:text-xl tracking-tighter truncate">{selectedReceipt.creditor?.name}</p>
                        <p className="text-gray-600 dark:text-gray-300 font-bold text-[10px] sm:text-sm">{selectedReceipt.creditor?.phone}</p>
                        <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-gray-100 dark:border-gray-700">
                           <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${
                             selectedReceipt.receipt_status === 'paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                             selectedReceipt.receipt_status === 'partially_paid' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                             selectedReceipt.receipt_status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                             'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300'
                           }`}>
                             {selectedReceipt.receipt_status === 'cancelled' ? 'CANCELLED' :
                              selectedReceipt.receipt_status === 'paid' ? 'PAID' :
                              selectedReceipt.receipt_status === 'partially_paid' ? 'PARTIALLY PAID' : 'CREDIT'}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-b-2 border-pink-100 dark:border-pink-900/30 mb-8">
                    <div className="bg-pink-50/50 dark:bg-pink-900/20 px-4 py-3 flex justify-between text-[10px] font-black text-pink-700 dark:text-pink-400 uppercase tracking-widest">
                      <span className="flex-1">Description</span>
                      <span className="w-24 text-center">Breakdown</span>
                      <span className="w-16 text-right">Qty</span>
                      <span className="w-24 text-right">Price</span>
                      <span className="w-24 text-right">Total</span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                        selectedReceipt.items.map((item: any, i: number) => (
                          <div key={i} className="px-4 py-4 flex justify-between items-center group hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <div className="flex-1">
                              <p className="text-sm font-black text-gray-900 dark:text-white">{item.name}</p>
                              {(item.status === 'cancelled' || item.paid_quantity > 0) && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {item.paid_percentage >= 100 ? (
                                    <span className="text-[9px] font-black bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                      PAID
                                    </span>
                                  ) : item.paid_quantity > 0 && (
                                    <span className="text-[9px] font-black bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                      {item.paid_percentage}% PAID — PARTIALLY PAID
                                    </span>
                                  )}
                                  {item.status === 'cancelled' && (item.sale_quantity - item.paid_quantity) > 0 && (
                                    <span className="text-[9px] font-black bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                      {formatQty(item.sale_quantity - item.paid_quantity)} Cancelled
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="w-24 text-center">
                              {item.status !== 'cancelled' && item.paid_quantity > 0 && (
                                <span className={`text-[10px] font-bold ${item.paid_percentage >= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {item.paid_percentage >= 100 ? 'PAID' : `${item.paid_percentage}% PAID — PARTIALLY PAID`}
                                </span>
                              )}
                            </div>
                            <span className="w-16 text-right text-sm font-bold text-gray-600 dark:text-gray-400">{formatQty(item.sale_quantity)}</span>
                            <span className="w-24 text-right text-sm font-bold text-gray-600 dark:text-gray-400">₦{Number(item.price).toLocaleString()}</span>
                            <span className="w-24 text-right text-sm font-black text-gray-900 dark:text-white">₦{(item.sale_quantity * item.price).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400 italic text-sm">No items found for this receipt</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-6 border border-pink-100 dark:border-pink-900/30 flex justify-between items-center mb-8">
                    <span className="text-pink-700 dark:text-pink-400 font-black uppercase tracking-widest">Grand Total</span>
                    <span className="text-3xl font-black text-pink-600 dark:text-pink-400">₦{Number(selectedReceipt.total_amount).toLocaleString()}</span>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2 italic">Thank you for your business!</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest border-t border-dashed border-gray-200 dark:border-gray-700 pt-4">System Generated Receipt • {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => printReceipt(selectedReceipt)}
                  className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-4 rounded-xl font-black hover:bg-black dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200 dark:shadow-none"
                >
                  <Printer className="w-5 h-5" /> PRINT RECEIPT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={showPaymentReceiptModal}
        onClose={() => setShowPaymentReceiptModal(false)}
        payment={selectedPaymentReceipt}
        creditorName={creditor.full_name}
        onPreviewImage={(url: string) => setFullscreenImage(url)}
      />

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          {/* Clickable Backdrop */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setFullscreenImage(null)}></div>
          
          <div className="absolute top-6 right-6 flex gap-4 z-[210]">
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 const link = document.createElement('a');
                 link.href = fullscreenImage;
                 link.download = 'receipt-image';
                 link.click();
               }}
               className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
               title="Download Image"
             >
               <Download className="w-6 h-6" />
             </button>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setFullscreenImage(null);
               }}
               className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
               title="Close"
             >
               <X className="w-6 h-6" />
             </button>
          </div>
          
          <div className="max-w-4xl w-full max-h-[80vh] relative z-[205] group">
            <img 
              src={fullscreenImage} 
              alt="Receipt Fullscreen" 
              className="w-full h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <p className="mt-8 text-white/50 font-black tracking-widest text-xs uppercase relative z-[205]">Receipt Preview Mode</p>
        </div>
      )}
    </div>
  );
}

// Payment Receipt Modal Component
const PaymentReceiptModal = ({ isOpen, onClose, payment, creditorName, onPreviewImage }: any) => {
  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-green-50/30 dark:bg-green-900/10">
          <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 text-green-500 text-xl font-black flex items-center justify-center">₦</span>
            Payment Receipt
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
        
        <div className="p-8">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div className="text-left flex-1">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">₦{parseFloat(payment.amount).toLocaleString()}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">Payment Successful</p>
            </div>
            {payment.receipt_url && (
              <div 
                onClick={() => onPreviewImage(payment.receipt_url)}
                className="w-20 h-20 rounded-2xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:border-green-500 transition-all shadow-sm group relative"
              >
                <img src={payment.receipt_url} alt="Receipt Thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Eye className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">Reference</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{payment.reference_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">Method</span>
              <span className="font-bold text-gray-900 dark:text-white">{(payment.payment_method || 'cash').replace('_', ' ').toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">Date</span>
              <span className="font-bold text-gray-900 dark:text-white">{new Date(payment.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">Creditor</span>
              <span className="font-bold text-gray-900 dark:text-white">{creditorName}</span>
            </div>
          </div>

          {payment.notes && (
            <div className="mt-6">
              <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] mb-2 tracking-wider">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700 italic">"{payment.notes}"</p>
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <a 
              href={payment.receipt_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-green-600 text-white py-4 rounded-xl font-black hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
            >
              <Download className="w-5 h-5" /> DOWNLOAD
            </a>
            <button 
              onClick={() => window.print()}
              className="p-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              title="Print Receipt"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
