'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft, CreditCard, CheckCircle, Clock, XCircle, Eye, Download,
  X, FileText, Phone, DollarSign, AlertTriangle, User, Package, Loader2, Printer, Search
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingLogo from '@/components/LoadingLogo';
import { formatQty } from '@/lib/format-quantity';
import { printReceipt, downloadReceiptAsPDF } from '@/lib/receipt-utils';

export default function StaffCreditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staffId as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [selectedRemittance, setSelectedRemittance] = useState<any>(null);
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  // Pagination
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [staffId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/api/credits/payments/admin/staff-detail/${staffId}`);
      setData(res.data);
    } catch (err: any) {
      toast.error('Failed to load staff data');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRemittance) return;
    setActionInProgress(true);
    try {
      await api.patch(`/api/credits/payments/admin/${selectedRemittance.id}/status`, { status: 'approved' });
      toast.success('Remittance approved!');
      setShowApproveConfirm(false);
      setShowRemittanceModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to approve remittance');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRemittance || !rejectionReason.trim()) return;
    setActionInProgress(true);
    try {
      await api.patch(`/api/credits/payments/admin/${selectedRemittance.id}/status`, { 
        status: 'rejected',
        reason: rejectionReason 
      });
      toast.success('Remittance rejected');
      setShowRejectModal(false);
      setShowRemittanceModal(false);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      toast.error('Failed to reject remittance');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleFetchReceipt = async (saleId: string | null, receiptNumber?: string | null) => {
    const trackingId = saleId || receiptNumber || 'unknown';
    setLoadingReceiptId(trackingId);
    
    try {
      let receipt = null;

      // 1. Try fetching directly by ID as a sale
      if (saleId && saleId.length > 20 && saleId.includes('-')) {
        try {
          const res = await api.get(`/api/credits/sales/${saleId}`);
          if (res.data && !res.data.error && res.data.receipt_number) {
            receipt = res.data;
          }
        } catch (e) {
          // It might be a payment ID instead of a sale ID
          console.log("Not a sale ID, checking if it's a payment ID...");
        }
      }

      // 2. If not found, it might be a payment ID (especially in older remittance records)
      // We can try to find a payment with this ID and get its credit_sale_id
      if (!receipt && saleId && saleId.length > 20 && saleId.includes('-')) {
        try {
          // We don't have a direct "get payment by ID" admin endpoint for credits yet,
          // but we can search for it in the sales list or just try to find it via related data
          const res = await api.get('/api/credits/sales');
          const allSales = Array.isArray(res.data) ? res.data : [];
          // Search for a sale that has a payment with this ID
          const saleWithPayment = allSales.find((s: any) => 
            s.payments?.some((p: any) => p.id === saleId)
          );
          if (saleWithPayment) {
            receipt = saleWithPayment;
          }
        } catch (e) {
          console.log("Search by payment ID failed");
        }
      }

      // 3. Fallback to searching by receipt number
      if (!receipt) {
        const targetRef = receiptNumber || (saleId?.startsWith('CR-') ? saleId : null);
        if (targetRef) {
          const res = await api.get('/api/credits/sales');
          const allSales = Array.isArray(res.data) ? res.data : [];
          receipt = allSales.find((s: any) => s.receipt_number === targetRef);
        }
      }

      if (!receipt) {
        toast.error('Could not find the original sale record');
        return;
      }

      // Format for preview modal
      const formattedReceipt = {
        receipt_number: receipt.receipt_number,
        timestamp: receipt.created_at,
        staff_name: receipt.users?.full_name || (Array.isArray(receipt.users) ? receipt.users[0]?.full_name : 'Staff'),
        payment_method: 'Credit',
        items: receipt.credit_sale_items?.map((item: any) => ({
          name: item.item_name,
          sale_quantity: item.quantity,
          price: item.unit_price,
        })) || [],
        total_amount: receipt.total_amount,
        creditor: {
          name: receipt.creditors?.full_name,
          phone: receipt.creditors?.phone_number,
        }
      };
      setSelectedReceiptData(formattedReceipt);
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Receipt fetch error:', error);
      toast.error('Failed to fetch receipt details');
    } finally {
      setLoadingReceiptId(null);
    }
  };

  if (isLoading) return <LoadingLogo text="Loading staff credit data..." />;
  if (!data) return null;

  const { staff, stats, remittances, unremittedItems } = data;

  const paginatedCollections = unremittedItems.slice((collectionsPage - 1) * itemsPerPage, collectionsPage * itemsPerPage);
  const paginatedHistory = remittances.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);

  const totalCollectionsPages = Math.ceil(unremittedItems.length / itemsPerPage);
  const totalHistoryPages = Math.ceil(remittances.length / itemsPerPage);

  return (
    <div className="space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900 -m-4 md:-m-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/credit-payments')}
            className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-all text-gray-500 hover:text-pink-600"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-xl"><User className="w-6 h-6 md:w-8 md:h-8 text-pink-500" /></div>
              {staff.full_name}
            </h1>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg uppercase text-[10px] tracking-widest">{staff.role}</span>
              • {staff.email}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/30 p-3 md:p-4 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-2xl flex-shrink-0">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">Total Collected</p>
              <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white break-words">₦{stats.totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 p-3 md:p-4 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-2xl flex-shrink-0">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-0.5">Pending</p>
              <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white break-words">₦{stats.pendingRemittance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/30 p-3 md:p-4 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-2xl flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-wider mb-0.5">Approved</p>
              <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white break-words">₦{stats.approvedRemittance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/30 p-3 md:p-4 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-2xl flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5">Outstanding</p>
              <p className="text-lg md:text-xl font-black text-red-600 break-words">₦{stats.outstandingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
      {/* Unremitted Credit Collections */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-pink-500" />
              Unremitted Credit Collections
            </h2>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-black rounded-full uppercase tracking-wider">
                {unremittedItems.length} Total
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase tracking-wider text-gray-500 font-black">
                  <th className="py-4 px-4 border-b dark:border-gray-800">Date</th>
                  <th className="py-4 px-4 border-b dark:border-gray-800">Creditor</th>
                  <th className="py-4 px-4 border-b dark:border-gray-800">Receipt</th>
                  <th className="py-4 px-4 text-right border-b dark:border-gray-800">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedCollections.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">{item.creditors?.full_name}</td>
                    <td className="py-4 px-4">
                      <button 
                        onClick={() => handleFetchReceipt(item.credit_sale_id, item.credit_sales?.receipt_number)}
                        className="font-bold text-pink-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                        disabled={!!loadingReceiptId}
                      >
                        {loadingReceiptId === (item.credit_sale_id || item.credit_sales?.receipt_number) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : null}
                        {item.credit_sales?.receipt_number || 'N/A'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right font-black text-red-600">₦{Number(item.amount).toLocaleString()}</td>
                  </tr>
                ))}
                {unremittedItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-gray-500 dark:text-gray-400 italic">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4 opacity-30" />
                      All credit collections have been remitted!
                    </td>
                  </tr>
                )}
              </tbody>
              {unremittedItems.length > 0 && (
                <tfoot>
                  <tr className="bg-red-50/50 dark:bg-red-900/10">
                    <td colSpan={3} className="py-5 px-4 font-black text-red-600 uppercase text-xs tracking-wider">Total Outstanding</td>
                    <td className="py-5 px-4 text-right font-black text-2xl text-red-600">₦{stats.outstandingAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {totalCollectionsPages > 1 && (
            <div className="p-4 border-t dark:border-gray-800 flex justify-center gap-2">
              <button 
                disabled={collectionsPage === 1}
                onClick={() => setCollectionsPage(p => p - 1)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-xs font-black">Page {collectionsPage} of {totalCollectionsPages}</span>
              <button 
                disabled={collectionsPage === totalCollectionsPages}
                onClick={() => setCollectionsPage(p => p + 1)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Remittance History */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-purple-600" />
              Remittance History
            </h2>
            <div className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-black rounded-full uppercase tracking-wider">
              {remittances.length} Total
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase tracking-wider text-gray-500 font-black">
                  <th className="py-4 px-4 border-b dark:border-gray-800">Amount</th>
                  <th className="py-4 px-4 border-b dark:border-gray-800">Status</th>
                  <th className="py-4 px-4 border-b dark:border-gray-800">Date</th>
                  <th className="py-4 px-4 border-b dark:border-gray-800">Method</th>
                  <th className="py-4 px-4 border-b dark:border-gray-800">Reference</th>
                  <th className="py-4 px-4 text-right border-b dark:border-gray-800">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedHistory.map((remittance: any) => (
                  <tr key={remittance.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => { setSelectedRemittance(remittance); setShowRemittanceModal(true); }}>
                    <td className="py-4 px-4 font-black text-gray-900 dark:text-white whitespace-nowrap">₦{Number(remittance.amount).toLocaleString()}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        remittance.status === 'approved' ? 'bg-green-100 text-green-700' :
                        remittance.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {remittance.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{new Date(remittance.created_at).toLocaleString()}</td>
                    <td className="py-4 px-4 font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{remittance.payment_method}</td>
                    <td className="py-4 px-4 font-mono text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{remittance.reference_number || 'N/A'}</td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedRemittance(remittance); setShowRemittanceModal(true); }}
                        className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-pink-100 dark:hover:bg-pink-900/40 text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {remittances.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500 dark:text-gray-400 italic">No remittance history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalHistoryPages > 1 && (
            <div className="p-4 border-t dark:border-gray-800 flex justify-center gap-2">
              <button 
                disabled={historyPage === 1}
                onClick={() => setHistoryPage(p => p - 1)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-xs font-black">Page {historyPage} of {totalHistoryPages}</span>
              <button 
                disabled={historyPage === totalHistoryPages}
                onClick={() => setHistoryPage(p => p + 1)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* REMITTANCE DETAIL MODAL */}
      {showRemittanceModal && selectedRemittance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRemittanceModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-xl"><FileText className="w-6 h-6 text-pink-500" /></div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Remittance Details</h3>
              </div>
              <button onClick={() => setShowRemittanceModal(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-6 bg-pink-50 dark:bg-pink-900/20 p-6 rounded-3xl border border-pink-100 dark:border-pink-900/30">
                <div>
                  <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Amount</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">₦{Number(selectedRemittance.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Status</p>
                  <span className={`inline-block px-4 py-1 rounded-xl text-xs font-black uppercase mt-1 ${
                    selectedRemittance.status === 'approved' ? 'bg-green-100 text-green-700' :
                    selectedRemittance.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedRemittance.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Method</p>
                  <p className="font-bold text-gray-700 dark:text-gray-300 uppercase">{selectedRemittance.payment_method}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Reference</p>
                  <p className="font-bold text-gray-700 dark:text-gray-300">{selectedRemittance.reference_number || 'N/A'}</p>
                </div>
              </div>

              {/* Linked Receipts Section */}
              <div className="space-y-3">
                <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Linked Credit Sales</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(selectedRemittance.items_paid_for || []).map((item: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleFetchReceipt(item.credit_sale_id, item.receipt_number)}
                      className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-pink-300 hover:bg-pink-50/30 transition-all text-left flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Receipt</p>
                        <p className="font-black text-pink-600">{item.receipt || item.receipt_number || 'N/A'}</p>
                      </div>
                      <Eye className="w-5 h-5 text-gray-300 group-hover:text-pink-500 transition-colors" />
                    </button>
                  ))}
                  {(!selectedRemittance.items_paid_for || selectedRemittance.items_paid_for.length === 0) && (
                    <div className="col-span-full py-6 text-center text-gray-400 italic bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                      No linked receipts found for this remittance.
                    </div>
                  )}
                </div>
              </div>

              {selectedRemittance.receipt_url && (
                <div className="pt-4 border-t dark:border-gray-800">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Proof of Transfer</p>
                  <div 
                    className="relative rounded-2xl border-2 border-gray-100 dark:border-gray-700 h-64 overflow-hidden cursor-zoom-in group"
                    onClick={() => setShowReceiptPreview(true)}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
                    {selectedRemittance.receipt_url.endsWith('.pdf') ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 bg-gray-50 dark:bg-gray-900">
                        <FileText className="w-12 h-12 text-pink-500" />
                        <span className="font-bold">View PDF</span>
                      </div>
                    ) : (
                      <img src={selectedRemittance.receipt_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              {selectedRemittance.status === 'pending' ? (
                <>
                  <button onClick={() => setShowRejectModal(true)} className="flex-1 py-4 bg-red-100 text-red-700 font-bold rounded-2xl hover:bg-red-200 transition-colors">Reject Remittance</button>
                  <button onClick={() => setShowApproveConfirm(true)} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl hover:bg-green-600 transition-colors shadow-lg shadow-green-100 dark:shadow-none">Approve Payment</button>
                </>
              ) : (
                <button onClick={() => setShowRemittanceModal(false)} className="w-full py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 font-bold rounded-2xl hover:bg-gray-50 transition-colors">Close Details</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVE/REJECT MODALS */}
      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-black mb-2 text-gray-900 dark:text-white">Accept Remittance?</h4>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Confirm receiving ₦{Number(selectedRemittance?.amount).toLocaleString()}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 py-3 font-bold text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={handleApprove} className="flex-1 py-3 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition-colors">Yes, Accept</button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h4 className="text-xl font-black text-center mb-4 text-gray-900 dark:text-white">Reject Remittance</h4>
            <textarea 
              className="w-full p-4 border dark:border-gray-700 dark:bg-gray-900 rounded-2xl mb-4 font-bold outline-none focus:ring-2 focus:ring-red-500/20" 
              placeholder="Provide a reason for rejection..." 
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-3 font-bold text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={handleReject} className="flex-1 py-3 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition-colors">Reject</button>
            </div>
          </div>
        </div>
      )}

      {showReceiptPreview && selectedRemittance?.receipt_url && (
        <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setShowReceiptPreview(false)}>
          <img src={selectedRemittance.receipt_url} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* INDIVIDUAL RECEIPT MODAL */}
      {showReceiptModal && selectedReceiptData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black flex items-center gap-2 text-gray-900 dark:text-white"><FileText className="w-6 h-6 text-pink-500" /> Sale Receipt</h2>
              <button onClick={() => setShowReceiptModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <div id="receipt-content" className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="bg-pink-600 p-8 text-center text-white">
                <h1 className="text-2xl font-black uppercase tracking-tight">ABIFRESH & KIDDIES VENTURES</h1>
                <p className="font-bold opacity-80 mt-1">Credit Receipt #{selectedReceiptData.receipt_number}</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700">
                  <div><p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-0.5">Date</p><p className="font-black text-gray-900 dark:text-white">{new Date(selectedReceiptData.timestamp).toLocaleString()}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-0.5">Staff</p><p className="font-black text-gray-900 dark:text-white">{selectedReceiptData.staff_name}</p></div>
                  <div className="col-span-2 pt-2 border-t dark:border-gray-700"><p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-0.5">Creditor</p><p className="font-black text-gray-900 dark:text-white">{selectedReceiptData.creditor?.name}</p></div>
                </div>
                <div className="border-y-2 border-pink-100 dark:border-pink-900/30 py-4">
                  {selectedReceiptData.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm py-2 border-b last:border-0 border-gray-100 dark:border-gray-800">
                      <span className="flex-1 font-bold text-gray-900 dark:text-gray-200">{item.name}</span>
                      <span className="w-12 text-center text-gray-500 dark:text-gray-400 font-medium">{formatQty(item.sale_quantity)}</span>
                      <span className="w-24 text-right font-black text-gray-900 dark:text-white">₦{(item.price * item.sale_quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-pink-50 dark:bg-pink-900/20 p-6 rounded-2xl text-right">
                  <p className="text-pink-600 dark:text-pink-400 text-xs font-bold uppercase">Total Credit Amount</p>
                  <p className="text-3xl font-black text-pink-600 dark:text-pink-400">₦{selectedReceiptData.total_amount.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowReceiptModal(false)} className="flex-1 py-4 border-2 border-gray-100 dark:border-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-colors">Close</button>
              <button onClick={() => printReceipt(selectedReceiptData)} className="flex-1 py-4 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-100">Print</button>
              <button onClick={() => downloadReceiptAsPDF(selectedReceiptData)} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl hover:bg-green-600 transition-colors shadow-lg shadow-green-100">Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
