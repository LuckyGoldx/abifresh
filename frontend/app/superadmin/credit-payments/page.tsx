'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { CreditCard, CheckCircle, Clock, XCircle, Eye, X, FileText, Download, AlertTriangle } from 'lucide-react';
import { CreditTabs } from '@/components/credits';

export default function SuperAdminCreditPaymentsPage() {
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

  useEffect(() => {
    fetchPayments();
  }, []);

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

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading superadmin oversight...</div>;
  }

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

      <div className="card border-l-4 border-l-pink-500 bg-pink-50 dark:bg-pink-900 cursor-pointer hover:shadow-lg hover:scale-105 transition-all">
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
              Global sum of all creditor payments not yet submitted
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-green-500">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Approved</p>
          <p className="text-2xl font-black text-green-600">₦{stats.approvedAmount.toLocaleString()}</p>
        </div>
        <div className="card border-l-4 border-l-yellow-500">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Pending Approvals</p>
          <p className="text-2xl font-black text-yellow-600">₦{stats.pendingAmount.toLocaleString()}</p>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Rejected Remittances</p>
          <p className="text-2xl font-black text-red-600">₦{stats.rejectedAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by staff or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border-2 border-gray-100 rounded-xl focus:border-pink-500 focus:ring-0"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
              {filteredPayments.map((payment) => (
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
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 overflow-hidden">
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
    </div>
  );
}
