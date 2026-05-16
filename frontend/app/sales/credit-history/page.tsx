'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Search, X, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { Toast, CreditTabs } from '@/components/credits';

export default function RemitCreditPage() {
  const user = useAuthStore((state) => state.user);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async (retryCount = 0) => {
    try {
      const res = await api.get('/api/credits/payments/pending');
      setPayments(res.data || []);
      setToast(null);
      setIsLoading(false);
    } catch (error: any) {
      if (retryCount < 2) {
        // Silent retry after 1.5s
        setTimeout(() => fetchPayments(retryCount + 1), 1500);
      } else {
        setToast({ message: 'Connection interrupted. Retrying...', type: 'error' });
        setIsLoading(false);
      }
    }
  };

  const filteredPayments = payments.filter(p =>
    p.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.creditors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = async (paymentId: string) => {
    try {
      await api.post(`/api/credits/payments/${paymentId}/approve`);
      setToast({ message: 'Payment approved and remitted', type: 'success' });
      fetchPayments();
    } catch (error: any) {
      setToast({ message: 'Failed to approve payment', type: 'error' });
    }
  };

  const handleReject = async (paymentId: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.post(`/api/credits/payments/${paymentId}/reject`, { reason });
      setToast({ message: 'Payment rejected', type: 'success' });
      fetchPayments();
    } catch (error: any) {
      setToast({ message: 'Failed to reject payment', type: 'error' });
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto text-center py-8 dark:text-gray-400">Loading remittances...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto"><CreditTabs />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View all credit payments</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by receipt or creditor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Receipt</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Creditor</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{payment.receipt_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{payment.creditors?.full_name}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">₦{Number(payment.amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{new Date(payment.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                        payment.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                        payment.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                        'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {payment.status === 'approved' ? <CheckCircle size={12} /> :
                         payment.status === 'rejected' ? <XCircle size={12} /> :
                         <Clock size={12} />}
                        {payment.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {payment.status === 'pending' && (user?.role === 'admin' || user?.role === 'superadmin') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(payment.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs font-semibold"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(payment.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-semibold"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                      {payment.status === 'pending' && user?.role !== 'admin' && user?.role !== 'superadmin' && (
                        <span className="text-yellow-600 text-xs font-semibold flex items-center gap-1">
                          <Clock size={14} /> Awaiting Admin Approval
                        </span>
                      )}
                      {payment.status === 'approved' && (
                        <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle size={14} /> Approved
                        </span>
                      )}
                      {payment.status === 'rejected' && (
                        <span className="text-red-600 text-xs font-semibold flex items-center gap-1" title={payment.rejection_reason}>
                          <XCircle size={14} /> Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">No remittances found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
