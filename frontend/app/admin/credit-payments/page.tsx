'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CreditCard, CheckCircle, Clock, XCircle, Eye, X, FileText, Download, AlertTriangle, Printer, Loader2, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { CreditTabs } from '@/components/credits';
import { formatQty } from '@/lib/format-quantity';
import { printReceipt, downloadReceiptAsPDF } from '@/lib/receipt-utils';

export default function AdminCreditPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    approvedAmount: 0,
    pendingAmount: 0,
    rejectedAmount: 0,
    outstandingAmount: 0,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'payments' | 'breakdown' | 'auto-remitted'>('payments');
  const [staffSummary, setStaffSummary] = useState<any[]>([]);
  const [staffSummaryLoading, setStaffSummaryLoading] = useState(false);
  const [autoRemitted, setAutoRemitted] = useState<any[]>([]);
  const [autoRemittedStats, setAutoRemittedStats] = useState({ total: 0, count: 0 });
  const [autoRemittedLoading, setAutoRemittedLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [autoRemPage, setAutoRemPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    fetchPayments();
    fetchStaffSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'auto-remitted') {
      fetchAutoRemitted();
    }
  }, [activeTab]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/credits/payments/admin');
      setPayments(response.data.payments || []);
      setStats(response.data.stats || {});
    } catch (error: any) {
      toast.error('Failed to fetch remittance data');
      console.error('Failed to fetch payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffSummary = async () => {
    try {
      setStaffSummaryLoading(true);
      const res = await api.get('/api/credits/payments/admin/staff-summary');
      setStaffSummary((res.data || []).filter((s: any) => s.total_collected > 0));
    } catch (err) {
      console.error('Failed to fetch staff summary:', err);
    } finally {
      setStaffSummaryLoading(false);
    }
  };

  const fetchAutoRemitted = async () => {
    try {
      setAutoRemittedLoading(true);
      const res = await api.get('/api/credits/payments/admin/auto-remitted');
      setAutoRemitted(res.data.payments || []);
      setAutoRemittedStats(res.data.stats || { total: 0, count: 0 });
      setAutoRemPage(1);
    } catch (err) {
      console.error('Failed to fetch auto-remitted payments:', err);
    } finally {
      setAutoRemittedLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.staff_name?.toLowerCase().includes(term) || p.reference_number?.toLowerCase().includes(term));
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;
    setActionInProgress(true);
    try {
      await api.patch(`/api/credits/payments/admin/${selectedPayment.id}/status`, { status: 'approved' });
      toast.success('Remittance approved successfully!');
      setShowApproveConfirm(false);
      setShowDetailsModal(false);
      fetchPayments();
    } catch (error: any) {
      toast.error('Failed to approve remittance');
      console.error('Failed to approve:', error);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !rejectionReason.trim()) return;
    setActionInProgress(true);
    try {
      await api.patch(`/api/credits/payments/admin/${selectedPayment.id}/status`, { 
        status: 'rejected',
        reason: rejectionReason 
      });
      toast.success('Remittance rejected successfully');
      setShowRejectModal(false);
      setShowDetailsModal(false);
      setRejectionReason('');
      fetchPayments();
    } catch (error: any) {
      toast.error('Failed to reject remittance');
      console.error('Failed to reject:', error);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleFetchReceipt = async (saleId: string, receiptNumber?: string) => {
    if (!saleId && !receiptNumber) {
      toast.error('Sale reference missing for this item');
      return;
    }
    const trackingId = saleId || receiptNumber || 'unknown';
    setLoadingReceiptId(trackingId);
    try {
      let receipt;
      
      if (saleId) {
        const res = await api.get(`/api/credits/sales/${saleId}`);
        receipt = res.data;
      } else {
        const res = await api.get('/api/credits/sales');
        receipt = res.data.find((s: any) => s.receipt_number === receiptNumber);
      }

      if (!receipt) {
        toast.error('Could not find the original sale record');
        return;
      }

      const formattedReceipt = {
        receipt_number: receipt.receipt_number,
        timestamp: receipt.created_at,
        staff_name: receipt.users?.full_name || (Array.isArray(receipt.users) ? receipt.users[0]?.full_name : null) || 'Staff',
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
      toast.error('Failed to fetch receipt details');
    } finally {
      setLoadingReceiptId(null);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <CreditTabs />
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-pink-500" />
          Credit Remittance Oversight
        </h1>
        <button onClick={fetchPayments} className="px-4 py-2 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 transition">
          Refresh Data
        </button>
      </div>

      <div 
        onClick={() => {
          setActiveTab('breakdown');
          setTimeout(() => {
            document.getElementById('credit-tabs-nav')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        className="card border-l-4 border-l-pink-500 bg-pink-50 dark:bg-pink-900 cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="p-3 bg-pink-100 dark:bg-pink-800 rounded-full">
            <AlertTriangle className="w-6 h-6 text-pink-600 dark:text-pink-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-pink-700 dark:text-pink-300">Total Unremitted (Sitting with Staff)</p>
            <p className="text-3xl font-black text-pink-600 dark:text-pink-400">
              ₦{stats.outstandingAmount.toLocaleString()}
            </p>
            <p className="text-xs font-medium text-pink-600 dark:text-pink-300 mt-1">
              Global sum of all creditor payments not yet submitted. Click to see breakdown.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card border-l-4 border-l-green-500 p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-xl flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-0.5">Total Approved</p>
              <p className="text-xl font-black text-green-600 whitespace-nowrap">₦{stats.approvedAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-yellow-500 p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl flex-shrink-0">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-0.5">Pending</p>
              <p className="text-xl font-black text-yellow-600 whitespace-nowrap">₦{stats.pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-red-500 p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-xl flex-shrink-0">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-0.5">Rejected</p>
              <p className="text-xl font-black text-red-600 whitespace-nowrap">₦{stats.rejectedAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-pink-500 p-3 md:p-4 bg-white dark:bg-gray-800 bg-pink-50/10 cursor-pointer hover:bg-pink-50/30 transition-all" onClick={() => { setActiveTab('breakdown'); setTimeout(() => document.getElementById('staff-breakdown-table')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-0.5">Unremitted</p>
              <p className="text-xl font-black text-pink-600 dark:text-pink-400 whitespace-nowrap">₦{stats.outstandingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div id="credit-tabs-nav" className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'payments'
              ? 'border-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          All Remittances
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'breakdown'
              ? 'border-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          Staff Breakdown
        </button>
        <button
          onClick={() => setActiveTab('auto-remitted')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'auto-remitted'
              ? 'border-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          My Remitted
        </button>
      </div>

      {activeTab === 'breakdown' && (
        <div className="card bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
            <Users className="w-6 h-6 text-pink-500" />
            Credit Payment Breakdown
          </h2>
          
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Staff Member</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Total Collected</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Pending</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Approved</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Outstanding</th>
                  <th className="text-center py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-900">
                {staffSummaryLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                        <span className="font-bold">Loading staff summary...</span>
                      </div>
                    </td>
                  </tr>
                ) : staffSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-gray-500">No staff data available.</td>
                  </tr>
                ) : (
                  [...staffSummary].sort((a, b) => {
                    if (a.outstanding_amount !== b.outstanding_amount) return b.outstanding_amount - a.outstanding_amount;
                    if (a.pending_remittance !== b.pending_remittance) return b.pending_remittance - a.pending_remittance;
                    return b.total_collected - a.total_collected;
                  }).map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900 dark:text-white">{s.full_name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{s.email}</p>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-blue-600 dark:text-blue-400">₦{s.total_collected.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-bold text-yellow-600 dark:text-yellow-400">₦{s.pending_remittance.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-bold text-green-600 dark:text-green-400">₦{s.approved_remittance.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-black text-red-600 dark:text-red-400">₦{s.outstanding_amount.toLocaleString()}</td>
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => router.push(`/admin/credit-payments/staff/${s.id}`)}
                          className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-pink-100 dark:hover:bg-pink-900/40 text-gray-600 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-900/80 font-black border-t dark:border-gray-700 text-gray-900 dark:text-white">
                <tr>
                  <td className="py-4 px-4">TOTALS</td>
                  <td className="py-4 px-4 text-right">₦{staffSummary.reduce((sum, s) => sum + s.total_collected, 0).toLocaleString()}</td>
                  <td className="py-4 px-4 text-right text-yellow-600 dark:text-yellow-400">₦{staffSummary.reduce((sum, s) => sum + s.pending_remittance, 0).toLocaleString()}</td>
                  <td className="py-4 px-4 text-right text-green-600 dark:text-green-400">₦{staffSummary.reduce((sum, s) => sum + s.approved_remittance, 0).toLocaleString()}</td>
                  <td className="py-4 px-4 text-right text-red-600 dark:text-red-400">₦{staffSummary.reduce((sum, s) => sum + s.outstanding_amount, 0).toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'payments' && (
      <div className="card bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by staff or reference..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPaymentsPage(1); }}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-pink-500 focus:ring-0 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPaymentsPage(1); }}
            className="px-4 py-2 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-pink-500 focus:ring-0 font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
              <tr>
                <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Staff Name</th>
                <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Amount</th>
                <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Method</th>
                <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Date</th>
                <th className="text-right py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-900">
              {filteredPayments.slice((paymentsPage - 1) * perPage, paymentsPage * perPage).map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b dark:border-gray-700 last:border-0 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">{payment.staff_name}</td>
                  <td className="py-4 px-4 font-black text-pink-600 dark:text-pink-400">₦{Number(payment.amount).toLocaleString()}</td>
                  <td className="py-4 px-4 font-bold text-gray-600 dark:text-gray-400 uppercase">{payment.payment_method}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                      payment.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                      payment.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                      'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">{new Date(payment.created_at).toLocaleDateString()}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      {payment.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => { setSelectedPayment(payment); setShowDetailsModal(true); }}
                            className="p-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 rounded-lg transition-colors"
                            title="Accept"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => { setSelectedPayment(payment); setShowDetailsModal(true); }}
                            className="p-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      ) : null}
                      <button
                        onClick={() => { setSelectedPayment(payment); setShowDetailsModal(true); }}
                        className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      {Math.ceil(filteredPayments.length / perPage) > 1 && (
        <div className="flex justify-center gap-2 px-6 pb-4">
          <button disabled={paymentsPage === 1} onClick={() => setPaymentsPage(p => p - 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Previous</button>
          <span className="px-4 py-2 text-xs font-black">Page {paymentsPage} of {Math.ceil(filteredPayments.length / perPage)}</span>
          <button disabled={paymentsPage >= Math.ceil(filteredPayments.length / perPage)} onClick={() => setPaymentsPage(p => p + 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Next</button>
        </div>
      )}
      </div>
      )}
      {activeTab === 'auto-remitted' && (
      <div className="card bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2 text-gray-900 dark:text-white">
            <CheckCircle className="w-6 h-6 text-green-500" />
            My Remitted Payments
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Auto Remitted</p>
              <p className="text-2xl font-black text-green-600 dark:text-green-400">₦{autoRemittedStats.total.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Count</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{autoRemittedStats.count}</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Payments you recorded directly that were automatically confirmed (no remittance submission needed).
        </p>

        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          {autoRemittedLoading ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <span className="font-bold">Loading auto remitted payments...</span>
            </div>
          ) : autoRemitted.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-300 dark:text-green-700" />
              <p className="font-bold">No auto remitted payments yet</p>
              <p className="text-xs mt-1">Payments you record directly will appear here automatically.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Creditor</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Receipt</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Amount</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Method</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Date</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-600 dark:text-gray-400">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-900">
                {autoRemitted.slice((autoRemPage - 1) * perPage, autoRemPage * perPage).map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">{payment.creditors?.full_name || 'Unknown'}</td>
                    <td className="py-4 px-4 font-mono text-sm text-pink-600 dark:text-pink-400 font-bold">
                      {(Array.isArray(payment.credit_sales) ? payment.credit_sales[0]?.receipt_number : payment.credit_sales?.receipt_number) || 'N/A'}
                    </td>
                    <td className="py-4 px-4 font-black text-green-600 dark:text-green-400 text-right">₦{Number(payment.amount).toLocaleString()}</td>
                    <td className="py-4 px-4 font-bold text-gray-600 dark:text-gray-400 uppercase">{payment.payment_method}</td>
                    <td className="py-4 px-4 font-medium text-gray-500 dark:text-gray-400">{new Date(payment.remittance_confirmed_at || payment.created_at).toLocaleString()}</td>
                    <td className="py-4 px-4 font-mono text-sm text-gray-500 dark:text-gray-400">{payment.reference_number || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-900/80 font-black border-t dark:border-gray-700 text-gray-900 dark:text-white">
                <tr>
                  <td className="py-4 px-4">TOTALS</td>
                  <td className="py-4 px-4"></td>
                  <td className="py-4 px-4 text-right text-green-600 dark:text-green-400">₦{autoRemitted.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}</td>
                  <td className="py-4 px-4"></td>
                  <td className="py-4 px-4"></td>
                  <td className="py-4 px-4"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      {Math.ceil(autoRemitted.length / perPage) > 1 && (
        <div className="flex justify-center gap-2 px-6 pb-4">
          <button disabled={autoRemPage === 1} onClick={() => setAutoRemPage(p => p - 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Previous</button>
          <span className="px-4 py-2 text-xs font-black">Page {autoRemPage} of {Math.ceil(autoRemitted.length / perPage)}</span>
          <button disabled={autoRemPage >= Math.ceil(autoRemitted.length / perPage)} onClick={() => setAutoRemPage(p => p + 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Next</button>
        </div>
      )}
      </div>
      )}

      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="text-2xl font-black flex items-center gap-3 text-gray-900 dark:text-white">
                <FileText className="w-6 h-6 text-pink-500" /> Remittance Review
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-pink-50 dark:bg-pink-900/30 p-4 rounded-2xl border border-pink-100 dark:border-pink-900/50">
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Staff Member</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{selectedPayment.staff_name}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Remittance Amount</p>
                  <p className="text-xl font-black text-pink-600 dark:text-pink-400">₦{Number(selectedPayment.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase mt-1 ${
                    selectedPayment.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                    selectedPayment.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {selectedPayment.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Reference</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedPayment.reference_number || 'N/A'}</p>
                </div>
                {selectedPayment.status === 'rejected' && selectedPayment.rejection_reason && (
                  <div className="col-span-2 mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-xl">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">Rejection Reason</p>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{selectedPayment.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Collected Items Covered</h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Creditor</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Receipt</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Collected Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(selectedPayment.items_paid_for || []).map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{item.creditor_name}</td>
                          <td className="py-3 px-4">
                            <button 
                              onClick={() => handleFetchReceipt(item.credit_sale_id, item.receipt)}
                              className="font-bold text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:underline transition-all disabled:opacity-50 flex items-center gap-1"
                              disabled={!!loadingReceiptId}
                            >
                              {loadingReceiptId === (item.credit_sale_id || item.receipt) ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span className="text-[10px]">Loading...</span>
                                </>
                              ) : item.receipt}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-black text-right text-gray-900 dark:text-white">₦{Number(item.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedPayment.receipt_url && (
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                    Proof of Transfer
                    <button onClick={() => window.open(selectedPayment.receipt_url, '_blank')} className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1">
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </h4>
                  <div 
                    className="relative rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-gray-700 cursor-zoom-in bg-gray-50 dark:bg-gray-900 flex items-center justify-center h-48"
                    onClick={() => setShowReceiptPreview(true)}
                  >
                    {selectedPayment.receipt_url.endsWith('.pdf') ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-12 h-12 text-pink-500" />
                        <span className="font-bold text-gray-600 dark:text-gray-400">View PDF Receipt</span>
                      </div>
                    ) : (
                      <img src={selectedPayment.receipt_url} alt="Receipt" className="object-cover h-full w-full hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedPayment.status === 'pending' && (
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                <button
                  disabled={actionInProgress}
                  onClick={() => setShowRejectModal(true)}
                  className="px-6 py-3 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" /> Reject
                </button>
                <button
                  disabled={actionInProgress}
                  onClick={() => setShowApproveConfirm(true)}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl shadow-lg shadow-green-100 dark:shadow-none transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Accept Remittance
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* APPROVE CONFIRMATION MODAL */}
      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-6 mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2 text-gray-900 dark:text-white">Accept Remittance?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-8 font-medium">
              You are about to confirm that ₦{Number(selectedPayment?.amount).toLocaleString()} has been received from {selectedPayment?.staff_name}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                disabled={actionInProgress}
                onClick={handleApprove}
                className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 dark:shadow-none transition-all disabled:opacity-50"
              >
                {actionInProgress ? 'Confirming...' : 'Yes, Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-6 mx-auto">
              <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2 text-gray-900 dark:text-white">Reject Remittance</h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6 font-medium">
              Please provide a reason for rejecting this remittance from {selectedPayment?.staff_name}.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Receipt is unclear, Amount mismatch..."
              className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:border-red-500 focus:ring-0 mb-6 min-h-[100px] font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                disabled={actionInProgress || !rejectionReason.trim()}
                onClick={handleReject}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-100 dark:shadow-none transition-all disabled:opacity-50"
              >
                {actionInProgress ? 'Rejecting...' : 'Reject Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptPreview && selectedPayment?.receipt_url && (
        <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setShowReceiptPreview(false)}>
          {selectedPayment.receipt_url.endsWith('.pdf') ? (
            <iframe src={selectedPayment.receipt_url} className="w-full h-full rounded-xl bg-white" />
          ) : (
            <img src={selectedPayment.receipt_url} alt="Receipt Full" className="max-w-full max-h-[95vh] object-contain rounded-xl shadow-2xl" />
          )}
        </div>
      )}

      {/* INDIVIDUAL RECEIPT MODAL */}
      {showReceiptModal && selectedReceiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-pink-500" /> Sale Receipt
              </h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div id="receipt-content" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="bg-pink-600 p-8 text-center">
                <h1 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">ABIFRESH & KIDDIES VENTURES</h1>
                <p className="text-pink-100 text-sm font-bold">Credit Receipt #{selectedReceiptData.receipt_number}</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Date/Time</p>
                    <p className="font-black text-gray-900 dark:text-white">{new Date(selectedReceiptData.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Staff</p>
                    <p className="font-black text-gray-900 dark:text-white">{selectedReceiptData.staff_name}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Creditor</p>
                    <p className="font-black text-gray-900 dark:text-white">{selectedReceiptData.creditor?.name || 'N/A'}</p>
                  </div>
                </div>

                <div className="border-y-2 border-pink-100 dark:border-pink-900/50">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex justify-between text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider">
                    <span className="flex-1">Item</span>
                    <span className="w-12 text-center">Qty</span>
                    <span className="w-20 text-right">Price</span>
                    <span className="w-20 text-right">Total</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedReceiptData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                        <span className="flex-1 font-bold">{item.name}</span>
                        <span className="w-12 text-center">{formatQty(item.sale_quantity)}</span>
                        <span className="w-20 text-right font-medium text-gray-500 dark:text-gray-400">₦{item.price.toLocaleString()}</span>
                        <span className="w-20 text-right font-black text-gray-900 dark:text-white">₦{(item.price * item.sale_quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-pink-50 dark:bg-pink-900/30 rounded-2xl p-6 border border-pink-100 dark:border-pink-900/50 flex justify-end">
                  <div className="text-right">
                    <p className="text-pink-600 dark:text-pink-400 text-xs font-bold uppercase mb-1">Total Credit Amount</p>
                    <div className="text-3xl font-black text-pink-600 dark:text-pink-400">
                      ₦{selectedReceiptData.total_amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => printReceipt(selectedReceiptData)}
                className="flex-1 py-4 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Print
              </button>
              <button
                onClick={() => downloadReceiptAsPDF(selectedReceiptData)}
                className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl hover:bg-green-600 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} /> Download
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
