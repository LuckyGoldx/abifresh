'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CreditCard, CheckCircle, Clock, XCircle, Eye, X, FileText, Download, AlertTriangle, Loader2, Users } from 'lucide-react';
import { CreditTabs } from '@/components/credits';
import { AbifreshLoading } from '@/components/AbifreshLoading';

export default function SuperAdminCreditPaymentsPage() {
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
  const [actionInProgress, setActionInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'remittances' | 'auto-remitted' | 'breakdown'>('remittances');
  const [autoRemitted, setAutoRemitted] = useState<any[]>([]);
  const [autoRemittedStats, setAutoRemittedStats] = useState({ total: 0, count: 0 });
  const [autoRemittedLoading, setAutoRemittedLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [autoRemPage, setAutoRemPage] = useState(1);
  const perPage = 15;
  const [staffSummary, setStaffSummary] = useState<any[]>([]);
  const [staffSummaryLoading, setStaffSummaryLoading] = useState(false);

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
      console.error('Failed to fetch payments:', error);
    } finally {
      setIsLoading(false);
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

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this credit remittance?')) return;
    setActionInProgress(true);
    try {
      await api.patch(`/api/credits/payments/admin/${id}/status`, { status: 'approved' });
      alert('✅ Remittance approved successfully!');
      setShowDetailsModal(false);
      fetchPayments();
    } catch (error: any) {
      alert('❌ Failed to approve remittance');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to REJECT this credit remittance?')) return;
    setActionInProgress(true);
    try {
      await api.patch(`/api/credits/payments/admin/${id}/status`, { status: 'rejected' });
      alert('✅ Remittance rejected successfully!');
      setShowDetailsModal(false);
      fetchPayments();
    } catch (error: any) {
      alert('❌ Failed to reject remittance');
    } finally {
      setActionInProgress(false);
    }
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="space-y-6">
      <CreditTabs />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-pink-500" />
          Credit Remittance Oversight
        </h1>
        <button onClick={fetchPayments} className="px-4 py-2 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 transition">
          Refresh Data
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('remittances')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'remittances'
              ? 'border-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          All Remittances
        </button>
        <button
          onClick={() => setActiveTab('auto-remitted')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'auto-remitted'
              ? 'border-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          My Remitted
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'breakdown'
              ? 'border-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Staff Breakdown
        </button>
      </div>

      {activeTab === 'remittances' && (
      <>

      <div 
        onClick={() => {
          setActiveTab('breakdown');
          setTimeout(() => {
            document.getElementById('credit-tabs-nav')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        className="card border-l-4 border-l-pink-500 bg-pink-50 dark:bg-pink-900 cursor-pointer hover:shadow-lg hover:scale-105 transition-all overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-pink-100 dark:bg-pink-800 rounded-full flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-pink-600 dark:text-pink-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-pink-700 dark:text-pink-300">Total Unremitted (Sitting with Staff)</p>
            <p className="text-3xl font-black text-pink-600 dark:text-pink-400 break-words">
              ₦{stats.outstandingAmount.toLocaleString()}
            </p>
            <p className="text-xs font-medium text-pink-600 dark:text-pink-300 mt-1">
              Global sum of all creditor payments not yet submitted
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-green-500 overflow-hidden">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Approved</p>
          <p className="text-2xl font-black text-green-600 break-words">₦{stats.approvedAmount.toLocaleString()}</p>
        </div>
        <div className="card border-l-4 border-l-yellow-500 overflow-hidden">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Pending Approvals</p>
          <p className="text-2xl font-black text-yellow-600 break-words">₦{stats.pendingAmount.toLocaleString()}</p>
        </div>
        <div className="card border-l-4 border-l-red-500 overflow-hidden">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Rejected Remittances</p>
          <p className="text-2xl font-black text-red-600 break-words">₦{stats.rejectedAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by staff or reference..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPaymentsPage(1); }}
            className="flex-1 px-4 py-2 border-2 border-gray-100 rounded-xl focus:border-pink-500 focus:ring-0"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPaymentsPage(1); }}
            className="px-4 py-2 border-2 border-gray-100 rounded-xl focus:border-pink-500 focus:ring-0 font-bold text-gray-700"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left py-4 px-4 font-bold text-gray-600">Staff Name</th>
                <th className="text-left py-4 px-4 font-bold text-gray-600">Amount</th>
                <th className="text-left py-4 px-4 font-bold text-gray-600">Method</th>
                <th className="text-left py-4 px-4 font-bold text-gray-600">Status</th>
                <th className="text-left py-4 px-4 font-bold text-gray-600">Date</th>
                <th className="text-right py-4 px-4 font-bold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-900">
              {filteredPayments.slice((paymentsPage - 1) * perPage, paymentsPage * perPage).map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">{payment.staff_name}</td>
                  <td className="py-4 px-4 font-black text-pink-600">₦{Number(payment.amount).toLocaleString()}</td>
                  <td className="py-4 px-4 font-bold text-gray-600 uppercase">{payment.payment_method}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                      payment.status === 'approved' ? 'bg-green-100 text-green-700' :
                      payment.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => { setSelectedPayment(payment); setShowDetailsModal(true); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" /> Review
                    </button>
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

      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <FileText className="w-6 h-6 text-pink-500" /> Remittance Review
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-pink-50 dark:bg-pink-900/30 p-4 rounded-2xl border border-pink-100">
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Staff Member</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{selectedPayment.staff_name}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Remittance Amount</p>
                  <p className="text-xl font-black text-pink-600">₦{Number(selectedPayment.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Payment Method</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white uppercase">{selectedPayment.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Reference</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedPayment.reference_number || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Collected Items Covered</h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="text-left py-3 px-4 font-bold text-gray-600">Creditor</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-600">Receipt</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-600">Collected Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(selectedPayment.items_paid_for || []).map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-3 px-4 font-bold">{item.creditor_name}</td>
                          <td className="py-3 px-4 font-medium text-gray-500">{item.receipt}</td>
                          <td className="py-3 px-4 font-black text-right">₦{Number(item.amount).toLocaleString()}</td>
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
                    className="relative rounded-2xl overflow-hidden border-2 border-gray-100 cursor-zoom-in bg-gray-50 flex items-center justify-center h-48"
                    onClick={() => setShowReceiptPreview(true)}
                  >
                    {selectedPayment.receipt_url.endsWith('.pdf') ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-12 h-12 text-pink-500" />
                        <span className="font-bold text-gray-600">View PDF Receipt</span>
                      </div>
                    ) : (
                      <img src={selectedPayment.receipt_url} alt="Receipt" className="object-cover h-full w-full hover:scale-105 transition-transform duration-500" />
                    )}
        </div>
      </div>
      )}
            </div>

            {selectedPayment.status === 'pending' && (
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 flex justify-end gap-3">
                <button
                  disabled={actionInProgress}
                  onClick={() => handleReject(selectedPayment.id)}
                  className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" /> Reject
                </button>
                <button
                  disabled={actionInProgress}
                  onClick={() => handleApprove(selectedPayment.id)}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl shadow-lg shadow-green-100 transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Accept Remittance
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showReceiptPreview && selectedPayment?.receipt_url && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setShowReceiptPreview(false)}>
          {selectedPayment.receipt_url.endsWith('.pdf') ? (
            <iframe src={selectedPayment.receipt_url} className="w-full h-full rounded-xl bg-white" />
          ) : (
            <img src={selectedPayment.receipt_url} alt="Receipt Full" className="max-w-full max-h-[95vh] object-contain rounded-xl shadow-2xl" />
          )}
        </div>
      )}
      </>
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
              <p className="text-[10px] font-bold text-gray-500 uppercase">Total</p>
              <p className="text-2xl font-black text-green-600">₦{autoRemittedStats.total.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Count</p>
              <p className="text-2xl font-black text-gray-900">{autoRemittedStats.count}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Payments you recorded directly that were automatically confirmed.
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          {autoRemittedLoading ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <span className="font-bold">Loading...</span>
            </div>
          ) : autoRemitted.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-300" />
              <p className="font-bold">No auto remitted payments yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left py-4 px-4 font-bold text-gray-600">Creditor</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-600">Receipt</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-600">Amount</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-600">Method</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-600">Date</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-600">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-900">
                {autoRemitted.slice((autoRemPage - 1) * perPage, autoRemPage * perPage).map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-900">{payment.creditors?.full_name || 'Unknown'}</td>
                    <td className="py-4 px-4 font-mono text-sm text-pink-600 font-bold">
                      {(Array.isArray(payment.credit_sales) ? payment.credit_sales[0]?.receipt_number : payment.credit_sales?.receipt_number) || 'N/A'}
                    </td>
                    <td className="py-4 px-4 font-black text-green-600 text-right">₦{Number(payment.amount).toLocaleString()}</td>
                    <td className="py-4 px-4 font-bold text-gray-600 uppercase">{payment.payment_method}</td>
                    <td className="py-4 px-4 font-medium text-gray-500">{new Date(payment.remittance_confirmed_at || payment.created_at).toLocaleString()}</td>
                    <td className="py-4 px-4 font-mono text-sm text-gray-500">{payment.reference_number || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      {autoRemitted.length > 0 && Math.ceil(autoRemitted.length / perPage) > 1 && (
        <div className="flex justify-center gap-2 px-6 pb-4">
          <button disabled={autoRemPage === 1} onClick={() => setAutoRemPage(p => p - 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Previous</button>
          <span className="px-4 py-2 text-xs font-black">Page {autoRemPage} of {Math.ceil(autoRemitted.length / perPage)}</span>
          <button disabled={autoRemPage >= Math.ceil(autoRemitted.length / perPage)} onClick={() => setAutoRemPage(p => p + 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Next</button>
        </div>
      )}
      </div>
      )}

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
    </div>
  );
}
